-- Fix RLS by dropping and recreating the policy with updated predicate
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- Drop the security policy first
DROP SECURITY POLICY sec.pol_TicketAccess;
GO

-- Update the RLS predicate function to include dbo check
CREATE OR ALTER FUNCTION sec.fn_TicketAccessPredicate(@site_id INT)
RETURNS TABLE WITH SCHEMABINDING AS
RETURN SELECT 1 AS allow
WHERE IS_MEMBER('app_admin')=1
   OR USER_NAME() = 'dbo'  -- Allow dbo user (sa login) full access
   OR EXISTS (
     SELECT 1
     FROM app.UserTeams ut
     JOIN app.TeamSites ts ON ts.team_id = ut.team_id
     WHERE ut.user_id = CONVERT(INT, SESSION_CONTEXT(N'user_id'))
       AND ts.site_id = @site_id
   );
GO

-- Recreate the security policy
CREATE SECURITY POLICY sec.pol_TicketAccess
ADD FILTER PREDICATE sec.fn_TicketAccessPredicate(site_id) ON app.Tickets,
ADD FILTER PREDICATE sec.fn_TicketAccessPredicate(site_id) ON app.Events
WITH (STATE = ON);
GO

PRINT 'RLS predicate and policy updated to allow dbo user access.';