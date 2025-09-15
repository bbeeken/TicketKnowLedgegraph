-- 01_app_relational_core.sql
-- Core system-of-record tables for OpsGraph
USE [OpsGraph];
GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- Users, Roles, Teams, Access
IF OBJECT_ID('app.Users','U') IS NULL
CREATE TABLE app.Users (
    user_id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(100) NOT NULL,
    email NVARCHAR(120) NOT NULL UNIQUE,
    phone NVARCHAR(40) NULL,
    role NVARCHAR(40) NULL,
    is_active BIT NOT NULL DEFAULT 1,
    created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    rowversion ROWVERSION
);
GO

IF OBJECT_ID('app.Roles','U') IS NULL
CREATE TABLE app.Roles (
    role_id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(40) NOT NULL UNIQUE
);
GO

IF OBJECT_ID('app.UserRoles','U') IS NULL
CREATE TABLE app.UserRoles (
    user_id INT NOT NULL,
    role_id INT NOT NULL,
    PRIMARY KEY(user_id, role_id),
    FOREIGN KEY(user_id) REFERENCES app.Users(user_id),
    FOREIGN KEY(role_id) REFERENCES app.Roles(role_id)
);
GO

IF OBJECT_ID('app.Teams','U') IS NULL
CREATE TABLE app.Teams (
    team_id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(80) NOT NULL UNIQUE
);
GO

IF OBJECT_ID('app.UserTeams','U') IS NULL
CREATE TABLE app.UserTeams (
    user_id INT NOT NULL,
    team_id INT NOT NULL,
    PRIMARY KEY(user_id, team_id),
    FOREIGN KEY(user_id) REFERENCES app.Users(user_id),
    FOREIGN KEY(team_id) REFERENCES app.Teams(team_id)
);
GO

IF OBJECT_ID('app.TeamSites','U') IS NULL
CREATE TABLE app.TeamSites (
    team_id INT NOT NULL,
    site_id INT NOT NULL,
    PRIMARY KEY(team_id, site_id)
);
GO

IF OBJECT_ID('app.Vendors','U') IS NULL
CREATE TABLE app.Vendors (
    vendor_id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(80) NOT NULL UNIQUE,
    contact_email NVARCHAR(120) NULL,
    phone NVARCHAR(40) NULL
);
GO

-- Categories (ticket taxonomy)
IF OBJECT_ID('app.Categories','U') IS NULL
CREATE TABLE app.Categories (
    category_id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(100) NOT NULL UNIQUE,
    slug NVARCHAR(100) NOT NULL UNIQUE,
    domain NVARCHAR(60) NULL
);
GO

