-------------------------------------------------------------
-- 30_embedding_metadata.sql
-- Adds embedding metadata columns and usage tracking table.
-- Idempotent.
-------------------------------------------------------------

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('kg.KnowledgeSnippet') AND name = 'embedding_model')
BEGIN
  ALTER TABLE kg.KnowledgeSnippet ADD embedding_model NVARCHAR(100) NULL;
END;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('kg.KnowledgeSnippet') AND name = 'embedding_dim')
BEGIN
  ALTER TABLE kg.KnowledgeSnippet ADD embedding_dim INT NULL;
END;

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'EmbeddingModelUsage' AND schema_id = SCHEMA_ID('kg'))
BEGIN
  CREATE TABLE kg.EmbeddingModelUsage (
    usage_id BIGINT IDENTITY(1,1) PRIMARY KEY,
    model NVARCHAR(100) NOT NULL,
    provider NVARCHAR(50) NOT NULL,
    total_vectors INT NOT NULL,
    total_tokens INT NULL,
    last_used_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME()
  );
  CREATE UNIQUE INDEX UX_EmbeddingModelUsage_Model ON kg.EmbeddingModelUsage(model, provider);
END;

GO

-- Upsert proc for usage metrics
IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID('kg.usp_UpsertEmbeddingUsage') AND type IN ('P','PC'))
  EXEC('CREATE PROCEDURE kg.usp_UpsertEmbeddingUsage AS BEGIN SET NOCOUNT ON; END');
GO

ALTER PROCEDURE kg.usp_UpsertEmbeddingUsage
  @model NVARCHAR(100),
  @provider NVARCHAR(50),
  @vector_count INT,
  @tokens INT = NULL
AS
BEGIN
  SET NOCOUNT ON;
  MERGE kg.EmbeddingModelUsage AS tgt
  USING (SELECT @model AS model, @provider AS provider) AS src
  ON (tgt.model = src.model AND tgt.provider = src.provider)
  WHEN MATCHED THEN
    UPDATE SET total_vectors = tgt.total_vectors + @vector_count,
               total_tokens = COALESCE(tgt.total_tokens,0) + COALESCE(@tokens,0),
               last_used_at = SYSUTCDATETIME()
  WHEN NOT MATCHED THEN
    INSERT (model, provider, total_vectors, total_tokens, last_used_at)
    VALUES (@model, @provider, @vector_count, @tokens, SYSUTCDATETIME());
END;
GO
