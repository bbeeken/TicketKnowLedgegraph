-- Drop the security policy first, then recreate the predicate function
DROP SECURITY POLICY IF EXISTS sec.pol_TicketAccess;
GO

-- Drop and recreate the RLS predicate function to use proper user context
DROP FUNCTION IF EXISTS sec.fn_TicketAccessPredicate;
GO

-- Create updated RLS predicate that checks SESSION_CONTEXT for user_id
-- and validates access through UserSiteAccess or admin status
CREATE FUNCTION sec.fn_TicketAccessPredicate(@site_id INT)
RETURNS TABLE WITH SCHEMABINDING AS
RETURN SELECT 1 AS allow
WHERE EXISTS (
    SELECT 1
    FROM app.Users u
    LEFT JOIN app.UserRoles ur ON u.user_id = ur.user_id
    LEFT JOIN app.UserSiteAccess usa ON u.user_id = usa.user_id
    WHERE u.user_id = CAST(SESSION_CONTEXT(N'user_id') AS INT)
    AND (
        ur.role = 'admin'  -- Admins can see all tickets
        OR u.is_admin = 1  -- Users marked as admin
        OR usa.site_id = @site_id  -- Users with access to this site
    )
);
GO

-- Recreate the security policy
CREATE SECURITY POLICY sec.pol_TicketAccess
ADD FILTER PREDICATE sec.fn_TicketAccessPredicate(site_id) ON app.Tickets,
ADD FILTER PREDICATE sec.fn_TicketAccessPredicate(site_id) ON app.Events
WITH (STATE = ON);
GO