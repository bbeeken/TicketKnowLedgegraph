-- Test with triggers disabled
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;

-- Disable triggers temporarily
DISABLE TRIGGER app.tr_Tickets_Outbox ON app.Tickets;
DISABLE TRIGGER app.tr_Tickets_UpdateTimestamp ON app.Tickets;

PRINT 'Triggers disabled. Attempting insert...';

INSERT INTO app.Tickets (summary, description, status, severity, category_id, site_id, created_by, substatus_code, created_at, updated_at) 
VALUES ('TRIGGER TEST', 'Testing with triggers disabled', 'Open', 2, 1, 1, 1, 'awaiting_assignment', SYSUTCDATETIME(), SYSUTCDATETIME());

-- Check if it worked
SELECT COUNT(*) as ticket_count FROM app.Tickets;
SELECT ticket_id, summary, status FROM app.Tickets WHERE summary = 'TRIGGER TEST';

-- Re-enable triggers
ENABLE TRIGGER app.tr_Tickets_Outbox ON app.Tickets;
ENABLE TRIGGER app.tr_Tickets_UpdateTimestamp ON app.Tickets;

PRINT 'Triggers re-enabled.';