-- 19_rich_messaging.sql
-- Rich ticket messaging: HTML/plain text support and retrieval
USE [OpsGraph];
GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- Extend TicketComments with rich content fields
IF OBJECT_ID('app.TicketComments','U') IS NOT NULL
BEGIN
    IF COL_LENGTH('app.TicketComments','content_format') IS NULL
        ALTER TABLE app.TicketComments ADD content_format NVARCHAR(16) NOT NULL CONSTRAINT DF_TicketComments_ContentFormat DEFAULT 'text';
    IF COL_LENGTH('app.TicketComments','body_html') IS NULL
        ALTER TABLE app.TicketComments ADD body_html NVARCHAR(MAX) NULL;
    IF COL_LENGTH('app.TicketComments','body_text') IS NULL
        ALTER TABLE app.TicketComments ADD body_text NVARCHAR(MAX) NULL;
END
GO

-- Updated proc: Add ticket message with HTML/text support
CREATE OR ALTER PROCEDURE app.usp_AddTicketMessage
    @ticket_id INT,
    @author_id INT,
    @message_type NVARCHAR(20),
    @body NVARCHAR(MAX) = NULL,
    @body_html NVARCHAR(MAX) = NULL,
    @content_format NVARCHAR(16) = 'text',
    @visibility NVARCHAR(16) = 'public'
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM app.Tickets WHERE ticket_id=@ticket_id)
            RAISERROR('Invalid ticket_id', 16, 1);
        INSERT INTO app.TicketComments (ticket_id, author_id, body, visibility, message_type, content_format, body_html, body_text, created_at)
        VALUES (
          @ticket_id,
          @author_id,
          COALESCE(@body, @body_html),
          @visibility,
          @message_type,
          @content_format,
          @body_html,
          @body,
          SYSUTCDATETIME()
        );
        DECLARE @cid BIGINT = SCOPE_IDENTITY();
        DECLARE @meta NVARCHAR(MAX) = (SELECT @message_type AS [type] FOR JSON PATH, WITHOUT_ARRAY_WRAPPER);
        INSERT INTO app.TicketHistory (ticket_id, change_type, new_value, changed_by, metadata)
        VALUES (@ticket_id, 'message', COALESCE(@body, @body_html), @author_id, @meta);
        DECLARE @payloadMsg NVARCHAR(MAX) = (SELECT @ticket_id AS ticket_id, @cid AS comment_id, @message_type AS [type] FOR JSON PATH, WITHOUT_ARRAY_WRAPPER);
        INSERT INTO app.Outbox (aggregate, aggregate_id, type, payload)
        VALUES ('ticket', CAST(@ticket_id AS NVARCHAR(64)), 'ticket.message', @payloadMsg);
        SELECT @cid AS comment_id;
    END TRY
    BEGIN CATCH
        INSERT INTO app.IntegrationErrors (source, ref_id, message, details, created_at)
        VALUES ('usp_AddTicketMessage', CONVERT(NVARCHAR(64), @ticket_id), ERROR_MESSAGE(), ERROR_PROCEDURE(), SYSUTCDATETIME());
        THROW;
    END CATCH
END
GO

-- Proc: Get ticket messages (paged)
CREATE OR ALTER PROCEDURE app.usp_GetTicketMessages
    @ticket_id INT,
    @offset INT = 0,
    @limit INT = 50
AS
BEGIN
    SET NOCOUNT ON;
    SELECT c.comment_id, c.ticket_id, c.author_id, c.visibility, c.message_type,
           c.content_format, c.body, c.body_text, c.body_html, c.created_at
    FROM app.TicketComments c
    WHERE c.ticket_id = @ticket_id
    ORDER BY c.created_at ASC
    OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;
END
GO

PRINT '19_rich_messaging.sql applied.';
GO