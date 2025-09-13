-- 16_attachments_extension.sql
-- Targeted extension for app.Attachments to support vendor and asset links (idempotent)
USE [OpsGraph];
GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID('app.Attachments','U') IS NOT NULL
BEGIN
    IF COL_LENGTH('app.Attachments','vendor_id') IS NULL
        ALTER TABLE app.Attachments ADD vendor_id INT NULL;
    IF COL_LENGTH('app.Attachments','asset_id') IS NULL
        ALTER TABLE app.Attachments ADD asset_id INT NULL;

    IF COL_LENGTH('app.Attachments','vendor_id') IS NOT NULL
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Attachments_Vendor')
            EXEC('ALTER TABLE app.Attachments ADD CONSTRAINT FK_Attachments_Vendor FOREIGN KEY(vendor_id) REFERENCES app.Vendors(vendor_id)');
        IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Attachments_Vendor')
            EXEC('CREATE NONCLUSTERED INDEX IX_Attachments_Vendor ON app.Attachments(vendor_id) WHERE vendor_id IS NOT NULL');
    END

    IF COL_LENGTH('app.Attachments','asset_id') IS NOT NULL
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Attachments_Asset')
            EXEC('ALTER TABLE app.Attachments ADD CONSTRAINT FK_Attachments_Asset FOREIGN KEY(asset_id) REFERENCES app.Assets(asset_id)');
        IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Attachments_Asset')
            EXEC('CREATE NONCLUSTERED INDEX IX_Attachments_Asset ON app.Attachments(asset_id) WHERE asset_id IS NOT NULL');
    END
END
GO

PRINT '16_attachments_extension.sql applied.';
GO
