-- 17_attachments_nullable_ticket.sql
-- Allow attachments to be associated with vendors or assets without a ticket by making ticket_id nullable.
USE [OpsGraph];
GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID('app.Attachments') 
      AND name = 'ticket_id' 
      AND is_nullable = 0
)
BEGIN
    PRINT 'Altering app.Attachments.ticket_id to NULL';
    ALTER TABLE app.Attachments ALTER COLUMN ticket_id INT NULL;
END
GO

PRINT '17_attachments_nullable_ticket.sql applied.';
GO
