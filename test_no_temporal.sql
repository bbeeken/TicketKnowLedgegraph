-- Test by temporarily disabling temporal table
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;

-- Disable system versioning temporarily
ALTER TABLE app.Tickets SET (SYSTEM_VERSIONING = OFF);

PRINT 'System versioning disabled. Attempting insert...';

INSERT INTO app.Tickets (summary, description, status, severity, category_id, site_id, created_by, substatus_code, created_at, updated_at) 
VALUES ('TEMPORAL TEST', 'Testing with temporal disabled', 'Open', 2, 1, 1, 1, 'awaiting_assignment', SYSUTCDATETIME(), SYSUTCDATETIME());

-- Check if it worked
SELECT COUNT(*) as ticket_count FROM app.Tickets;
SELECT ticket_id, summary, status FROM app.Tickets WHERE summary = 'TEMPORAL TEST';

-- Re-enable system versioning
ALTER TABLE app.Tickets SET (SYSTEM_VERSIONING = ON (HISTORY_TABLE = app.TicketsHistory));

PRINT 'System versioning re-enabled.';