-- 26_user_site_access.sql
-- Ensure app.UserSiteAccess exists to support privacy checks and seeding
USE [OpsGraph];
GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID('app.UserSiteAccess','U') IS NULL
BEGIN
    CREATE TABLE app.UserSiteAccess (
        user_id INT NOT NULL,
        site_id INT NOT NULL,
        granted_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        granted_by INT NULL,
        CONSTRAINT PK_UserSiteAccess PRIMARY KEY (user_id, site_id),
        CONSTRAINT FK_usa_user FOREIGN KEY (user_id) REFERENCES app.Users(user_id),
        CONSTRAINT FK_usa_site FOREIGN KEY (site_id) REFERENCES app.Sites(site_id)
    );
END
GO

PRINT '26_user_site_access.sql applied: ensured app.UserSiteAccess exists.';
GO