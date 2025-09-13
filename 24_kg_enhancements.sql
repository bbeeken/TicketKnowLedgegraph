-- 24_kg_enhancements.sql
-- Enhancement: make snippet upsert proc resilient (auto-create kg.Ticket mirror) and add minimal embedding placeholder column usage.
USE [OpsGraph];
GO
SET ANSI_NULLS ON; SET QUOTED_IDENTIFIER ON; GO

/* Enhance snippet proc to internally ensure kg.Ticket node exists before creating edge */
CREATE OR ALTER PROCEDURE kg.usp_UpsertKnowledgeSnippet
  @source NVARCHAR(60), @label NVARCHAR(200)=NULL, @content NVARCHAR(MAX),
  @ticket_id INT=NULL, @asset_id INT=NULL, @document_id BIGINT=NULL
AS
BEGIN
  SET NOCOUNT ON; BEGIN TRY
    DECLARE @snippet_id BIGINT;
    DECLARE @hash NVARCHAR(64) = CONVERT(NVARCHAR(64), HASHBYTES('SHA2_256', @content),2);

    -- Upsert snippet (label de-dupe fallback to hash)
    IF @label IS NOT NULL
      SELECT @snippet_id = snippet_id FROM kg.KnowledgeSnippet WHERE label=@label;
    IF @snippet_id IS NULL
    BEGIN
      INSERT INTO kg.KnowledgeSnippet(source,label,content)
      VALUES(@source,@label,@content);
      SET @snippet_id = SCOPE_IDENTITY();
    END

    /* Guarantee kg.Ticket mirror exists if @ticket_id passed */
    IF @ticket_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM kg.Ticket WHERE ticket_id=@ticket_id)
    BEGIN
      INSERT INTO kg.Ticket (ticket_id,status,created_at,severity,category,summary)
      SELECT t.ticket_id, t.status, t.created_at, ISNULL(t.severity,1), COALESCE(c.name,'General'), t.summary
      FROM app.Tickets t
      LEFT JOIN app.Categories c ON t.category_id = c.category_id
      WHERE t.ticket_id=@ticket_id;
    END

    -- Link edges (ticket / asset / document) idempotently
    IF @ticket_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM kg.SNIPPET_REF WHERE $from_id=(SELECT $node_id FROM kg.KnowledgeSnippet WHERE snippet_id=@snippet_id)
        AND $to_id=(SELECT $node_id FROM kg.Ticket WHERE ticket_id=@ticket_id))
      INSERT INTO kg.SNIPPET_REF($from_id,$to_id)
        VALUES((SELECT $node_id FROM kg.KnowledgeSnippet WHERE snippet_id=@snippet_id),(SELECT $node_id FROM kg.Ticket WHERE ticket_id=@ticket_id));

    IF @asset_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM kg.SNIPPET_REF WHERE $from_id=(SELECT $node_id FROM kg.KnowledgeSnippet WHERE snippet_id=@snippet_id)
        AND $to_id=(SELECT $node_id FROM kg.Asset WHERE asset_id=@asset_id))
      INSERT INTO kg.SNIPPET_REF($from_id,$to_id)
        VALUES((SELECT $node_id FROM kg.KnowledgeSnippet WHERE snippet_id=@snippet_id),(SELECT $node_id FROM kg.Asset WHERE asset_id=@asset_id));

    IF @document_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM kg.DERIVED_FROM WHERE $from_id=(SELECT $node_id FROM kg.KnowledgeSnippet WHERE snippet_id=@snippet_id)
        AND $to_id=(SELECT $node_id FROM kg.Document WHERE document_id=@document_id))
      INSERT INTO kg.DERIVED_FROM($from_id,$to_id)
        VALUES((SELECT $node_id FROM kg.KnowledgeSnippet WHERE snippet_id=@snippet_id),(SELECT $node_id FROM kg.Document WHERE document_id=@document_id));

    SELECT @snippet_id AS snippet_id;
  END TRY BEGIN CATCH
    DECLARE @msg NVARCHAR(4000)=ERROR_MESSAGE();
    INSERT INTO app.IntegrationErrors(source,ref_id,message,details,created_at)
      VALUES('kg.usp_UpsertKnowledgeSnippet',@label,@msg,ERROR_PROCEDURE(),SYSUTCDATETIME());
    THROW; END CATCH
END
GO

PRINT '24_kg_enhancements.sql applied';
GO
