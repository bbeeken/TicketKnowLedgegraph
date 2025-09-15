-- Fix RLS predicate to allow dbo user access
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
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

PRINT 'RLS predicate updated to allow dbo user access.';