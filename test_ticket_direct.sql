-- Test direct ticket insertion with correct SET options
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;

BEGIN TRANSACTION;

-- First verify we can insert
PRINT 'Testing direct ticket insertion...';

INSERT INTO app.Tickets (summary, description, status, severity, category_id, site_id, created_by, substatus_code, created_at, updated_at) 
VALUES ('TEST - Direct Insert', 'This is a test ticket inserted directly', 'Open', 2, 1, 1, 1, 'awaiting_assignment', SYSUTCDATETIME(), SYSUTCDATETIME());

-- Check if the ticket exists
SELECT COUNT(*) as ticket_count FROM app.Tickets WHERE summary LIKE 'TEST - Direct Insert%';

-- Check detailed info
SELECT ticket_id, summary, status, site_id, created_by FROM app.Tickets WHERE summary LIKE 'TEST - Direct Insert%';

COMMIT TRANSACTION;

PRINT 'Transaction committed successfully.';