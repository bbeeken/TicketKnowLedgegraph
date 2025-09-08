-- 11_ticket_master.sql
-- Advanced, normalized ticketing schema: master, history, categories, priorities, types, tags, assets (extended), vendors (extended), asset_images
USE [OpsGraph];
GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- Ticket lookups: priorities, types
IF OBJECT_ID('app.TicketPriorities','U') IS NULL
CREATE TABLE app.TicketPriorities (
    priority_id TINYINT PRIMARY KEY,
    name NVARCHAR(50) NOT NULL,
    weight INT NOT NULL
);
GO

IF OBJECT_ID('app.TicketTypes','U') IS NULL
CREATE TABLE app.TicketTypes (
    type_id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(100) NOT NULL UNIQUE,
    default_priority TINYINT NULL REFERENCES app.TicketPriorities(priority_id)
);
GO

-- Categories (if not created already)
IF OBJECT_ID('app.Categories','U') IS NULL
CREATE TABLE app.Categories (
    category_id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(100) NOT NULL UNIQUE,
    slug NVARCHAR(100) NOT NULL UNIQUE,
    domain NVARCHAR(60) NULL
);
GO

-- Tagging
IF OBJECT_ID('app.Tags','U') IS NULL
CREATE TABLE app.Tags (
    tag_id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(80) NOT NULL UNIQUE
);
GO

IF OBJECT_ID('app.TicketTags','U') IS NULL
CREATE TABLE app.TicketTags (
    ticket_id INT NOT NULL,
    tag_id INT NOT NULL,
    PRIMARY KEY(ticket_id, tag_id),
    FOREIGN KEY(ticket_id) REFERENCES app.Tickets(ticket_id),
    FOREIGN KEY(tag_id) REFERENCES app.Tags(tag_id)
);
GO

-- Ticket master table (extended)
IF OBJECT_ID('app.TicketMaster','U') IS NULL
CREATE TABLE app.TicketMaster (
    ticket_id INT PRIMARY KEY,
    ticket_no NVARCHAR(32) NOT NULL UNIQUE,
    external_ref NVARCHAR(60) NULL,
    type_id INT NULL REFERENCES app.TicketTypes(type_id),
    category_id INT NULL REFERENCES app.Categories(category_id),
    status NVARCHAR(40) NOT NULL,
    substatus_code NVARCHAR(60) NULL,
    priority TINYINT NULL,
    severity TINYINT NULL,
    summary NVARCHAR(512) NOT NULL,
    description NVARCHAR(MAX) NULL,
    site_id INT NOT NULL REFERENCES app.Sites(site_id),
    created_by INT NULL REFERENCES app.Users(user_id),
    assignee_user_id INT NULL REFERENCES app.Users(user_id),
    team_id INT NULL REFERENCES app.Teams(team_id),
    vendor_id INT NULL REFERENCES app.Vendors(vendor_id),
    due_at DATETIME2(3) NULL,
    sla_plan_id INT NULL REFERENCES app.SLAPlans(sla_plan_id),
    created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    is_locked BIT NOT NULL DEFAULT 0,
    rowversion ROWVERSION
);
GO

-- History: immutable change records
IF OBJECT_ID('app.TicketHistory','U') IS NULL
CREATE TABLE app.TicketHistory (
    history_id BIGINT IDENTITY(1,1) PRIMARY KEY,
    ticket_id INT NOT NULL REFERENCES app.TicketMaster(ticket_id),
    change_type NVARCHAR(60) NOT NULL, -- e.g. status_change, assignment, comment, attachment
    old_value NVARCHAR(4000) NULL,
    new_value NVARCHAR(4000) NULL,
    changed_by INT NULL REFERENCES app.Users(user_id),
    changed_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    metadata NVARCHAR(MAX) NULL
);
GO

-- Watchers
IF OBJECT_ID('app.TicketWatchers','U') IS NULL
CREATE TABLE app.TicketWatchers (
    ticket_id INT NOT NULL REFERENCES app.TicketMaster(ticket_id),
    user_id INT NOT NULL REFERENCES app.Users(user_id),
    added_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    PRIMARY KEY(ticket_id, user_id)
);
GO

