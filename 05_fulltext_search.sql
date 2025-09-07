-- 05_fulltext_search.sql
-- Full-Text Search for Tickets/Comments
USE [OpsGraph];
GO

-- Create FT catalog if not exists
IF NOT EXISTS (SELECT * FROM sys.fulltext_catalogs WHERE name = 'ftsOpsGraph')
    CREATE FULLTEXT CATALOG ftsOpsGraph;
GO

-- Tickets FT index
IF NOT EXISTS (SELECT * FROM sys.fulltext_indexes WHERE object_id = OBJECT_ID('app.Tickets'))
    CREATE FULLTEXT INDEX ON app.Tickets(summary LANGUAGE 1033, description LANGUAGE 1033)
    KEY INDEX PK__Tickets__3214EC07 ON ftsOpsGraph WITH CHANGE_TRACKING AUTO;
GO

-- TicketComments FT index
IF NOT EXISTS (SELECT * FROM sys.fulltext_indexes WHERE object_id = OBJECT_ID('app.TicketComments'))
    CREATE FULLTEXT INDEX ON app.TicketComments(body LANGUAGE 1033)
    KEY INDEX PK__TicketC__C3B4DFCA ON ftsOpsGraph WITH CHANGE_TRACKING AUTO;
GO

-- FTS View
CREATE OR ALTER VIEW app.vw_TicketSearchFTS AS
SELECT t.ticket_id, fts.[RANK] AS [rank], t.summary, t.status, t.severity, t.site_id, t.updated_at
FROM app.Tickets t
INNER JOIN CONTAINSTABLE(app.Tickets, (summary, description), '*') fts ON t.ticket_id = fts.[KEY];
GO
