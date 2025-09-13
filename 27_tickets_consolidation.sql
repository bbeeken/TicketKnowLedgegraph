-- 27_tickets_consolidation.sql
-- Ensure app.Tickets has all columns needed; align to Tickets-only model
USE [OpsGraph];
GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- Add missing columns on app.Tickets if needed
IF OBJECT_ID('app.Tickets','U') IS NOT NULL
BEGIN
    IF COL_LENGTH('app.Tickets','substatus_code') IS NULL
        ALTER TABLE app.Tickets ADD substatus_code NVARCHAR(60) NULL;

    IF COL_LENGTH('app.Tickets','type_id') IS NULL AND OBJECT_ID('app.TicketTypes','U') IS NOT NULL
        ALTER TABLE app.Tickets ADD type_id INT NULL REFERENCES app.TicketTypes(type_id);

    IF COL_LENGTH('app.Tickets','privacy_level') IS NULL
    BEGIN
        IF OBJECT_ID('app.TicketPrivacyLevels','U') IS NULL
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
        ALTER TABLE app.Tickets ADD privacy_level NVARCHAR(20) NOT NULL DEFAULT 'public';
        ALTER TABLE app.Tickets ADD CONSTRAINT FK_Tickets_PrivacyLevel2 FOREIGN KEY (privacy_level) REFERENCES app.TicketPrivacyLevels(privacy_level);
    END

    IF COL_LENGTH('app.Tickets','is_private') IS NULL
        ALTER TABLE app.Tickets ADD is_private BIT NOT NULL DEFAULT 0;

    IF COL_LENGTH('app.Tickets','contact_name') IS NULL
        ALTER TABLE app.Tickets ADD contact_name NVARCHAR(100) NULL;
    IF COL_LENGTH('app.Tickets','contact_email') IS NULL
        ALTER TABLE app.Tickets ADD contact_email NVARCHAR(255) NULL;
    IF COL_LENGTH('app.Tickets','contact_phone') IS NULL
        ALTER TABLE app.Tickets ADD contact_phone NVARCHAR(40) NULL;
    IF COL_LENGTH('app.Tickets','problem_description') IS NULL
        ALTER TABLE app.Tickets ADD problem_description NVARCHAR(MAX) NULL;
END
GO

PRINT '27_tickets_consolidation.sql applied: Tickets-only alignment complete.';
GO