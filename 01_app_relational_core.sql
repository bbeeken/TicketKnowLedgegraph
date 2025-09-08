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
    city NVARCHAR(80) NOT NULL,
    state CHAR(2) NOT NULL,
    tz NVARCHAR(40) NOT NULL,
    calendar_id INT NULL,
    created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME()
);
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
ALTER TABLE app.Assets ADD CONSTRAINT FK_Assets_Site FOREIGN KEY(site_id) REFERENCES app.Sites(site_id);
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
ALTER TABLE app.Alerts ADD CONSTRAINT FK_Alerts_Event FOREIGN KEY(event_id) REFERENCES app.Events(event_id);
ALTER TABLE app.Alerts ADD CONSTRAINT FK_Alerts_AckBy FOREIGN KEY(acknowledged_by) REFERENCES app.Users(user_id);
GO
-- Filtered index for recent alerts (use static date for idempotency)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Alerts_Recent')
    EXEC('CREATE NONCLUSTERED INDEX IX_Alerts_Recent ON app.Alerts(raised_at) WHERE raised_at >= DATEADD(day,-60, SYSUTCDATETIME())');
GO

-- Tickets
IF OBJECT_ID('app.Tickets','U') IS NULL
CREATE TABLE app.Tickets (
    ticket_id INT IDENTITY(1,1) PRIMARY KEY,
    ticket_no AS CONCAT('OG-',FORMAT(ticket_id,'D7')) PERSISTED UNIQUE,
    external_ref NVARCHAR(60) NULL,
    status NVARCHAR(30) NOT NULL,
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
ALTER TABLE app.Attachments ADD CONSTRAINT FK_Attachments_Ticket FOREIGN KEY(ticket_id) REFERENCES app.Tickets(ticket_id);
ALTER TABLE app.Attachments ADD CONSTRAINT FK_Attachments_UploadedBy FOREIGN KEY(uploaded_by) REFERENCES app.Users(user_id);
GO
-- Unique index for content_sha256 (filtered)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UQ_Attachments_ContentSHA256')
    CREATE UNIQUE INDEX UQ_Attachments_ContentSHA256 ON app.Attachments(content_sha256) WHERE content_sha256 IS NOT NULL;
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

-- SLAPlans
IF OBJECT_ID('app.SLAPlans','U') IS NULL
CREATE TABLE app.SLAPlans (
    sla_plan_id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(60) NOT NULL UNIQUE,
    target_hours INT NOT NULL,
    business_hours BIT NOT NULL DEFAULT 1
);
GO

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
IF NOT EXISTS (SELECT 1 FROM app.Sites WHERE site_id = 1006)
INSERT INTO app.Sites (site_id, name, city, state, tz, created_at) VALUES (1006, N'Vermillion', N'Vermillion', N'SD', N'America/Chicago', SYSUTCDATETIME());

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

-- ZoneAdjacency: B<->A, B<->C (both directions)
IF NOT EXISTS (SELECT 1 FROM app.ZoneAdjacency WHERE zone_id=@zoneB AND adj_zone_id=@zoneA)
INSERT INTO app.ZoneAdjacency (zone_id, adj_zone_id) VALUES (@zoneB, @zoneA);
IF NOT EXISTS (SELECT 1 FROM app.ZoneAdjacency WHERE zone_id=@zoneA AND adj_zone_id=@zoneB)
INSERT INTO app.ZoneAdjacency (zone_id, adj_zone_id) VALUES (@zoneA, @zoneB);
IF NOT EXISTS (SELECT 1 FROM app.ZoneAdjacency WHERE zone_id=@zoneB AND adj_zone_id=@zoneC)
INSERT INTO app.ZoneAdjacency (zone_id, adj_zone_id) VALUES (@zoneB, @zoneC);
IF NOT EXISTS (SELECT 1 FROM app.ZoneAdjacency WHERE zone_id=@zoneC AND adj_zone_id=@zoneB)
INSERT INTO app.ZoneAdjacency (zone_id, adj_zone_id) VALUES (@zoneC, @zoneB);

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
