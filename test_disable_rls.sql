-- Test by temporarily disabling RLS policy
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;

-- Disable the security policy temporarily
ALTER SECURITY POLICY sec.pol_TicketAccess WITH (STATE = OFF);

PRINT 'Security policy disabled. Attempting insert...';

INSERT INTO app.Tickets (summary, description, status, severity, category_id, site_id, created_by, substatus_code, created_at, updated_at) 
VALUES ('NO RLS TEST', 'Testing with RLS policy disabled', 'Open', 2, 1, 1, 1, 'awaiting_assignment', SYSUTCDATETIME(), SYSUTCDATETIME());

-- Check if it worked
SELECT COUNT(*) as ticket_count FROM app.Tickets;
SELECT ticket_id, summary, status FROM app.Tickets WHERE summary = 'NO RLS TEST';

-- Re-enable the security policy
ALTER SECURITY POLICY sec.pol_TicketAccess WITH (STATE = ON);

PRINT 'Security policy re-enabled.';