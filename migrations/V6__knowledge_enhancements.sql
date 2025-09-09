-- V6__knowledge_enhancements.sql
USE [OpsGraph];
GO

-- Add article versioning
IF OBJECT_ID('app.KnowledgeArticleVersions','U') IS NULL
CREATE TABLE app.KnowledgeArticleVersions (
    version_id INT IDENTITY(1,1) PRIMARY KEY,
    article_id INT NOT NULL,
    version_number INT NOT NULL,
    content NVARCHAR(MAX) NOT NULL,
    solution_steps NVARCHAR(MAX) NULL,
    change_summary NVARCHAR(500) NULL,
    created_by INT NOT NULL,
    created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    FOREIGN KEY (article_id) REFERENCES app.KnowledgeArticles(article_id),
    FOREIGN KEY (created_by) REFERENCES app.Users(user_id),
    CONSTRAINT UQ_ArticleVersion UNIQUE (article_id, version_number)
);
GO

-- Add article effectiveness tracking
IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID('app.KnowledgeArticles')
    AND name = 'avg_resolution_time_mins'
)
BEGIN
    ALTER TABLE app.KnowledgeArticles
    ADD avg_resolution_time_mins INT NULL,
        failure_rate DECIMAL(5,2) NULL,
        last_successful_use_at DATETIME2(3) NULL,
        total_applications INT NOT NULL DEFAULT 0,
        successful_applications INT NOT NULL DEFAULT 0,
        failed_applications INT NOT NULL DEFAULT 0,
        feedback_score DECIMAL(5,2) NULL;
END;
GO

-- Add smart tagging system
IF OBJECT_ID('app.SmartTags','U') IS NULL
CREATE TABLE app.SmartTags (
    tag_id INT IDENTITY(1,1) PRIMARY KEY,
    tag_name NVARCHAR(100) NOT NULL UNIQUE,
    relevance_score DECIMAL(5,2) NOT NULL DEFAULT 1.0,
    usage_count INT NOT NULL DEFAULT 0,
    last_used_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    category_id INT NULL,
    asset_type NVARCHAR(60) NULL,
    is_auto_generated BIT NOT NULL DEFAULT 0,
    FOREIGN KEY (category_id) REFERENCES app.Categories(category_id)
);
GO

-- Article-Tag relationship
IF OBJECT_ID('app.ArticleTags','U') IS NULL
CREATE TABLE app.ArticleTags (
    article_id INT NOT NULL,
    tag_id INT NOT NULL,
    relevance_score DECIMAL(5,2) NOT NULL DEFAULT 1.0,
    added_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    added_by INT NOT NULL,
    is_auto_tagged BIT NOT NULL DEFAULT 0,
    PRIMARY KEY (article_id, tag_id),
    FOREIGN KEY (article_id) REFERENCES app.KnowledgeArticles(article_id),
    FOREIGN KEY (tag_id) REFERENCES app.SmartTags(tag_id),
    FOREIGN KEY (added_by) REFERENCES app.Users(user_id)
);
GO

-- Related articles
IF OBJECT_ID('app.RelatedArticles','U') IS NULL
CREATE TABLE app.RelatedArticles (
    source_article_id INT NOT NULL,
    related_article_id INT NOT NULL,
    relationship_type NVARCHAR(20) NOT NULL,  -- 'Prerequisite', 'Related', 'Supersedes'
    relevance_score DECIMAL(5,2) NOT NULL DEFAULT 1.0,
    created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    created_by INT NOT NULL,
    PRIMARY KEY (source_article_id, related_article_id),
    FOREIGN KEY (source_article_id) REFERENCES app.KnowledgeArticles(article_id),
    FOREIGN KEY (related_article_id) REFERENCES app.KnowledgeArticles(article_id),
    FOREIGN KEY (created_by) REFERENCES app.Users(user_id),
    CONSTRAINT CK_RelatedArticles_Type CHECK (relationship_type IN ('Prerequisite', 'Related', 'Supersedes'))
);
GO

