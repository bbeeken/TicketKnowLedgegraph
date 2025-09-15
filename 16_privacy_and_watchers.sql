-- Privacy and Watchers Enhancement Script
-- OpsGraph Ticket System
-- Enhanced privacy controls and watcher management

USE OpsGraph;
GO

-- Ensure required SET options for filtered indexes and objects
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- Drop and recreate TicketWatchers with enhanced structure
IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'app' AND TABLE_NAME = 'TicketWatchers')
BEGIN
    DROP TABLE app.TicketWatchers;
END
GO

-- Create enhanced TicketWatchers table
CREATE TABLE app.TicketWatchers (
    watcher_id INT IDENTITY(1,1) PRIMARY KEY,
    ticket_id INT NOT NULL,
    user_id INT NULL,
    email NVARCHAR(255) NULL,
    name NVARCHAR(100) NULL,
    watcher_type NVARCHAR(20) NOT NULL DEFAULT 'interested', 
    -- Types: 'interested', 'collaborator', 'site_contact', 'assignee_backup'
    notification_preferences NVARCHAR(100) NULL DEFAULT 'status_changes,comments',
    added_by INT NULL,
    added_at DATETIME2(3) NOT NULL DEFAULT GETUTCDATE(),
    is_active BIT NOT NULL DEFAULT 1,
    last_notified_at DATETIME2(3) NULL,
    
    CONSTRAINT FK_TicketWatchers_Ticket FOREIGN KEY (ticket_id) REFERENCES app.Tickets(ticket_id) ON DELETE CASCADE,
    CONSTRAINT FK_TicketWatchers_User FOREIGN KEY (user_id) REFERENCES app.Users(user_id),
    CONSTRAINT FK_TicketWatchers_AddedBy FOREIGN KEY (added_by) REFERENCES app.Users(user_id),
    CONSTRAINT CHK_TicketWatchers_Contact CHECK (user_id IS NOT NULL OR (email IS NOT NULL AND name IS NOT NULL)),
    CONSTRAINT CHK_TicketWatchers_Type CHECK (watcher_type IN ('interested', 'collaborator', 'site_contact', 'assignee_backup'))
);
GO

-- Create unique constraints (separate from table creation to handle nulls properly)
CREATE UNIQUE NONCLUSTERED INDEX UQ_TicketWatchers_UserTicket 
ON app.TicketWatchers(ticket_id, user_id) 
WHERE user_id IS NOT NULL;

CREATE UNIQUE NONCLUSTERED INDEX UQ_TicketWatchers_EmailTicket 
ON app.TicketWatchers(ticket_id, email) 
WHERE email IS NOT NULL;

-- Performance indexes
CREATE INDEX IX_TicketWatchers_Ticket ON app.TicketWatchers(ticket_id, is_active);
CREATE INDEX IX_TicketWatchers_User ON app.TicketWatchers(user_id, is_active) WHERE user_id IS NOT NULL;
CREATE INDEX IX_TicketWatchers_Type ON app.TicketWatchers(watcher_type, is_active);
GO

-- Create Privacy Levels table for better management
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'app' AND TABLE_NAME = 'TicketPrivacyLevels')
BEGIN
    CREATE TABLE app.TicketPrivacyLevels (
        privacy_level NVARCHAR(20) PRIMARY KEY,
        display_name NVARCHAR(50) NOT NULL,
        description NVARCHAR(200) NOT NULL,
        sort_order INT NOT NULL
    );
    
    INSERT INTO app.TicketPrivacyLevels (privacy_level, display_name, description, sort_order) VALUES
    ('public', 'Public', 'Visible to all users with site access', 1),
    ('site_only', 'Site Only', 'Visible only to users assigned to this site', 2),
    ('private', 'Private', 'Visible only to creator, assignee, site contacts, and watchers', 3);
END
GO

