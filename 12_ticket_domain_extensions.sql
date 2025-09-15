-- 12_ticket_domain_extensions.sql
-- Lookup tables and advanced asset management extensions for OpsGraph ticket domain
USE [OpsGraph];
GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- Ticket statuses lookup (for normalized status codes)
IF OBJECT_ID('app.Statuses','U') IS NULL
CREATE TABLE app.Statuses (
    status_id INT IDENTITY(1,1) PRIMARY KEY,
    code NVARCHAR(60) NOT NULL UNIQUE,
    display_name NVARCHAR(120) NOT NULL,
    is_closed BIT NOT NULL DEFAULT 0
);
GO

-- Seed common statuses if not present
IF NOT EXISTS (SELECT 1 FROM app.Statuses WHERE status = 'Open')
    INSERT INTO app.Statuses (status, sort_order) VALUES ('Open',1);
IF NOT EXISTS (SELECT 1 FROM app.Statuses WHERE status = 'In Progress')
    INSERT INTO app.Statuses (status, sort_order) VALUES ('In Progress',2);
IF NOT EXISTS (SELECT 1 FROM app.Statuses WHERE status = 'Resolved')
    INSERT INTO app.Statuses (status, sort_order) VALUES ('Resolved',4);
IF NOT EXISTS (SELECT 1 FROM app.Statuses WHERE status = 'Closed')
    INSERT INTO app.Statuses (status, sort_order) VALUES ('Closed',5);
GO

-- Site directory (slim canonical directory for site info)
IF OBJECT_ID('app.SiteDirectory','U') IS NULL
CREATE TABLE app.SiteDirectory (
    site_id INT PRIMARY KEY,
    label NVARCHAR(150) NOT NULL,
    display_name NVARCHAR(200) NULL,
    address NVARCHAR(400) NULL,
    phone NVARCHAR(40) NULL,
    email NVARCHAR(200) NULL,
    pdi_name NVARCHAR(120) NULL,
    caribou_id NVARCHAR(60) NULL,
    dispenser_count INT NULL,
    is_travel_plaza BIT NULL
);
GO

-- Advanced Asset Management: identifiers, maintenance, warranty history, locations
IF OBJECT_ID('app.AssetIdentifiers','U') IS NULL
CREATE TABLE app.AssetIdentifiers (
    asset_id INT NOT NULL,
    identifier_type NVARCHAR(60) NOT NULL,
    identifier_value NVARCHAR(200) NOT NULL,
    PRIMARY KEY(asset_id, identifier_type, identifier_value),
    FOREIGN KEY(asset_id) REFERENCES app.Assets(asset_id)
);
GO

IF OBJECT_ID('app.AssetMaintenance','U') IS NULL
CREATE TABLE app.AssetMaintenance (
    maintenance_id BIGINT IDENTITY(1,1) PRIMARY KEY,
    asset_id INT NOT NULL REFERENCES app.Assets(asset_id),
    scheduled_at DATETIME2(3) NULL,
    performed_at DATETIME2(3) NULL,
    performed_by INT NULL REFERENCES app.Users(user_id),
    notes NVARCHAR(MAX) NULL,
    created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

IF OBJECT_ID('app.AssetWarrantyHistory','U') IS NULL
CREATE TABLE app.AssetWarrantyHistory (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    asset_id INT NOT NULL REFERENCES app.Assets(asset_id),
    warranty_start DATETIME2(3) NULL,
    warranty_end DATETIME2(3) NULL,
    vendor_id INT NULL REFERENCES app.Vendors(vendor_id),
    notes NVARCHAR(MAX) NULL,
    recorded_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

IF OBJECT_ID('app.AssetLocationHistory','U') IS NULL
CREATE TABLE app.AssetLocationHistory (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    asset_id INT NOT NULL REFERENCES app.Assets(asset_id),
    site_id INT NULL REFERENCES app.Sites(site_id),
    zone_id INT NULL REFERENCES app.Zones(zone_id),
    location NVARCHAR(200) NULL,
    moved_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    moved_by INT NULL REFERENCES app.Users(user_id)
);
GO

-- Asset image metadata already created (app.AssetImages); ensure FK/index
IF OBJECT_ID('app.AssetImages','U') IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_AssetImages_Asset')
        CREATE NONCLUSTERED INDEX IX_AssetImages_Asset ON app.AssetImages(asset_id);
END
GO

-- Vendors extended (ensure contact and contracts exist)
IF OBJECT_ID('app.VendorContacts','U') IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_VendorContacts_Vendor')
        CREATE NONCLUSTERED INDEX IX_VendorContacts_Vendor ON app.VendorContacts(vendor_id);
END
GO

IF OBJECT_ID('app.VendorContracts','U') IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_VendorContracts_Vendor')
        CREATE NONCLUSTERED INDEX IX_VendorContracts_Vendor ON app.VendorContracts(vendor_id);
END
GO

-- Helpful views for asset health and vendor coverage
CREATE OR ALTER VIEW app.vw_AssetWarrantyStatus
AS
SELECT a.asset_id, a.site_id, a.type, ah.warranty_start, ah.warranty_end, v.name AS vendor_name
FROM app.Assets a
LEFT JOIN app.AssetWarrantyHistory ah ON ah.asset_id = a.asset_id
LEFT JOIN app.Vendors v ON v.vendor_id = ah.vendor_id
WHERE ah.warranty_end IS NOT NULL;
GO

PRINT '12_ticket_domain_extensions applied';
GO
