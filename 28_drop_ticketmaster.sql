-- 28_drop_ticketmaster.sql
-- Safely remove TicketMaster and its trigger, and remap FKs to Tickets
USE [OpsGraph];
GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- Drop trigger if exists
IF OBJECT_ID('app.TicketMaster_InsertFromTickets','TR') IS NOT NULL
    DROP TRIGGER app.TicketMaster_InsertFromTickets;
GO

-- Remap FKs in history/worklogs/watchers to app.Tickets if they reference TicketMaster
IF EXISTS (
    SELECT 1 FROM sys.foreign_keys fk
    WHERE fk.parent_object_id = OBJECT_ID('app.TicketHistory')
      AND fk.referenced_object_id = OBJECT_ID('app.TicketMaster')
)
BEGIN
    DECLARE @fk1 NVARCHAR(128) = (SELECT TOP 1 name FROM sys.foreign_keys WHERE parent_object_id = OBJECT_ID('app.TicketHistory') AND referenced_object_id = OBJECT_ID('app.TicketMaster'));
    DECLARE @sql1 NVARCHAR(MAX) = N'ALTER TABLE app.TicketHistory DROP CONSTRAINT ' + QUOTENAME(@fk1) + '; ALTER TABLE app.TicketHistory ADD CONSTRAINT FK_TicketHistory_Tickets FOREIGN KEY(ticket_id) REFERENCES app.Tickets(ticket_id)';
    EXEC(@sql1);
END
GO

IF EXISTS (
    SELECT 1 FROM sys.foreign_keys fk
    WHERE fk.parent_object_id = OBJECT_ID('app.TicketWorklogs')
      AND fk.referenced_object_id = OBJECT_ID('app.TicketMaster')
)
BEGIN
    DECLARE @fk2 NVARCHAR(128) = (SELECT TOP 1 name FROM sys.foreign_keys WHERE parent_object_id = OBJECT_ID('app.TicketWorklogs') AND referenced_object_id = OBJECT_ID('app.TicketMaster'));
    DECLARE @sql2 NVARCHAR(MAX) = N'ALTER TABLE app.TicketWorklogs DROP CONSTRAINT ' + QUOTENAME(@fk2) + '; ALTER TABLE app.TicketWorklogs ADD CONSTRAINT FK_TicketWorklogs_Tickets FOREIGN KEY(ticket_id) REFERENCES app.Tickets(ticket_id)';
    EXEC(@sql2);
END
GO

-- If an older TicketWatchers table referenced TicketMaster, remap too (newer schema uses Tickets already)
IF EXISTS (
    SELECT 1 FROM sys.foreign_keys fk
    WHERE fk.parent_object_id = OBJECT_ID('app.TicketWatchers')
      AND fk.referenced_object_id = OBJECT_ID('app.TicketMaster')
)
BEGIN
    DECLARE @fk3 NVARCHAR(128) = (SELECT TOP 1 name FROM sys.foreign_keys WHERE parent_object_id = OBJECT_ID('app.TicketWatchers') AND referenced_object_id = OBJECT_ID('app.TicketMaster'));
    DECLARE @sql3 NVARCHAR(MAX) = N'ALTER TABLE app.TicketWatchers DROP CONSTRAINT ' + QUOTENAME(@fk3) + '; ALTER TABLE app.TicketWatchers ADD CONSTRAINT FK_TicketWatchers_Tickets FOREIGN KEY(ticket_id) REFERENCES app.Tickets(ticket_id)';
    EXEC(@sql3);
END
GO

-- Drop TicketMaster if present
IF OBJECT_ID('app.TicketMaster','U') IS NOT NULL
    DROP TABLE app.TicketMaster;
GO

PRINT '28_drop_ticketmaster.sql applied: TicketMaster dropped and dependencies remapped.';
GO