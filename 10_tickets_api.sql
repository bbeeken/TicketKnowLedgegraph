-- 10_tickets_api.sql
-- Views and stored procedures supporting the Tickets API: search, details, comments, attachments
USE [OpsGraph];
GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- View: open alerts by site (shape required by API)
CREATE OR ALTER VIEW app.vw_OpenAlertsBySite
AS
SELECT
    s.site_id,
    al.alert_id,
    e.occurred_at AS raised_at,
    e.canonical_code AS code,
    e.level AS [level],
    e.asset_id,
    asst.type AS asset_type,
    z.label AS zone_label,
    al.alert_id AS ticket_link -- keep same name for compatibility (ticket_id in some APIs)
FROM app.Alerts al
JOIN app.Events e ON al.event_id = e.event_id
JOIN app.Sites s ON e.site_id = s.site_id
LEFT JOIN app.Assets asst ON e.asset_id = asst.asset_id
LEFT JOIN app.Zones z ON asst.zone_id = z.zone_id
WHERE al.raised_at >= DATEADD(day, -60, SYSUTCDATETIME());
GO

-- View: ticket search surface (non-FTS fallback)
CREATE OR ALTER VIEW app.vw_TicketSearch
AS
SELECT
    t.ticket_id,
    t.ticket_no,
    t.summary,
    t.description,
    t.status,
    t.site_id,
    t.created_at,
    t.updated_at
FROM app.Tickets t;
GO

-- Optional full-text index creation (only if full-text is available)
IF TRY_CONVERT(INT, SERVERPROPERTY('IsFullTextInstalled')) = 1
BEGIN
    IF NOT EXISTS (SELECT 1 FROM sys.fulltext_indexes fi JOIN sys.tables tb ON fi.object_id = tb.object_id WHERE tb.name = 'Tickets' AND SCHEMA_NAME(schema_id) = 'app')
    BEGIN
        -- Create fulltext index on summary + description
        DECLARE @tbl sysname = N'app.Tickets';
        EXEC('CREATE FULLTEXT INDEX ON ' + @tbl + ' (summary LANGUAGE 0, description LANGUAGE 0) KEY INDEX PK__Tickets__0000000000000000');
    END
END
GO

-- Procedure: Get detailed ticket (main row + related sets)
CREATE OR ALTER PROCEDURE app.usp_GetTicketDetail
    @ticket_id INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        t.ticket_id,
        t.ticket_no,
        t.status,
        t.substatus_code,
        t.severity,
        t.category_id,
        t.summary,
        t.description,
        t.site_id,
        t.assignee_user_id,
        t.team_id,
        t.vendor_id,
        t.due_at,
        t.sla_plan_id,
        t.created_at,
        t.updated_at,
        CAST(t.rowversion AS varbinary(8)) AS rowversion_bin
    FROM app.Tickets t
    WHERE t.ticket_id = @ticket_id;

    -- assets
    SELECT a.asset_id, a.type, a.model
    FROM app.TicketAssets ta
    JOIN app.Assets a ON ta.asset_id = a.asset_id
    WHERE ta.ticket_id = @ticket_id;

    -- watchers
    SELECT w.user_id
    FROM app.TicketWatchers w
    WHERE w.ticket_id = @ticket_id;

    -- comments
    SELECT c.comment_id, c.author_id, c.body, c.visibility, c.created_at
    FROM app.TicketComments c
    WHERE c.ticket_id = @ticket_id
    ORDER BY c.created_at ASC;

    -- attachments
    SELECT at.attachment_id, at.uri, at.mime_type, at.size_bytes, at.content_sha256
    FROM app.Attachments at
    WHERE at.ticket_id = @ticket_id;
END
GO

-- Procedure: Add comment to ticket
CREATE OR ALTER PROCEDURE app.usp_AddTicketComment
    @ticket_id INT,
    @author_id INT,
    @body NVARCHAR(MAX),
    @visibility NVARCHAR(16) = 'public'
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        INSERT INTO app.TicketComments (ticket_id, author_id, body, visibility, created_at)
        VALUES (@ticket_id, @author_id, @body, @visibility, SYSUTCDATETIME());
        SELECT SCOPE_IDENTITY() AS comment_id;
    END TRY
    BEGIN CATCH
        INSERT INTO app.IntegrationErrors (source, ref_id, message, details, created_at)
        VALUES ('usp_AddTicketComment', CONVERT(NVARCHAR(64), @ticket_id), ERROR_MESSAGE(), ERROR_PROCEDURE(), SYSUTCDATETIME());
        THROW;
    END CATCH
END
GO

