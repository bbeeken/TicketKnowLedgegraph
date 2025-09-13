SET QUOTED_IDENTIFIER ON;
GO

CREATE OR ALTER FUNCTION app.fn_CanUserViewTicket(@ticket_id INT, @user_id INT)
RETURNS BIT
AS
BEGIN
    DECLARE @CanView BIT = 0;
    DECLARE @privacy_level NVARCHAR(20);
    DECLARE @ticket_site_id INT;
    DECLARE @created_by INT;
    DECLARE @assignee_user_id INT;
    
    -- Get ticket details from extended table if it exists
    SELECT @privacy_level = privacy_level, @ticket_site_id = site_id, 
           @created_by = created_by, @assignee_user_id = assignee_user_id
    FROM app.Tickets 
    WHERE ticket_id = @ticket_id;
    
    -- If not in extended table, get from TicketMaster and default to public
    IF @privacy_level IS NULL
    BEGIN
        SELECT @ticket_site_id = site_id, @created_by = created_by, 
               @assignee_user_id = assignee_user_id
        FROM app.TicketMaster 
        WHERE ticket_id = @ticket_id;
        
        -- If ticket doesn't exist at all, return 0
        IF @ticket_site_id IS NULL
            RETURN 0;
            
        -- Default to public for tickets not in extended table
        SET @privacy_level = 'public';
    END
    
    -- Public tickets - check site access
    IF @privacy_level = 'public'
    BEGIN
        IF EXISTS (SELECT 1 FROM app.UserSiteAccess WHERE user_id = @user_id AND site_id = @ticket_site_id)
            SET @CanView = 1;
    END
    
    -- Site only tickets - must have site access
    ELSE IF @privacy_level = 'site_only'
    BEGIN
        IF EXISTS (SELECT 1 FROM app.UserSiteAccess WHERE user_id = @user_id AND site_id = @ticket_site_id)
            SET @CanView = 1;
    END
    
    -- Private tickets - restricted access
    ELSE IF @privacy_level = 'private'
    BEGIN
        -- Creator, assignee, or watcher can view
        IF @user_id = @created_by 
        OR @user_id = @assignee_user_id
        OR EXISTS (SELECT 1 FROM app.TicketWatchers WHERE ticket_id = @ticket_id AND user_id = @user_id AND is_active = 1)
            SET @CanView = 1;
    END
    
    RETURN @CanView;
END
GO

-- Test the updated function
SELECT app.fn_CanUserViewTicket(39, 1) as can_view_updated;
GO