-- Add privacy_level column to Tickets if it doesn't exist
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'app' AND TABLE_NAME = 'Tickets' AND COLUMN_NAME = 'privacy_level')
BEGIN
    ALTER TABLE app.Tickets ADD privacy_level NVARCHAR(20) NOT NULL DEFAULT 'public';
    ALTER TABLE app.Tickets ADD CONSTRAINT FK_Tickets_PrivacyLevel FOREIGN KEY (privacy_level) REFERENCES app.TicketPrivacyLevels(privacy_level);
END
GO

-- Stored procedure to add a watcher
CREATE OR ALTER PROCEDURE app.usp_AddTicketWatcher
    @ticket_id INT,
    @user_id INT = NULL,
    @email NVARCHAR(255) = NULL,
    @name NVARCHAR(100) = NULL,
    @watcher_type NVARCHAR(20) = 'interested',
    @added_by INT = NULL,
    @notification_preferences NVARCHAR(100) = 'status_changes,comments'
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        -- Validate ticket exists
        IF NOT EXISTS (SELECT 1 FROM app.Tickets WHERE ticket_id = @ticket_id)
        BEGIN
            RAISERROR('Ticket not found', 16, 1);
            RETURN;
        END
        
        -- Validate input
        IF @user_id IS NULL AND (@email IS NULL OR @name IS NULL)
        BEGIN
            RAISERROR('Must provide either user_id or both email and name', 16, 1);
            RETURN;
        END
        
        -- Check for existing watcher
        IF (@user_id IS NOT NULL AND EXISTS (SELECT 1 FROM app.TicketWatchers WHERE ticket_id = @ticket_id AND user_id = @user_id AND is_active = 1))
        OR (@email IS NOT NULL AND EXISTS (SELECT 1 FROM app.TicketWatchers WHERE ticket_id = @ticket_id AND email = @email AND is_active = 1))
        BEGIN
            RAISERROR('Watcher already exists for this ticket', 16, 1);
            RETURN;
        END
        
        -- Insert watcher
        INSERT INTO app.TicketWatchers (ticket_id, user_id, email, name, watcher_type, notification_preferences, added_by)
        VALUES (@ticket_id, @user_id, @email, @name, @watcher_type, @notification_preferences, @added_by);
        
        SELECT SCOPE_IDENTITY() as watcher_id, 'Watcher added successfully' as message;
        
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrorMessage, 16, 1);
    END CATCH
END
GO

-- Stored procedure to remove a watcher
CREATE OR ALTER PROCEDURE app.usp_RemoveTicketWatcher
    @watcher_id INT = NULL,
    @ticket_id INT = NULL,
    @user_id INT = NULL,
    @email NVARCHAR(255) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        IF @watcher_id IS NOT NULL
        BEGIN
            UPDATE app.TicketWatchers SET is_active = 0 WHERE watcher_id = @watcher_id;
        END
        ELSE IF @ticket_id IS NOT NULL AND @user_id IS NOT NULL
        BEGIN
            UPDATE app.TicketWatchers SET is_active = 0 
            WHERE ticket_id = @ticket_id AND user_id = @user_id;
        END
        ELSE IF @ticket_id IS NOT NULL AND @email IS NOT NULL
        BEGIN
            UPDATE app.TicketWatchers SET is_active = 0 
            WHERE ticket_id = @ticket_id AND email = @email;
        END
        ELSE
        BEGIN
            RAISERROR('Must provide watcher_id or ticket_id with user_id/email', 16, 1);
            RETURN;
        END
        
        SELECT @@ROWCOUNT as rows_affected, 'Watcher removed successfully' as message;
        
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrorMessage, 16, 1);
    END CATCH
END
GO

-- Function to check if user can view ticket based on privacy settings
CREATE OR ALTER FUNCTION app.fn_CanUserViewTicket(@ticket_id INT, @user_id INT)
RETURNS BIT
AS
BEGIN
    DECLARE @CanView BIT = 0;
    DECLARE @privacy_level NVARCHAR(20);
    DECLARE @ticket_site_id INT;
    DECLARE @created_by INT;
    DECLARE @assignee_user_id INT;
    
    -- Get ticket details
    SELECT @privacy_level = privacy_level, @ticket_site_id = site_id, 
           @created_by = created_by, @assignee_user_id = assignee_user_id
    FROM app.Tickets 
    WHERE ticket_id = @ticket_id;
    
    -- If ticket doesn't exist, return 0
    IF @privacy_level IS NULL
        RETURN 0;
    
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