-- Article review system
IF OBJECT_ID('app.ArticleReviews','U') IS NULL
CREATE TABLE app.ArticleReviews (
    review_id INT IDENTITY(1,1) PRIMARY KEY,
    article_id INT NOT NULL,
    reviewer_id INT NOT NULL,
    status NVARCHAR(20) NOT NULL,  -- 'Pending', 'Approved', 'Rejected', 'NeedsChanges'
    comments NVARCHAR(MAX) NULL,
    reviewed_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    version_id INT NULL,
    FOREIGN KEY (article_id) REFERENCES app.KnowledgeArticles(article_id),
    FOREIGN KEY (reviewer_id) REFERENCES app.Users(user_id),
    FOREIGN KEY (version_id) REFERENCES app.KnowledgeArticleVersions(version_id),
    CONSTRAINT CK_ArticleReviews_Status CHECK (status IN ('Pending', 'Approved', 'Rejected', 'NeedsChanges'))
);
GO

-- Article effectiveness tracking procedure
IF OBJECT_ID('app.usp_UpdateArticleEffectiveness', 'P') IS NOT NULL
    DROP PROCEDURE app.usp_UpdateArticleEffectiveness;
GO

CREATE PROCEDURE app.usp_UpdateArticleEffectiveness
    @ArticleId INT
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Calculate effectiveness metrics
    WITH article_stats AS (
        SELECT 
            COUNT(*) as total_refs,
            SUM(CASE WHEN was_helpful = 1 THEN 1 ELSE 0 END) as helpful_refs,
            SUM(CASE WHEN was_helpful = 0 THEN 1 ELSE 0 END) as unhelpful_refs,
            AVG(CAST(resolution_time_mins as FLOAT)) as avg_resolution_time,
            MAX(applied_at) as last_success
        FROM app.ArticleReferences
        WHERE article_id = @ArticleId
        AND was_helpful IS NOT NULL
    )
    UPDATE app.KnowledgeArticles
    SET 
        total_applications = stats.total_refs,
        successful_applications = stats.helpful_refs,
        failed_applications = stats.unhelpful_refs,
        avg_resolution_time_mins = stats.avg_resolution_time,
        last_successful_use_at = stats.last_success,
        failure_rate = CASE 
            WHEN stats.total_refs > 0 
            THEN CAST(stats.unhelpful_refs as FLOAT) / stats.total_refs 
            ELSE NULL 
        END,
        feedback_score = CASE 
            WHEN stats.total_refs > 0 
            THEN CAST(stats.helpful_refs as FLOAT) / stats.total_refs 
            ELSE NULL 
        END,
        updated_at = SYSUTCDATETIME()
    FROM app.KnowledgeArticles ka
    CROSS APPLY article_stats stats
    WHERE ka.article_id = @ArticleId;
END;
GO

-- Create article recommendation view
IF OBJECT_ID('app.vw_ArticleRecommendations', 'V') IS NOT NULL
    DROP VIEW app.vw_ArticleRecommendations;
GO

CREATE VIEW app.vw_ArticleRecommendations AS
WITH article_metrics AS (
    SELECT 
        ka.article_id,
        ka.title,
        ka.category_id,
        ka.asset_type,
        ka.success_rate,
        ka.view_count,
        ka.feedback_score,
        ka.avg_resolution_time_mins,
        COUNT(DISTINCT at.tag_id) as tag_count,
        COUNT(DISTINCT ar.related_article_id) as related_count,
        AVG(at.relevance_score) as avg_tag_relevance
    FROM app.KnowledgeArticles ka
    LEFT JOIN app.ArticleTags at ON ka.article_id = at.article_id
    LEFT JOIN app.RelatedArticles ar ON ka.article_id = ar.source_article_id
    WHERE ka.is_published = 1
    GROUP BY 
        ka.article_id,
        ka.title,
        ka.category_id,
        ka.asset_type,
        ka.success_rate,
        ka.view_count,
        ka.feedback_score,
        ka.avg_resolution_time_mins
)
SELECT 
    am.*,
    (am.feedback_score * 0.4 + 
     COALESCE(CAST(am.success_rate as FLOAT), 0) * 0.3 +
     COALESCE(am.avg_tag_relevance, 0) * 0.2 +
     CASE WHEN am.view_count > 0 THEN 0.1 ELSE 0 END) as recommendation_score
FROM article_metrics am;
GO