-- Sites, Zones, Assets
IF OBJECT_ID('app.Sites','U') IS NULL
CREATE TABLE app.Sites (
    site_id INT PRIMARY KEY,
    name NVARCHAR(100) NOT NULL,
    store_id INT NULL,
    form_title NVARCHAR(200) NULL,
    street NVARCHAR(200) NULL,
    city NVARCHAR(80) NOT NULL,
    state CHAR(2) NOT NULL,
    zip CHAR(5) NULL,
    phone NVARCHAR(20) NULL,
    street_l NVARCHAR(200) NULL, -- Street line (alternate/full address)
    pdi_name NVARCHAR(100) NULL,
    email NVARCHAR(255) NULL,
    caribou_id NVARCHAR(20) NULL,
    fuel_dispensers BIT NOT NULL DEFAULT 0,
    tz NVARCHAR(40) NOT NULL DEFAULT 'America/Chicago',
    calendar_id INT NULL,
    created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

-- Backfill missing columns for Sites if table existed from earlier minimal schema
IF OBJECT_ID('app.Sites','U') IS NOT NULL
BEGIN
    IF COL_LENGTH('app.Sites','store_id') IS NULL ALTER TABLE app.Sites ADD store_id INT NULL;
    IF COL_LENGTH('app.Sites','form_title') IS NULL ALTER TABLE app.Sites ADD form_title NVARCHAR(200) NULL;
    IF COL_LENGTH('app.Sites','street') IS NULL ALTER TABLE app.Sites ADD street NVARCHAR(200) NULL;
    IF COL_LENGTH('app.Sites','zip') IS NULL ALTER TABLE app.Sites ADD zip CHAR(5) NULL;
    IF COL_LENGTH('app.Sites','phone') IS NULL ALTER TABLE app.Sites ADD phone NVARCHAR(20) NULL;
    IF COL_LENGTH('app.Sites','street_l') IS NULL ALTER TABLE app.Sites ADD street_l NVARCHAR(200) NULL;
    IF COL_LENGTH('app.Sites','pdi_name') IS NULL ALTER TABLE app.Sites ADD pdi_name NVARCHAR(100) NULL;
    IF COL_LENGTH('app.Sites','email') IS NULL ALTER TABLE app.Sites ADD email NVARCHAR(255) NULL;
    IF COL_LENGTH('app.Sites','caribou_id') IS NULL ALTER TABLE app.Sites ADD caribou_id NVARCHAR(20) NULL;
    IF COL_LENGTH('app.Sites','fuel_dispensers') IS NULL ALTER TABLE app.Sites ADD fuel_dispensers BIT NOT NULL DEFAULT 0;
    IF COL_LENGTH('app.Sites','tz') IS NULL ALTER TABLE app.Sites ADD tz NVARCHAR(40) NOT NULL DEFAULT 'America/Chicago';
    IF COL_LENGTH('app.Sites','calendar_id') IS NULL ALTER TABLE app.Sites ADD calendar_id INT NULL;
    IF COL_LENGTH('app.Sites','created_at') IS NULL ALTER TABLE app.Sites ADD created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME();
END
GO

IF OBJECT_ID('app.Zones','U') IS NULL
CREATE TABLE app.Zones (
    zone_id INT IDENTITY(1,1) PRIMARY KEY,
    site_id INT NOT NULL,
    label NVARCHAR(60) NOT NULL,
    CONSTRAINT UQ_Zones UNIQUE(site_id, label),
    FOREIGN KEY(site_id) REFERENCES app.Sites(site_id)
);
GO

IF OBJECT_ID('app.ZoneAdjacency','U') IS NULL
CREATE TABLE app.ZoneAdjacency (
    zone_id INT NOT NULL,
    adj_zone_id INT NOT NULL,
    PRIMARY KEY(zone_id, adj_zone_id),
    FOREIGN KEY(zone_id) REFERENCES app.Zones(zone_id),
    FOREIGN KEY(adj_zone_id) REFERENCES app.Zones(zone_id),
    CONSTRAINT CK_ZoneAdj_SelfLoop CHECK (zone_id <> adj_zone_id)
);
GO

-- Enforce unordered pair uniqueness for symmetry
-- Enforce unordered pair uniqueness for symmetry (computed columns for index)
IF COL_LENGTH('app.ZoneAdjacency', 'zone_id_lo') IS NULL
BEGIN
    ALTER TABLE app.ZoneAdjacency ADD zone_id_lo AS (CASE WHEN zone_id < adj_zone_id THEN zone_id ELSE adj_zone_id END) PERSISTED;
    ALTER TABLE app.ZoneAdjacency ADD zone_id_hi AS (CASE WHEN zone_id < adj_zone_id THEN adj_zone_id ELSE zone_id END) PERSISTED;
END
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UQ_ZoneAdj_UnorderedPair')
    CREATE UNIQUE INDEX UQ_ZoneAdj_UnorderedPair ON app.ZoneAdjacency(zone_id_lo, zone_id_hi);
GO
GO

IF OBJECT_ID('app.Assets','U') IS NULL
CREATE TABLE app.Assets (
    asset_id INT PRIMARY KEY,
    site_id INT NOT NULL,
    zone_id INT NULL,
    type NVARCHAR(40) NOT NULL,
    model NVARCHAR(80) NOT NULL,
    vendor NVARCHAR(80) NOT NULL,
    serial NVARCHAR(80) NULL,
    installed_at DATETIME2(3) NULL
);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Assets_Site')
    ALTER TABLE app.Assets ADD CONSTRAINT FK_Assets_Site FOREIGN KEY(site_id) REFERENCES app.Sites(site_id);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Assets_Zone')
    ALTER TABLE app.Assets ADD CONSTRAINT FK_Assets_Zone FOREIGN KEY(zone_id) REFERENCES app.Zones(zone_id);
GO
-- Unique index for serial (filtered)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UQ_AssetSerial')
    CREATE UNIQUE INDEX UQ_AssetSerial ON app.Assets(site_id, serial) WHERE serial IS NOT NULL;
GO
CREATE NONCLUSTERED INDEX IX_Assets_SiteType ON app.Assets(site_id, type);
CREATE NONCLUSTERED INDEX IX_Assets_ZoneId ON app.Assets(zone_id);
GO

-- CodeMap
IF OBJECT_ID('app.CodeMap','U') IS NULL
CREATE TABLE app.CodeMap (
    source NVARCHAR(40) NOT NULL,
    vendor_code NVARCHAR(120) NOT NULL,
    canonical_code NVARCHAR(60) NOT NULL,
    canonical_level NVARCHAR(20) NOT NULL,
    PRIMARY KEY(source, vendor_code)
);
GO

-- Events
IF OBJECT_ID('app.Events','U') IS NULL
CREATE TABLE app.Events (
    event_id CHAR(26) PRIMARY KEY,
    site_id INT NOT NULL,
    asset_id INT NOT NULL,
    source NVARCHAR(40) NOT NULL,
    vendor_code NVARCHAR(120) NOT NULL,
    canonical_code NVARCHAR(60) NOT NULL,
    level NVARCHAR(20) NOT NULL,
    message NVARCHAR(MAX) NOT NULL,
    occurred_at DATETIME2(3) NOT NULL,
    created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    rowversion ROWVERSION,
    FOREIGN KEY(site_id) REFERENCES app.Sites(site_id),
    FOREIGN KEY(asset_id) REFERENCES app.Assets(asset_id)
);
GO

CREATE NONCLUSTERED INDEX IX_Events_CanonCode_OccurredAt ON app.Events(canonical_code, occurred_at);
CREATE NONCLUSTERED INDEX IX_Events_AssetId_OccurredAt ON app.Events(asset_id, occurred_at);
GO

-- Alerts
IF OBJECT_ID('app.Alerts','U') IS NULL
CREATE TABLE app.Alerts (
    alert_id CHAR(26) PRIMARY KEY,
    event_id CHAR(26) NOT NULL UNIQUE,
    [rule] NVARCHAR(120) NOT NULL,
    priority INT NOT NULL,
    raised_at DATETIME2(3) NOT NULL,
    acknowledged_by INT NULL,
    acknowledged_at DATETIME2(3) NULL
);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Alerts_Event')
    ALTER TABLE app.Alerts ADD CONSTRAINT FK_Alerts_Event FOREIGN KEY(event_id) REFERENCES app.Events(event_id);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Alerts_AckBy')
    ALTER TABLE app.Alerts ADD CONSTRAINT FK_Alerts_AckBy FOREIGN KEY(acknowledged_by) REFERENCES app.Users(user_id);
GO
-- Filtered index for recent alerts (use static date for idempotency)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Alerts_Recent')
BEGIN
    DECLARE @cutoff DATETIME2(3) = DATEADD(day,-60, SYSUTCDATETIME());
    DECLARE @sql NVARCHAR(MAX) = N'CREATE NONCLUSTERED INDEX IX_Alerts_Recent ON app.Alerts(raised_at) WHERE raised_at >= '''
        + CONVERT(NVARCHAR(33), @cutoff, 126) + N'''';
    EXEC(@sql);
END
GO

-- Tickets
IF OBJECT_ID('app.Tickets','U') IS NULL
-- Ensure SLAPlans exists before Tickets due to FK
IF OBJECT_ID('app.SLAPlans','U') IS NULL
CREATE TABLE app.SLAPlans (
    sla_plan_id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(60) NOT NULL UNIQUE,
    target_hours INT NOT NULL,
    business_hours BIT NOT NULL DEFAULT 1
);
GO

CREATE TABLE app.Tickets (
    ticket_id INT IDENTITY(1,1) PRIMARY KEY,
    ticket_no AS ('OG-' + RIGHT('0000000' + CAST(ticket_id AS VARCHAR(7)), 7)) PERSISTED UNIQUE,
    external_ref NVARCHAR(60) NULL,
    status NVARCHAR(30) NOT NULL,
    substatus_code NVARCHAR(60) NULL,
    severity TINYINT NOT NULL,
    category_id INT NULL,
    summary NVARCHAR(240) NOT NULL,
    description NVARCHAR(MAX) NULL,
    site_id INT NOT NULL,
    created_by INT NULL,
    assignee_user_id INT NULL,
    team_id INT NULL,
    vendor_id INT NULL,
    due_at DATETIME2(3) NULL,
    sla_plan_id INT NULL,
    created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    rowversion ROWVERSION,
    FOREIGN KEY(site_id) REFERENCES app.Sites(site_id),
    FOREIGN KEY(created_by) REFERENCES app.Users(user_id),
    FOREIGN KEY(assignee_user_id) REFERENCES app.Users(user_id),
    FOREIGN KEY(team_id) REFERENCES app.Teams(team_id),
    FOREIGN KEY(vendor_id) REFERENCES app.Vendors(vendor_id),
    FOREIGN KEY(category_id) REFERENCES app.Categories(category_id),
    FOREIGN KEY(sla_plan_id) REFERENCES app.SLAPlans(sla_plan_id)
);
GO

CREATE NONCLUSTERED INDEX IX_Tickets_Open ON app.Tickets(site_id, status, updated_at DESC) WHERE status IN ('Open','In Progress','Pending');
GO

-- TicketAssets
IF OBJECT_ID('app.TicketAssets','U') IS NULL
CREATE TABLE app.TicketAssets (
    ticket_id INT NOT NULL,
    asset_id INT NOT NULL,
    PRIMARY KEY(ticket_id, asset_id),
    FOREIGN KEY(ticket_id) REFERENCES app.Tickets(ticket_id),
    FOREIGN KEY(asset_id) REFERENCES app.Assets(asset_id)
);
GO

-- TicketStatusHistory
IF OBJECT_ID('app.TicketStatusHistory','U') IS NULL
CREATE TABLE app.TicketStatusHistory (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    ticket_id INT NOT NULL,
    old_status NVARCHAR(30) NOT NULL,
    new_status NVARCHAR(30) NOT NULL,
    changed_by INT NULL,
    changed_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    note NVARCHAR(400) NULL,
    FOREIGN KEY(ticket_id) REFERENCES app.Tickets(ticket_id),
    FOREIGN KEY(changed_by) REFERENCES app.Users(user_id)
);
GO

-- TicketComments
IF OBJECT_ID('app.TicketComments','U') IS NULL
CREATE TABLE app.TicketComments (
    comment_id BIGINT IDENTITY(1,1) PRIMARY KEY,
    ticket_id INT NOT NULL,
    author_id INT NULL,
    body NVARCHAR(MAX) NOT NULL,
    visibility NVARCHAR(16) NOT NULL DEFAULT 'public',
    created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    FOREIGN KEY(ticket_id) REFERENCES app.Tickets(ticket_id),
    FOREIGN KEY(author_id) REFERENCES app.Users(user_id)
);
GO

-- Attachments
IF OBJECT_ID('app.Attachments','U') IS NULL
CREATE TABLE app.Attachments (
    attachment_id BIGINT IDENTITY(1,1) PRIMARY KEY,
    ticket_id INT NOT NULL,
    uri NVARCHAR(400) NOT NULL,
    kind NVARCHAR(40) NOT NULL DEFAULT 'other',
    mime_type NVARCHAR(80) NULL,
    size_bytes BIGINT NULL CHECK(size_bytes >= 0),
    content_sha256 BINARY(32) NULL,
    uploaded_by INT NULL,
    created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME()
);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Attachments_Ticket')
    ALTER TABLE app.Attachments ADD CONSTRAINT FK_Attachments_Ticket FOREIGN KEY(ticket_id) REFERENCES app.Tickets(ticket_id);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Attachments_UploadedBy')
    ALTER TABLE app.Attachments ADD CONSTRAINT FK_Attachments_UploadedBy FOREIGN KEY(uploaded_by) REFERENCES app.Users(user_id);
GO
-- Unique index for content_sha256 (filtered)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UQ_Attachments_ContentSHA256')
    CREATE UNIQUE INDEX UQ_Attachments_ContentSHA256 ON app.Attachments(content_sha256) WHERE content_sha256 IS NOT NULL;
GO

-- Extend attachments to support vendor and asset links (idempotent)
IF COL_LENGTH('app.Attachments','vendor_id') IS NULL
    ALTER TABLE app.Attachments ADD vendor_id INT NULL;
IF COL_LENGTH('app.Attachments','asset_id') IS NULL
    ALTER TABLE app.Attachments ADD asset_id INT NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Attachments_Vendor')
    ALTER TABLE app.Attachments ADD CONSTRAINT FK_Attachments_Vendor FOREIGN KEY(vendor_id) REFERENCES app.Vendors(vendor_id);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Attachments_Asset')
    ALTER TABLE app.Attachments ADD CONSTRAINT FK_Attachments_Asset FOREIGN KEY(asset_id) REFERENCES app.Assets(asset_id);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Attachments_Vendor')
    CREATE NONCLUSTERED INDEX IX_Attachments_Vendor ON app.Attachments(vendor_id) WHERE vendor_id IS NOT NULL;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Attachments_Asset')
    CREATE NONCLUSTERED INDEX IX_Attachments_Asset ON app.Attachments(asset_id) WHERE asset_id IS NOT NULL;
GO

-- TicketAssignments
IF OBJECT_ID('app.TicketAssignments','U') IS NULL
CREATE TABLE app.TicketAssignments (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    ticket_id INT NOT NULL,
    user_id INT NULL,
    team_id INT NULL,
    assigned_by INT NULL,
    assigned_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    FOREIGN KEY(ticket_id) REFERENCES app.Tickets(ticket_id),
    FOREIGN KEY(user_id) REFERENCES app.Users(user_id),
    FOREIGN KEY(team_id) REFERENCES app.Teams(team_id),
    FOREIGN KEY(assigned_by) REFERENCES app.Users(user_id)
);
GO

-- SLAPlans block moved above Tickets

-- TicketSLAs
IF OBJECT_ID('app.TicketSLAs','U') IS NULL
CREATE TABLE app.TicketSLAs (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    ticket_id INT NOT NULL,
    sla_plan_id INT NOT NULL,
    target_at DATETIME2(3) NOT NULL,
    breached BIT NOT NULL DEFAULT 0,
    computed_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    FOREIGN KEY(ticket_id) REFERENCES app.Tickets(ticket_id),
    FOREIGN KEY(sla_plan_id) REFERENCES app.SLAPlans(sla_plan_id)
);
GO

-- Tags
IF OBJECT_ID('app.Tags','U') IS NULL
CREATE TABLE app.Tags (
    tag_id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(60) NOT NULL UNIQUE
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

-- TicketLinks
IF OBJECT_ID('app.TicketLinks','U') IS NULL
CREATE TABLE app.TicketLinks (
    link_id BIGINT IDENTITY(1,1) PRIMARY KEY,
    src_ticket_id INT NOT NULL,
    dst_ticket_id INT NOT NULL,
    kind NVARCHAR(30) NOT NULL CHECK(kind IN('duplicate','related','parent','child')),
    created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    FOREIGN KEY(src_ticket_id) REFERENCES app.Tickets(ticket_id),
    FOREIGN KEY(dst_ticket_id) REFERENCES app.Tickets(ticket_id)
);
GO

-- TicketWatchers
IF OBJECT_ID('app.TicketWatchers','U') IS NULL
CREATE TABLE app.TicketWatchers (
    ticket_id INT NOT NULL,
    user_id INT NOT NULL,
    PRIMARY KEY(ticket_id, user_id),
    FOREIGN KEY(ticket_id) REFERENCES app.Tickets(ticket_id),
    FOREIGN KEY(user_id) REFERENCES app.Users(user_id)
);
GO

-- TicketWorklogs
IF OBJECT_ID('app.TicketWorklogs','U') IS NULL
CREATE TABLE app.TicketWorklogs (
    worklog_id BIGINT IDENTITY(1,1) PRIMARY KEY,
    ticket_id INT NOT NULL,
    user_id INT NULL,
    minutes_spent INT NOT NULL CHECK(minutes_spent > 0),
    activity NVARCHAR(120) NOT NULL,
    billable BIT NOT NULL DEFAULT 0,
    created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    FOREIGN KEY(ticket_id) REFERENCES app.Tickets(ticket_id),
    FOREIGN KEY(user_id) REFERENCES app.Users(user_id)
);
GO

-- Minimal seed data (if absent)
-- Coffee Cup Travel Plaza Sites
IF NOT EXISTS (SELECT 1 FROM app.Sites WHERE site_id = 1)
INSERT INTO app.Sites (site_id, name, store_id, form_title, street, city, state, zip, phone, street_l, pdi_name, email, caribou_id, fuel_dispensers, tz) 
VALUES (1, N'Vermillion', 1006, N'Coffee Cup Travel Plaza - Burbank', NULL, N'Burbank', N'SD', N'57010', N'6056242062', N'47051 SD-50', N'Vermillion', N'store1006@heinzcorps.com', N'8204', 1, N'America/Chicago');

IF NOT EXISTS (SELECT 1 FROM app.Sites WHERE site_id = 2)
INSERT INTO app.Sites (site_id, name, store_id, form_title, street, city, state, zip, phone, street_l, pdi_name, email, caribou_id, fuel_dispensers, tz) 
VALUES (2, N'Steele', 1002, N'Coffee Cup Travel Plaza - Steele', NULL, N'Steele', N'ND', N'58482', N'7014752274', N'620 Mitchell Ave N', N'Steele', N'store1002@heinzcorps.com', N'8427', 1, N'America/Chicago');

IF NOT EXISTS (SELECT 1 FROM app.Sites WHERE site_id = 3)
INSERT INTO app.Sites (site_id, name, store_id, form_title, street, city, state, zip, phone, street_l, pdi_name, email, caribou_id, fuel_dispensers, tz) 
VALUES (3, N'Summit', 1001, N'Coffee Cup Travel Plaza - Summit', N'45789 US-12', N'Summit', N'SD', N'57266', N'6053986493', N'45789 US-12', N'Summit', N'store1001@heinzcorps.com', N'8299', 1, N'America/Chicago');

IF NOT EXISTS (SELECT 1 FROM app.Sites WHERE site_id = 4)
INSERT INTO app.Sites (site_id, name, store_id, form_title, street, city, state, zip, phone, street_l, pdi_name, email, caribou_id, fuel_dispensers, tz) 
VALUES (4, N'SummitShop', 1021, N'TA Truck Service Center - Summit SD', NULL, N'Summit', N'SD', N'57266', NULL, N'45789 US-12', N'Summit Shop', N'shop1021@heinzcorps.com', NULL, 0, N'America/Chicago');

IF NOT EXISTS (SELECT 1 FROM app.Sites WHERE site_id = 5)
INSERT INTO app.Sites (site_id, name, store_id, form_title, street, city, state, zip, phone, street_l, pdi_name, email, caribou_id, fuel_dispensers, tz) 
VALUES (5, N'Hot Springs', 1009, N'Coffee Cup Travel Plaza - Hot Springs', NULL, N'Hot Springs', N'SD', N'57747', N'6057454215', N'27638 US-385', N'Hot Springs', N'store1009@heinzcorps.com', NULL, 1, N'America/Chicago');

IF NOT EXISTS (SELECT 1 FROM app.Sites WHERE site_id = 6)
INSERT INTO app.Sites (site_id, name, store_id, form_title, street, city, state, zip, phone, street_l, pdi_name, email, caribou_id, fuel_dispensers, tz) 
VALUES (6, N'Corporate', 1000, N'Coffee Cup Travel Plaza - Corporate Office', NULL, N'Sioux Falls', N'SD', N'57106', N'6052742540', N'2508 S Carolyn Ave', N'HH Admin', N'bbeeken@heinzcorps.com', NULL, 0, N'America/Chicago');

IF NOT EXISTS (SELECT 1 FROM app.Sites WHERE site_id = 7)
INSERT INTO app.Sites (site_id, name, store_id, form_title, street, city, state, zip, phone, street_l, pdi_name, email, caribou_id, fuel_dispensers, tz) 
VALUES (7, N'Heinz Retail Estate', 2000, N'Heinz Real Estate', NULL, N'Sioux Falls', N'SD', N'57106', N'6052742540', N'2508 S Carolyn Ave', N'HRE', N'hre@heinzcorps.com', NULL, 0, N'America/Chicago');

-- Legacy site for backwards compatibility (keeping site_id 1006 referenced elsewhere)
IF NOT EXISTS (SELECT 1 FROM app.Sites WHERE site_id = 1006)
INSERT INTO app.Sites (site_id, name, store_id, form_title, street, city, state, zip, phone, street_l, pdi_name, email, caribou_id, fuel_dispensers, tz) 
VALUES (1006, N'Vermillion', 1006, N'Coffee Cup Travel Plaza - Burbank', NULL, N'Burbank', N'SD', N'57010', N'6056242062', N'47051 SD-50', N'Vermillion', N'store1006@heinzcorps.com', N'8204', 1, N'America/Chicago');

IF NOT EXISTS (SELECT 1 FROM app.Zones WHERE site_id = 1006 AND label = N'Island A')
INSERT INTO app.Zones (site_id, label) VALUES (1006, N'Island A');
IF NOT EXISTS (SELECT 1 FROM app.Zones WHERE site_id = 1006 AND label = N'Island B')
INSERT INTO app.Zones (site_id, label) VALUES (1006, N'Island B');
IF NOT EXISTS (SELECT 1 FROM app.Zones WHERE site_id = 1006 AND label = N'Island C')
INSERT INTO app.Zones (site_id, label) VALUES (1006, N'Island C');

-- Get zone_ids for adjacency/asset seeds
DECLARE @zoneA INT = (SELECT zone_id FROM app.Zones WHERE site_id=1006 AND label=N'Island A');
DECLARE @zoneB INT = (SELECT zone_id FROM app.Zones WHERE site_id=1006 AND label=N'Island B');
DECLARE @zoneC INT = (SELECT zone_id FROM app.Zones WHERE site_id=1006 AND label=N'Island C');

-- ZoneAdjacency: B<->A, B<->C (unidirectional due to computed columns enforcing unique pairs)
IF NOT EXISTS (SELECT 1 FROM app.ZoneAdjacency WHERE 
    (zone_id=@zoneB AND adj_zone_id=@zoneA) OR (zone_id=@zoneA AND adj_zone_id=@zoneB))
INSERT INTO app.ZoneAdjacency (zone_id, adj_zone_id) VALUES (@zoneB, @zoneA);
IF NOT EXISTS (SELECT 1 FROM app.ZoneAdjacency WHERE 
    (zone_id=@zoneB AND adj_zone_id=@zoneC) OR (zone_id=@zoneC AND adj_zone_id=@zoneB))
INSERT INTO app.ZoneAdjacency (zone_id, adj_zone_id) VALUES (@zoneB, @zoneC);

-- Assets: 555 ATG (Island B), 321 & 322 Dispensers (Island A)
IF NOT EXISTS (SELECT 1 FROM app.Assets WHERE asset_id=555)
INSERT INTO app.Assets (asset_id, site_id, zone_id, type, model, vendor) VALUES (555, 1006, @zoneB, N'ATG', N'Veeder-Root TLS-450', N'Franklin');
IF NOT EXISTS (SELECT 1 FROM app.Assets WHERE asset_id=321)
INSERT INTO app.Assets (asset_id, site_id, zone_id, type, model, vendor) VALUES (321, 1006, @zoneA, N'Dispenser', N'Encore 700', N'Gilbarco');
IF NOT EXISTS (SELECT 1 FROM app.Assets WHERE asset_id=322)
INSERT INTO app.Assets (asset_id, site_id, zone_id, type, model, vendor) VALUES (322, 1006, @zoneA, N'Dispenser', N'Encore 700', N'Gilbarco');

-- CodeMap
IF NOT EXISTS (SELECT 1 FROM app.CodeMap WHERE source='franklin' AND vendor_code='ATG_COMM_ERR')
INSERT INTO app.CodeMap (source, vendor_code, canonical_code, canonical_level) VALUES ('franklin','ATG_COMM_ERR','COMMS_LOSS','critical');
IF NOT EXISTS (SELECT 1 FROM app.CodeMap WHERE source='insite360' AND vendor_code='FLOW_FAULT')
INSERT INTO app.CodeMap (source, vendor_code, canonical_code, canonical_level) VALUES ('insite360','FLOW_FAULT','FLOW_FAULT','major');
