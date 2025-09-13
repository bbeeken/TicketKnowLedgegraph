-- 03_security_rls.sql
-- Row-Level Security for OpsGraph
USE [OpsGraph];
GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- Roles
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = 'app_admin') CREATE ROLE app_admin;
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = 'app_agent') CREATE ROLE app_agent;
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = 'app_viewer') CREATE ROLE app_viewer;
GO

-- RLS Predicate Function
CREATE OR ALTER FUNCTION sec.fn_TicketAccessPredicate(@site_id INT)
RETURNS TABLE WITH SCHEMABINDING AS
RETURN SELECT 1 AS allow
WHERE IS_MEMBER('app_admin')=1
   OR EXISTS (
     SELECT 1
     FROM app.UserTeams ut
     JOIN app.TeamSites ts ON ts.team_id = ut.team_id
     WHERE ut.user_id = CONVERT(INT, SESSION_CONTEXT(N'user_id'))
       AND ts.site_id = @site_id
   );
GO

-- Security Policy for Tickets, Events (Alerts excluded due to no direct site_id)
IF NOT EXISTS (SELECT 1 FROM sys.security_policies WHERE name = 'pol_TicketAccess')
BEGIN
    CREATE SECURITY POLICY sec.pol_TicketAccess
    ADD FILTER PREDICATE sec.fn_TicketAccessPredicate(site_id) ON app.Tickets,
    ADD FILTER PREDICATE sec.fn_TicketAccessPredicate(site_id) ON app.Events
    WITH (STATE = ON);
END
GO

-- Grant permissions
GRANT SELECT ON SCHEMA::app TO app_viewer;
GRANT SELECT ON SCHEMA::app TO app_agent;
GRANT SELECT ON SCHEMA::app TO app_admin;
GRANT EXECUTE ON SCHEMA::app TO app_agent;
GRANT EXECUTE ON SCHEMA::app TO app_admin;
GO
