-- 15_asset_management_procs.sql
-- Stored procedures for advanced asset management: create asset, add image, register maintenance
USE [OpsGraph];
GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

CREATE OR ALTER PROCEDURE app.usp_CreateAsset
    @asset_id INT,
    @site_id INT,
    @zone_id INT = NULL,
    @type NVARCHAR(60),
    @model NVARCHAR(120) = NULL,
    @vendor_id INT = NULL,
    @vendor_name NVARCHAR(80) = NULL,
    @serial NVARCHAR(120) = NULL,
    @location NVARCHAR(200) = NULL,
    @purchase_date DATETIME2(3) = NULL,
    @warranty_until DATETIME2(3) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        -- Resolve vendor_name if not provided but vendor_id is
        IF @vendor_name IS NULL AND @vendor_id IS NOT NULL
            SELECT @vendor_name = v.name FROM app.Vendors v WHERE v.vendor_id = @vendor_id;
        IF NOT EXISTS (SELECT 1 FROM app.Assets WHERE asset_id = @asset_id)
        BEGIN
            -- Base schema requires 'vendor' (NVARCHAR) non-null; keep it populated
            INSERT INTO app.Assets (asset_id, site_id, zone_id, type, model, vendor, serial, installed_at)
            VALUES (@asset_id, @site_id, @zone_id, @type, ISNULL(@model, N''), ISNULL(@vendor_name, N'Unknown'), @serial, SYSUTCDATETIME());
        END
        ELSE
        BEGIN
            UPDATE app.Assets
               SET site_id=@site_id,
                   zone_id=@zone_id,
                   type=@type,
                   model=@model,
                   vendor = COALESCE(@vendor_name, vendor),
                   serial=@serial
             WHERE asset_id=@asset_id;
        END
        SELECT @asset_id AS asset_id;
    END TRY
    BEGIN CATCH
        INSERT INTO app.IntegrationErrors (source, ref_id, message, details, created_at)
        VALUES ('usp_CreateAsset', CONVERT(NVARCHAR(64), @asset_id), ERROR_MESSAGE(), ERROR_PROCEDURE(), SYSUTCDATETIME());
        THROW;
    END CATCH
END
GO

CREATE OR ALTER PROCEDURE app.usp_AddAssetImage
    @asset_id INT,
    @uri NVARCHAR(400),
    @mime_type NVARCHAR(80),
    @size_bytes BIGINT,
    @sha256 VARBINARY(32),
    @uploaded_by INT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        INSERT INTO app.AssetImages (asset_id, uri, mime_type, size_bytes, sha256, uploaded_by, uploaded_at)
        VALUES (@asset_id, @uri, @mime_type, @size_bytes, @sha256, @uploaded_by, SYSUTCDATETIME());
        SELECT SCOPE_IDENTITY() AS image_id;
    END TRY
    BEGIN CATCH
        INSERT INTO app.IntegrationErrors (source, ref_id, message, details, created_at)
        VALUES ('usp_AddAssetImage', CONVERT(NVARCHAR(64), @asset_id), ERROR_MESSAGE(), ERROR_PROCEDURE(), SYSUTCDATETIME());
        THROW;
    END CATCH
END
GO

CREATE OR ALTER PROCEDURE app.usp_RegisterMaintenance
    @asset_id INT,
    @scheduled_at DATETIME2(3),
    @performed_by INT = NULL,
    @notes NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        INSERT INTO app.AssetMaintenance (asset_id, scheduled_at, performed_at, performed_by, notes, created_at)
        VALUES (@asset_id, @scheduled_at, NULL, @performed_by, @notes, SYSUTCDATETIME());
        SELECT SCOPE_IDENTITY() AS maintenance_id;
    END TRY
    BEGIN CATCH
        INSERT INTO app.IntegrationErrors (source, ref_id, message, details, created_at)
        VALUES ('usp_RegisterMaintenance', CONVERT(NVARCHAR(64), @asset_id), ERROR_MESSAGE(), ERROR_PROCEDURE(), SYSUTCDATETIME());
        THROW;
    END CATCH
END
GO
