-- Add status field to Assets table for operational status tracking
-- This supports asset status management functionality in the UI

-- Add status column if it doesn't exist
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('app.Assets') AND name = 'status')
BEGIN
    ALTER TABLE app.Assets 
    ADD status NVARCHAR(20) NOT NULL DEFAULT 'operational' 
    CONSTRAINT CK_Assets_Status CHECK (status IN ('operational', 'warning', 'critical', 'maintenance', 'offline'));
    
    PRINT 'Added status column to app.Assets table';
END
ELSE
BEGIN
    PRINT 'Status column already exists in app.Assets table';
END
GO

-- Update Asset creation procedure to support status
IF OBJECT_ID('app.usp_CreateAsset', 'P') IS NOT NULL
    DROP PROCEDURE app.usp_CreateAsset;
GO

CREATE PROCEDURE app.usp_CreateAsset
    @asset_id INT = NULL,
    @site_id INT,
    @zone_id INT = NULL,
    @type NVARCHAR(40),
    @model NVARCHAR(80) = NULL,
    @vendor_id INT = NULL,
    @serial NVARCHAR(80) = NULL,
    @location NVARCHAR(200) = NULL,
    @purchase_date DATE = NULL,
    @warranty_until DATE = NULL,
    @status NVARCHAR(20) = 'operational'
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Validate status
    IF @status NOT IN ('operational', 'warning', 'critical', 'maintenance', 'offline')
        SET @status = 'operational';
    
    IF @asset_id IS NULL
    BEGIN
        -- Insert new asset
        INSERT INTO app.Assets (
            site_id, zone_id, type, model, vendor, serial, 
            installed_at, location, purchase_date, warranty_until, status
        )
        VALUES (
            @site_id, @zone_id, @type, ISNULL(@model, ''), ISNULL(@vendor_id, 0), @serial,
            SYSUTCDATETIME(), @location, @purchase_date, @warranty_until, @status
        );
        
        SET @asset_id = SCOPE_IDENTITY();
    END
    ELSE
    BEGIN
        -- Update existing asset
        UPDATE app.Assets 
        SET site_id = @site_id,
            zone_id = @zone_id,
            type = @type,
            model = ISNULL(@model, model),
            vendor = ISNULL(@vendor_id, vendor),
            serial = ISNULL(@serial, serial),
            location = ISNULL(@location, location),
            purchase_date = ISNULL(@purchase_date, purchase_date),
            warranty_until = ISNULL(@warranty_until, warranty_until),
            status = @status
        WHERE asset_id = @asset_id;
    END
    
    SELECT @asset_id as asset_id;
END
GO

-- Create procedure specifically for updating asset status
CREATE OR ALTER PROCEDURE app.usp_UpdateAssetStatus
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
    
    -- Log the status change in AssetMaintenance table (if it exists)
    IF OBJECT_ID('app.AssetMaintenance', 'U') IS NOT NULL
    BEGIN
        INSERT INTO app.AssetMaintenance (
            asset_id, scheduled_at, performed_by, notes
        )
        VALUES (
            @asset_id, SYSUTCDATETIME(), @updated_by, 
            CONCAT('Status changed from ', @old_status, ' to ', @status, 
                   CASE WHEN @notes IS NOT NULL THEN '. Notes: ' + @notes ELSE '' END)
        );
    END
    
    SELECT 
        asset_id = @asset_id,
        old_status = @old_status,
        new_status = @status,
        updated_at = SYSUTCDATETIME();
END
GO

PRINT 'Asset status functionality added successfully';