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