-- Worklogs
IF OBJECT_ID('app.TicketWorklogs','U') IS NULL
CREATE TABLE app.TicketWorklogs (
    worklog_id BIGINT IDENTITY(1,1) PRIMARY KEY,
    ticket_id INT NOT NULL REFERENCES app.TicketMaster(ticket_id),
    user_id INT NULL REFERENCES app.Users(user_id),
    minutes_spent INT NOT NULL,
    activity NVARCHAR(200) NOT NULL,
    billable BIT NOT NULL DEFAULT 0,
    created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

-- Assets: extend app.Assets if missing columns
IF OBJECT_ID('app.Assets','U') IS NOT NULL
BEGIN
    IF COL_LENGTH('app.Assets','location') IS NULL
        ALTER TABLE app.Assets ADD location NVARCHAR(200) NULL;
    IF COL_LENGTH('app.Assets','purchase_date') IS NULL
        ALTER TABLE app.Assets ADD purchase_date DATETIME2(3) NULL;
    IF COL_LENGTH('app.Assets','warranty_until') IS NULL
        ALTER TABLE app.Assets ADD warranty_until DATETIME2(3) NULL;
END
ELSE
BEGIN
    CREATE TABLE app.Assets (
        asset_id INT PRIMARY KEY,
        site_id INT NOT NULL REFERENCES app.Sites(site_id),
        zone_id INT NULL REFERENCES app.Zones(zone_id),
        type NVARCHAR(60) NOT NULL,
        model NVARCHAR(120) NULL,
        vendor_id INT NULL REFERENCES app.Vendors(vendor_id),
        serial NVARCHAR(120) NULL,
        location NVARCHAR(200) NULL,
        purchase_date DATETIME2(3) NULL,
        warranty_until DATETIME2(3) NULL,
        installed_at DATETIME2(3) NULL
    );
    CREATE NONCLUSTERED INDEX IX_Assets_Serial ON app.Assets(serial) WHERE serial IS NOT NULL;
END
GO

-- Asset images (metadata only)
IF OBJECT_ID('app.AssetImages','U') IS NULL
CREATE TABLE app.AssetImages (
    image_id BIGINT IDENTITY(1,1) PRIMARY KEY,
    asset_id INT NOT NULL REFERENCES app.Assets(asset_id),
    uri NVARCHAR(400) NOT NULL,
    mime_type NVARCHAR(80) NULL,
    size_bytes BIGINT NULL,
    sha256 BINARY(32) NULL,
    uploaded_by INT NULL REFERENCES app.Users(user_id),
    uploaded_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

-- Vendors: extend with contacts and contracts
IF OBJECT_ID('app.VendorContacts','U') IS NULL
CREATE TABLE app.VendorContacts (
    contact_id BIGINT IDENTITY(1,1) PRIMARY KEY,
    vendor_id INT NOT NULL REFERENCES app.Vendors(vendor_id),
    name NVARCHAR(120) NOT NULL,
    email NVARCHAR(120) NULL,
    phone NVARCHAR(40) NULL,
    role NVARCHAR(80) NULL
);
GO

IF OBJECT_ID('app.VendorContracts','U') IS NULL
CREATE TABLE app.VendorContracts (
    contract_id BIGINT IDENTITY(1,1) PRIMARY KEY,
    vendor_id INT NOT NULL REFERENCES app.Vendors(vendor_id),
    name NVARCHAR(200) NOT NULL,
    start_date DATETIME2(3) NULL,
    end_date DATETIME2(3) NULL,
    notes NVARCHAR(MAX) NULL
);
GO

-- Attachments table exists; ensure indexes for lookups
IF OBJECT_ID('app.Attachments','U') IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Attachments_Ticket')
        CREATE NONCLUSTERED INDEX IX_Attachments_Ticket ON app.Attachments(ticket_id);
END
GO

-- TicketMaster convenience trigger to populate TicketMaster from app.Tickets
CREATE OR ALTER TRIGGER app.TicketMaster_InsertFromTickets
ON app.Tickets
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    MERGE INTO app.TicketMaster AS tgt
    USING (
        SELECT t.ticket_id, t.ticket_no, t.external_ref, t.status, t.substatus_code, t.severity, t.summary, t.description, t.site_id, t.created_by, t.assignee_user_id, t.team_id, t.vendor_id, t.due_at, t.sla_plan_id, t.created_at, t.updated_at
        FROM inserted t
    ) AS src
    ON tgt.ticket_id = src.ticket_id
    WHEN MATCHED THEN
        UPDATE SET status = src.status,
                   substatus_code = src.substatus_code,
                   severity = src.severity,
                   summary = src.summary,
                   description = src.description,
                   site_id = src.site_id,
                   assignee_user_id = src.assignee_user_id,
                   team_id = src.team_id,
                   vendor_id = src.vendor_id,
                   due_at = src.due_at,
                   sla_plan_id = src.sla_plan_id,
                   updated_at = src.updated_at
    WHEN NOT MATCHED THEN
        INSERT (ticket_id, ticket_no, external_ref, status, substatus_code, priority, severity, summary, description, site_id, created_by, assignee_user_id, team_id, vendor_id, due_at, sla_plan_id, created_at, updated_at)
        VALUES (src.ticket_id, src.ticket_no, src.external_ref, src.status, src.substatus_code, NULL, src.severity, src.summary, src.description, src.site_id, src.created_by, src.assignee_user_id, src.team_id, src.vendor_id, src.due_at, src.sla_plan_id, src.created_at, src.updated_at);
END
GO

PRINT '11_ticket_master.sql applied';
GO
