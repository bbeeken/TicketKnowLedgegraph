-- 26_semantic_search_embeddings.sql
-- Semantic Search with Embeddings for Knowledge Graph
USE [OpsGraph];

-- Create semantic search tables
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'semantic')
    EXEC('CREATE SCHEMA semantic');

-- Create embeddings table for storing vector representations
CREATE TABLE semantic.AssetEmbeddings (
    embedding_id INT IDENTITY(1,1) PRIMARY KEY,
    asset_id INT NOT NULL,
    embedding_type NVARCHAR(50) NOT NULL, -- 'description', 'type', 'context'
    embedding_vector NVARCHAR(MAX) NOT NULL, -- JSON array of float values
    text_content NVARCHAR(MAX) NOT NULL,
    created_at DATETIME2 DEFAULT GETUTCDATE(),
    updated_at DATETIME2 DEFAULT GETUTCDATE(),
    FOREIGN KEY (asset_id) REFERENCES app.Assets(asset_id),
    INDEX IX_AssetEmbeddings_AssetId (asset_id),
    INDEX IX_AssetEmbeddings_Type (embedding_type)
);

-- Create search index table for faster text search
CREATE TABLE semantic.SearchIndex (
    search_id INT IDENTITY(1,1) PRIMARY KEY,
    entity_type NVARCHAR(50) NOT NULL, -- 'asset', 'event', 'ticket'
    entity_id INT NOT NULL,
    searchable_text NVARCHAR(MAX) NOT NULL,
    keywords NVARCHAR(500),
    tags NVARCHAR(200),
    created_at DATETIME2 DEFAULT GETUTCDATE(),
    updated_at DATETIME2 DEFAULT GETUTCDATE(),
    INDEX IX_SearchIndex_EntityType (entity_type),
    INDEX IX_SearchIndex_EntityId (entity_id)
);

-- Create similarity cache table
CREATE TABLE semantic.SimilarityCache (
    cache_id INT IDENTITY(1,1) PRIMARY KEY,
    source_asset_id INT NOT NULL,
    target_asset_id INT NOT NULL,
    similarity_score DECIMAL(5,4) NOT NULL,
    similarity_type NVARCHAR(50) NOT NULL, -- 'semantic', 'behavioral', 'structural'
    calculated_at DATETIME2 DEFAULT GETUTCDATE(),
    FOREIGN KEY (source_asset_id) REFERENCES app.Assets(asset_id),
    FOREIGN KEY (target_asset_id) REFERENCES app.Assets(asset_id),
    INDEX IX_SimilarityCache_Source (source_asset_id),
    INDEX IX_SimilarityCache_Target (target_asset_id),
    UNIQUE (source_asset_id, target_asset_id, similarity_type)
);
GO

-- Ensure required session settings for function creation
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- Function to calculate text-based similarity (simple implementation)
CREATE FUNCTION semantic.fn_TextSimilarity(@text1 NVARCHAR(MAX), @text2 NVARCHAR(MAX))
RETURNS DECIMAL(5,4)
AS
BEGIN
    DECLARE @similarity DECIMAL(5,4) = 0.0;
    DECLARE @len1 INT = LEN(@text1);
    DECLARE @len2 INT = LEN(@text2);
    DECLARE @common_words INT = 0;
    
    -- Simple word overlap calculation
    IF @len1 > 0 AND @len2 > 0
    BEGIN
        -- Count common words (simplified)
        SET @common_words = (
            SELECT COUNT(*)
            FROM (
                SELECT value as word FROM STRING_SPLIT(@text1, ' ')
                WHERE LEN(value) > 2
            ) t1
            INNER JOIN (
                SELECT value as word FROM STRING_SPLIT(@text2, ' ')
                WHERE LEN(value) > 2
            ) t2 ON t1.word = t2.word
        );
        
        -- SQL Server doesn't support GREATEST; compute a safe non-zero denominator
        DECLARE @d1 INT = NULLIF(@len1/5, 0);
        DECLARE @d2 INT = NULLIF(@len2/5, 0);
        DECLARE @den INT =
            CASE
                WHEN COALESCE(@d1, 0) >= COALESCE(@d2, 0) AND COALESCE(@d1, 1) >= 1 THEN COALESCE(@d1, 1)
                WHEN COALESCE(@d2, 0) >= COALESCE(@d1, 0) AND COALESCE(@d2, 1) >= 1 THEN COALESCE(@d2, 1)
                ELSE 1
            END;
        SET @similarity = CAST(@common_words AS DECIMAL(10,4)) / CAST(@den AS DECIMAL(10,4));
        IF @similarity > 1.0 SET @similarity = 1.0;
    END
    
    RETURN @similarity;
