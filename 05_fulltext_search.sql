-- 05_fulltext_search.sql
-- Full-Text Search for Tickets/Comments (Optional - only if FTS is installed)
USE [OpsGraph];
GO

-- Check if Full-Text Search is available and create dynamic SQL
DECLARE @sql NVARCHAR(MAX) = '';
DECLARE @ftsAvailable BIT = 0;

-- Try to check FTS availability safely
BEGIN TRY
    IF SERVERPROPERTY('IsFullTextInstalled') = 1
        SET @ftsAvailable = 1;
END TRY
BEGIN CATCH
    SET @ftsAvailable = 0;
END CATCH

IF @ftsAvailable = 1
BEGIN
    PRINT 'Full-Text Search is available. Setting up FTS indexes...';
    
    -- Create FT catalog if not exists
    IF NOT EXISTS (SELECT * FROM sys.fulltext_catalogs WHERE name = 'ftsOpsGraph')
    BEGIN
        SET @sql = 'CREATE FULLTEXT CATALOG ftsOpsGraph;';
        EXEC sp_executesql @sql;
    END

    -- Tickets FT index
    IF NOT EXISTS (SELECT * FROM sys.fulltext_indexes WHERE object_id = OBJECT_ID('app.Tickets'))
    BEGIN
        SET @sql = 'CREATE FULLTEXT INDEX ON app.Tickets(summary LANGUAGE 1033, description LANGUAGE 1033) KEY INDEX PK__Tickets__3214EC07 ON ftsOpsGraph WITH CHANGE_TRACKING AUTO;';
        EXEC sp_executesql @sql;
    END

    -- TicketComments FT index
    IF NOT EXISTS (SELECT * FROM sys.fulltext_indexes WHERE object_id = OBJECT_ID('app.TicketComments'))
    BEGIN
        SET @sql = 'CREATE FULLTEXT INDEX ON app.TicketComments(body LANGUAGE 1033) KEY INDEX PK__TicketC__C3B4DFCA ON ftsOpsGraph WITH CHANGE_TRACKING AUTO;';
        EXEC sp_executesql @sql;
    END

    -- FTS View
    SET @sql = 'CREATE OR ALTER VIEW app.vw_TicketSearchFTS AS
    SELECT t.ticket_id, fts.[RANK] AS [rank], t.summary, t.status, t.severity, t.site_id, t.updated_at
    FROM app.Tickets t
    INNER JOIN CONTAINSTABLE(app.Tickets, (summary, description), ''*'') fts ON t.ticket_id = fts.[KEY]';
    EXEC sp_executesql @sql;
    
    PRINT 'Full-Text Search setup completed.';
END
ELSE
BEGIN
    PRINT 'Full-Text Search is not available. Skipping FTS setup.';
    PRINT 'To enable FTS, use SQL Server 2022+ or install mssql-server-fts package.';
    
    -- Create a simple fallback view without FTS
    SET @sql = 'CREATE OR ALTER VIEW app.vw_TicketSearchFTS AS
    SELECT t.ticket_id, 1 AS [rank], t.summary, t.status, t.severity, t.site_id, t.updated_at
    FROM app.Tickets t
    WHERE 1=0'; -- Empty view as fallback
    EXEC sp_executesql @sql;
    
    PRINT 'Created fallback view app.vw_TicketSearchFTS.';
END
