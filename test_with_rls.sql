-- Test with RLS context set
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;

-- Set RLS context as admin user
EXEC sys.sp_set_session_context @key=N'user_id', @value=1;

PRINT 'RLS context set to user_id=1. Attempting insert...';

INSERT INTO app.Tickets (summary, description, status, severity, category_id, site_id, created_by, substatus_code, created_at, updated_at) 
VALUES ('RLS TEST', 'Testing with RLS context set', 'Open', 2, 1, 1, 1, 'awaiting_assignment', SYSUTCDATETIME(), SYSUTCDATETIME());

-- Check if it worked
SELECT COUNT(*) as ticket_count FROM app.Tickets;
SELECT ticket_id, summary, status FROM app.Tickets WHERE summary = 'RLS TEST';

PRINT 'Test completed.';