-- 14_migrate_tickets_to_master.sql
-- Idempotent migration: copy existing app.Tickets rows into app.TicketMaster when missing
USE [OpsGraph];
GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- Only insert tickets that do not yet exist in TicketMaster
BEGIN TRY
    INSERT INTO app.TicketMaster (ticket_id, ticket_no, external_ref, type_id, category_id, status, substatus_code, priority, severity, summary, description, site_id, created_by, assignee_user_id, team_id, vendor_id, due_at, sla_plan_id, created_at, updated_at)
    SELECT t.ticket_id, t.ticket_no, t.external_ref, NULL, t.category_id, t.status, t.substatus_code, NULL, t.severity, t.summary, t.description, t.site_id, t.created_by, t.assignee_user_id, t.team_id, t.vendor_id, t.due_at, t.sla_plan_id, t.created_at, t.updated_at
    FROM app.Tickets t
    LEFT JOIN app.TicketMaster m ON m.ticket_id = t.ticket_id
    WHERE m.ticket_id IS NULL;

    PRINT 'Migration: inserted new TicketMaster rows from app.Tickets where missing.';
END TRY
BEGIN CATCH
    PRINT 'Migration failed: ' + ERROR_MESSAGE();
    THROW;
END CATCH
GO
