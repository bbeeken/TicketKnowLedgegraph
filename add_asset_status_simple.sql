-- Add status field to Assets table for operational status tracking
USE OpsGraph;
GO

SET QUOTED_IDENTIFIER ON;
GO

-- Add status column if it doesn't exist
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('app.Assets') AND name = 'status')
BEGIN
    ALTER TABLE app.Assets 
    ADD status NVARCHAR(20) NOT NULL DEFAULT 'operational';
    
    PRINT 'Added status column to app.Assets table';
    
    -- Add constraint after column is created
    ALTER TABLE app.Assets
    ADD CONSTRAINT CK_Assets_Status CHECK (status IN ('operational', 'warning', 'critical', 'maintenance', 'offline'));
    
    PRINT 'Added status constraint to app.Assets table';
END
ELSE
BEGIN
    PRINT 'Status column already exists in app.Assets table';
END
GO

-- Create procedure specifically for updating asset status
IF OBJECT_ID('app.usp_UpdateAssetStatus', 'P') IS NOT NULL
    DROP PROCEDURE app.usp_UpdateAssetStatus;
GO

CREATE PROCEDURE app.usp_UpdateAssetStatus
    @asset_id INT,
    @status NVARCHAR(20),
    @notes NVARCHAR(500) = NULL,
    @updated_by INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Validate status
    IF @status NOT IN ('operational', 'warning', 'critical', 'maintenance', 'offline')
    BEGIN
        RAISERROR('Invalid status. Must be: operational, warning, critical, maintenance, or offline', 16, 1);
        RETURN;
    END
    
    -- Check if asset exists
    IF NOT EXISTS (SELECT 1 FROM app.Assets WHERE asset_id = @asset_id)
    BEGIN
        RAISERROR('Asset not found', 16, 1);
        RETURN;
    END
    
    DECLARE @old_status NVARCHAR(20);
    SELECT @old_status = status FROM app.Assets WHERE asset_id = @asset_id;
    
    -- Update asset status
    UPDATE app.Assets 
    SET status = @status
    WHERE asset_id = @asset_id;
    
    SELECT 
        asset_id = @asset_id,
        old_status = @old_status,
        new_status = @status,
        updated_at = SYSUTCDATETIME();
END
GO

PRINT 'Asset status functionality added successfully';