-- View for tickets with watcher information
CREATE OR ALTER VIEW app.vw_TicketsWithWatchers AS
SELECT 
    t.ticket_id,
    t.ticket_no,
    t.summary,
    t.description,
    t.status,
    t.substatus_code,
    t.severity,
    t.privacy_level,
    t.is_private,
    t.site_id,
    s.name as site_name,
    t.created_by,
    cu.name as created_by_name,
    t.assignee_user_id,
    au.name as assignee_name,
    t.contact_name,
    t.contact_email,
    t.contact_phone,
    t.created_at,
    t.updated_at,
    -- Watcher counts
    (SELECT COUNT(*) FROM app.TicketWatchers tw WHERE tw.ticket_id = t.ticket_id AND tw.is_active = 1) as watcher_count,
    (SELECT COUNT(*) FROM app.TicketWatchers tw WHERE tw.ticket_id = t.ticket_id AND tw.is_active = 1 AND tw.watcher_type = 'collaborator') as collaborator_count
FROM app.Tickets t
LEFT JOIN app.Sites s ON t.site_id = s.site_id
LEFT JOIN app.Users cu ON t.created_by = cu.user_id
LEFT JOIN app.Users au ON t.assignee_user_id = au.user_id;
GO

-- Stored procedure to get watchers for a ticket
CREATE OR ALTER PROCEDURE app.usp_GetTicketWatchers
    @ticket_id INT
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        tw.watcher_id,
        tw.ticket_id,
        tw.user_id,
    u.name as user_name,
        tw.email,
        tw.name,
        tw.watcher_type,
        tw.notification_preferences,
        tw.added_by,
    ab.name as added_by_name,
        tw.added_at,
        tw.is_active,
        tw.last_notified_at
    FROM app.TicketWatchers tw
    LEFT JOIN app.Users u ON tw.user_id = u.user_id
    LEFT JOIN app.Users ab ON tw.added_by = ab.user_id
    WHERE tw.ticket_id = @ticket_id
    AND tw.is_active = 1
    ORDER BY tw.watcher_type, tw.added_at;
END
GO

-- Stored procedure to update ticket privacy level
CREATE OR ALTER PROCEDURE app.usp_UpdateTicketPrivacy
    @ticket_id INT,
    @privacy_level NVARCHAR(20),
    @updated_by INT
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        -- Validate privacy level
        IF NOT EXISTS (SELECT 1 FROM app.TicketPrivacyLevels WHERE privacy_level = @privacy_level)
        BEGIN
            RAISERROR('Invalid privacy level', 16, 1);
            RETURN;
        END
        
        -- Update ticket
        UPDATE app.Tickets 
        SET privacy_level = @privacy_level,
            is_private = CASE WHEN @privacy_level = 'private' THEN 1 ELSE 0 END,
            updated_at = GETUTCDATE()
        WHERE ticket_id = @ticket_id;
        
        -- Log the change in ticket history if that table exists
        IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'app' AND TABLE_NAME = 'TicketHistory')
        BEGIN
            INSERT INTO app.TicketHistory (ticket_id, changed_by, change_type, old_value, new_value, changed_at)
            VALUES (@ticket_id, @updated_by, 'privacy_level', NULL, @privacy_level, GETUTCDATE());
        END
        
        SELECT 'Privacy level updated successfully' as message;
        
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrorMessage, 16, 1);
    END CATCH
END
GO

-- Insert some sample data for testing
PRINT 'Privacy and watcher system created successfully';
PRINT 'Tables: TicketWatchers (enhanced), TicketPrivacyLevels';
PRINT 'Procedures: usp_AddTicketWatcher, usp_RemoveTicketWatcher, usp_GetTicketWatchers, usp_UpdateTicketPrivacy';
PRINT 'Function: fn_CanUserViewTicket';
PRINT 'View: vw_TicketsWithWatchers';