END;
GO

-- Ensure required session settings for function creation
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- Function for semantic search
CREATE FUNCTION semantic.fn_SemanticSearch(
    @query NVARCHAR(500),
    @entity_type NVARCHAR(50) = 'asset',
    @limit INT = 20
)
RETURNS @result TABLE (
    entity_id INT,
    entity_type NVARCHAR(50),
    searchable_text NVARCHAR(MAX),
    relevance_score DECIMAL(5,4),
    keywords NVARCHAR(500)
)
AS
BEGIN
    -- Text-based semantic search
    INSERT INTO @result
    SELECT TOP (@limit)
        si.entity_id,
        si.entity_type,
        si.searchable_text,
        -- Calculate relevance based on text similarity and keyword matching
        (
            CASE
                WHEN ts.score >= kw.score THEN ts.score
                ELSE kw.score
            END
        ) as relevance_score,
        si.keywords
    FROM semantic.SearchIndex si
    CROSS APPLY (
        SELECT CAST(semantic.fn_TextSimilarity(@query, si.searchable_text) AS DECIMAL(10,4)) AS score
    ) ts
    CROSS APPLY (
        SELECT CAST(
            CASE 
                WHEN si.keywords IS NOT NULL AND si.keywords LIKE '%' + @query + '%' THEN 0.8
                WHEN si.searchable_text LIKE '%' + @query + '%' THEN 0.6
                ELSE 0.0
            END AS DECIMAL(10,4)
        ) AS score
    ) kw
    WHERE (@entity_type IS NULL OR si.entity_type = @entity_type)
      AND (
          si.searchable_text LIKE '%' + @query + '%'
          OR si.keywords LIKE '%' + @query + '%'
          OR EXISTS (
              SELECT 1 FROM STRING_SPLIT(@query, ' ') sq
              WHERE LEN(sq.value) > 2 
                AND (si.searchable_text LIKE '%' + sq.value + '%' 
                     OR si.keywords LIKE '%' + sq.value + '%')
          )
      )
    ORDER BY relevance_score DESC, entity_id;
    
    RETURN;
END;
GO

-- Populate search index with existing assets
INSERT INTO semantic.SearchIndex (entity_type, entity_id, searchable_text, keywords, tags)
SELECT 
    'asset' as entity_type,
    a.asset_id as entity_id,
    CONCAT(
        COALESCE(a.type, ''), ' ',
        COALESCE(a.model, ''), ' ',
        COALESCE(a.vendor, ''), ' ',
        COALESCE(s.name, ''), ' ',
        COALESCE(s.city, ''), ' ',
        COALESCE(s.state, '')
    ) as searchable_text,
    LOWER(CONCAT(
        COALESCE(a.type, ''), ',',
        COALESCE(a.vendor, ''), ',',
        COALESCE(a.model, '')
    )) as keywords,
    LOWER(CONCAT(a.type, ',', s.state)) as tags
FROM app.Assets a
JOIN app.Sites s ON a.site_id = s.site_id
WHERE NOT EXISTS (
    SELECT 1 FROM semantic.SearchIndex si 
    WHERE si.entity_type = 'asset' AND si.entity_id = a.asset_id
);
GO

-- Create view for semantic search results
CREATE VIEW semantic.vw_AssetSemanticSearch AS
SELECT 
    a.asset_id,
    a.type,
    a.model,
    a.vendor,
    s.name as site_name,
    s.city,
    s.state,
    si.searchable_text,
    si.keywords,
    si.tags
FROM app.Assets a
JOIN app.Sites s ON a.site_id = s.site_id
JOIN semantic.SearchIndex si ON si.entity_type = 'asset' AND si.entity_id = a.asset_id;
GO

PRINT '26_semantic_search_embeddings.sql applied - Semantic search ready';