-- Procedure: Add attachment (store metadata only) — file storage handled by API server
CREATE OR ALTER PROCEDURE app.usp_AddAttachment
    @ticket_id INT = NULL,
    @vendor_id INT = NULL,
    @asset_id INT = NULL,
    @uri NVARCHAR(400),
    @kind NVARCHAR(40),
    @mime_type NVARCHAR(80),
    @size_bytes BIGINT,
    @content_sha256 VARBINARY(32),
    @uploaded_by INT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        -- require at least one target
        IF (@ticket_id IS NULL AND @vendor_id IS NULL AND @asset_id IS NULL)
        BEGIN
            RAISERROR('One of ticket_id, vendor_id, or asset_id must be provided', 16, 1);
            RETURN;
        END
        -- validate foreigns when provided
        IF @ticket_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM app.Tickets WHERE ticket_id=@ticket_id)
            RAISERROR('Invalid ticket_id', 16, 1);
        IF @vendor_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM app.Vendors WHERE vendor_id=@vendor_id)
            RAISERROR('Invalid vendor_id', 16, 1);
        IF @asset_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM app.Assets WHERE asset_id=@asset_id)
            RAISERROR('Invalid asset_id', 16, 1);

        INSERT INTO app.Attachments (ticket_id, vendor_id, asset_id, uri, kind, mime_type, size_bytes, content_sha256, uploaded_by, created_at)
        VALUES (@ticket_id, @vendor_id, @asset_id, @uri, @kind, @mime_type, @size_bytes, @content_sha256, @uploaded_by, SYSUTCDATETIME());
        SELECT SCOPE_IDENTITY() AS attachment_id;
    END TRY
    BEGIN CATCH
        INSERT INTO app.IntegrationErrors (source, ref_id, message, details, created_at)
        VALUES ('usp_AddAttachment', COALESCE(CONVERT(NVARCHAR(64), @ticket_id), CONVERT(NVARCHAR(64), @vendor_id), CONVERT(NVARCHAR(64), @asset_id)), ERROR_MESSAGE(), ERROR_PROCEDURE(), SYSUTCDATETIME());
        THROW;
    END CATCH
END
GO

-- Procedure: Simple ticket search with optional FTS parameter
CREATE OR ALTER PROCEDURE app.usp_SearchTickets
    @site_id INT = NULL,
    @status NVARCHAR(30) = NULL,
    @q NVARCHAR(400) = NULL,
    @offset INT = 0,
    @limit INT = 50
AS
BEGIN
    SET NOCOUNT ON;
    IF @q IS NOT NULL AND LEN(@q) > 0 AND EXISTS (SELECT 1 FROM sys.fulltext_indexes fi JOIN sys.tables tb ON fi.object_id = tb.object_id WHERE tb.name = 'Tickets' AND SCHEMA_NAME(tb.schema_id) = 'app')
    BEGIN
        -- Use full-text search
        DECLARE @sql NVARCHAR(MAX) = N'
            SELECT t.ticket_id, t.ticket_no, t.summary, t.status, t.site_id, t.updated_at
            FROM app.Tickets t
            WHERE CONTAINS((t.summary,t.description), @q)
            ';
        EXEC sp_executesql @sql, N'@q NVARCHAR(400), @site_id INT, @status NVARCHAR(30), @offset INT, @limit INT', @q=@q, @site_id=@site_id, @status=@status, @offset=@offset, @limit=@limit;
        RETURN;
    END
    ELSE
    BEGIN
        SELECT t.ticket_id, t.ticket_no, t.summary, t.status, t.site_id, t.updated_at
        FROM app.Tickets t
        WHERE (@site_id IS NULL OR t.site_id = @site_id)
          AND (@status IS NULL OR t.status = @status)
          AND (@q IS NULL OR t.summary LIKE '%' + @q + '%')
        ORDER BY t.updated_at DESC
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;
    END
END
GO

-- Convenience view mapping for alerts API (columns match spec)
CREATE OR ALTER VIEW app.vw_OpenAlertsBySite_AsSpec
AS
SELECT site_id, alert_id, raised_at, code, [level], asset_id, asset_type, zone_label, NULL AS ticket_id
FROM app.vw_OpenAlertsBySite;
GO

-- Ensure required sequences / default ticket number generator exists (simple fallback)
IF NOT EXISTS (SELECT 1 FROM sys.sequences WHERE name = 'TicketSeq')
BEGIN
    CREATE SEQUENCE app.TicketSeq START WITH 100000 INCREMENT BY 1;
END
GO

PRINT '10_tickets_api.sql applied.';
GO
