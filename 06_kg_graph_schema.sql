-- 06_kg_graph_schema.sql
-- Knowledge Graph schema (SQL Graph)
USE [OpsGraph];
GO

-- Nodes
IF OBJECT_ID('kg.Site','U') IS NULL
CREATE TABLE kg.Site (
    site_id INT PRIMARY KEY,
    name NVARCHAR(100) NOT NULL,
    city NVARCHAR(80) NULL,
    state CHAR(2) NULL
) AS NODE;
GO

IF OBJECT_ID('kg.Zone','U') IS NULL
CREATE TABLE kg.Zone (
    zone_id INT PRIMARY KEY,
    site_id INT NOT NULL,
    label NVARCHAR(60) NOT NULL
) AS NODE;
GO

IF OBJECT_ID('kg.Asset','U') IS NULL
CREATE TABLE kg.Asset (
    asset_id INT PRIMARY KEY,
    site_id INT NOT NULL,
    type NVARCHAR(40) NOT NULL,
    model NVARCHAR(80) NOT NULL,
    vendor NVARCHAR(80) NULL,
    serial NVARCHAR(80) NULL
) AS NODE;
GO

IF OBJECT_ID('kg.Event','U') IS NULL
CREATE TABLE kg.Event (
    event_id CHAR(26) PRIMARY KEY,
    occurred_at DATETIME2(3) NOT NULL,
    source NVARCHAR(40) NOT NULL,
    code NVARCHAR(60) NOT NULL,
    level NVARCHAR(20) NOT NULL,
    message NVARCHAR(4000) NOT NULL
) AS NODE;
GO

IF OBJECT_ID('kg.Alert','U') IS NULL
CREATE TABLE kg.Alert (
    alert_id CHAR(26) PRIMARY KEY,
    raised_at DATETIME2(3) NOT NULL,
    rule_name NVARCHAR(120) NOT NULL,
    priority INT NOT NULL
) AS NODE;
GO

IF OBJECT_ID('kg.Ticket','U') IS NULL
CREATE TABLE kg.Ticket (
    ticket_id INT PRIMARY KEY,
    status NVARCHAR(30) NOT NULL,
    created_at DATETIME2(3) NOT NULL,
    severity INT NOT NULL,
    category NVARCHAR(60) NOT NULL,
    summary NVARCHAR(240) NOT NULL
) AS NODE;
GO

-- Edges
IF OBJECT_ID('kg.HAS_ZONE','U') IS NULL
CREATE TABLE kg.HAS_ZONE AS EDGE;
GO
IF OBJECT_ID('kg.HAS_ASSET','U') IS NULL
CREATE TABLE kg.HAS_ASSET AS EDGE;
GO
IF OBJECT_ID('kg.IN_ZONE','U') IS NULL
CREATE TABLE kg.IN_ZONE AS EDGE;
GO
IF OBJECT_ID('kg.ADJACENT_TO','U') IS NULL
CREATE TABLE kg.ADJACENT_TO AS EDGE;
GO
IF OBJECT_ID('kg.ON_ASSET','U') IS NULL
CREATE TABLE kg.ON_ASSET AS EDGE;
GO
IF OBJECT_ID('kg.LOCATED_AT','U') IS NULL
CREATE TABLE kg.LOCATED_AT AS EDGE;
GO
IF OBJECT_ID('kg.PROMOTED_TO','U') IS NULL
CREATE TABLE kg.PROMOTED_TO AS EDGE;
GO
IF OBJECT_ID('kg.CREATED_TICKET','U') IS NULL
CREATE TABLE kg.CREATED_TICKET AS EDGE;
GO
IF OBJECT_ID('kg.RELATES_TO','U') IS NULL
CREATE TABLE kg.RELATES_TO AS EDGE;
GO

-- Seed graph to mirror app seeds
-- Site 1006, Zones, Assets, Adjacency
IF NOT EXISTS (SELECT 1 FROM kg.Site WHERE site_id=1006)
INSERT INTO kg.Site (site_id, name, city, state) VALUES (1006, N'Vermillion', N'Vermillion', N'SD');

DECLARE @zoneA INT = (SELECT zone_id FROM app.Zones WHERE site_id=1006 AND label=N'Island A');
DECLARE @zoneB INT = (SELECT zone_id FROM app.Zones WHERE site_id=1006 AND label=N'Island B');
DECLARE @zoneC INT = (SELECT zone_id FROM app.Zones WHERE site_id=1006 AND label=N'Island C');

IF NOT EXISTS (SELECT 1 FROM kg.Zone WHERE zone_id=@zoneA)
INSERT INTO kg.Zone (zone_id, site_id, label) VALUES (@zoneA, 1006, N'Island A');
IF NOT EXISTS (SELECT 1 FROM kg.Zone WHERE zone_id=@zoneB)
INSERT INTO kg.Zone (zone_id, site_id, label) VALUES (@zoneB, 1006, N'Island B');
IF NOT EXISTS (SELECT 1 FROM kg.Zone WHERE zone_id=@zoneC)
INSERT INTO kg.Zone (zone_id, site_id, label) VALUES (@zoneC, 1006, N'Island C');

-- HAS_ZONE edges
IF NOT EXISTS (SELECT 1 FROM kg.HAS_ZONE WHERE $from_id = (SELECT $node_id FROM kg.Site WHERE site_id=1006) AND $to_id = (SELECT $node_id FROM kg.Zone WHERE zone_id=@zoneA))
INSERT INTO kg.HAS_ZONE ($from_id, $to_id) VALUES ((SELECT $node_id FROM kg.Site WHERE site_id=1006), (SELECT $node_id FROM kg.Zone WHERE zone_id=@zoneA));
IF NOT EXISTS (SELECT 1 FROM kg.HAS_ZONE WHERE $from_id = (SELECT $node_id FROM kg.Site WHERE site_id=1006) AND $to_id = (SELECT $node_id FROM kg.Zone WHERE zone_id=@zoneB))
INSERT INTO kg.HAS_ZONE ($from_id, $to_id) VALUES ((SELECT $node_id FROM kg.Site WHERE site_id=1006), (SELECT $node_id FROM kg.Zone WHERE zone_id=@zoneB));
IF NOT EXISTS (SELECT 1 FROM kg.HAS_ZONE WHERE $from_id = (SELECT $node_id FROM kg.Site WHERE site_id=1006) AND $to_id = (SELECT $node_id FROM kg.Zone WHERE zone_id=@zoneC))
INSERT INTO kg.HAS_ZONE ($from_id, $to_id) VALUES ((SELECT $node_id FROM kg.Site WHERE site_id=1006), (SELECT $node_id FROM kg.Zone WHERE zone_id=@zoneC));

-- Assets
IF NOT EXISTS (SELECT 1 FROM kg.Asset WHERE asset_id=555)
INSERT INTO kg.Asset (asset_id, site_id, type, model, vendor, serial) SELECT asset_id, site_id, type, model, vendor, serial FROM app.Assets WHERE asset_id=555;
IF NOT EXISTS (SELECT 1 FROM kg.Asset WHERE asset_id=321)
INSERT INTO kg.Asset (asset_id, site_id, type, model, vendor, serial) SELECT asset_id, site_id, type, model, vendor, serial FROM app.Assets WHERE asset_id=321;
IF NOT EXISTS (SELECT 1 FROM kg.Asset WHERE asset_id=322)
INSERT INTO kg.Asset (asset_id, site_id, type, model, vendor, serial) SELECT asset_id, site_id, type, model, vendor, serial FROM app.Assets WHERE asset_id=322;

-- HAS_ASSET edges
IF NOT EXISTS (SELECT 1 FROM kg.HAS_ASSET WHERE $from_id = (SELECT $node_id FROM kg.Site WHERE site_id=1006) AND $to_id = (SELECT $node_id FROM kg.Asset WHERE asset_id=555))
INSERT INTO kg.HAS_ASSET ($from_id, $to_id) VALUES ((SELECT $node_id FROM kg.Site WHERE site_id=1006), (SELECT $node_id FROM kg.Asset WHERE asset_id=555));
IF NOT EXISTS (SELECT 1 FROM kg.HAS_ASSET WHERE $from_id = (SELECT $node_id FROM kg.Site WHERE site_id=1006) AND $to_id = (SELECT $node_id FROM kg.Asset WHERE asset_id=321))
INSERT INTO kg.HAS_ASSET ($from_id, $to_id) VALUES ((SELECT $node_id FROM kg.Site WHERE site_id=1006), (SELECT $node_id FROM kg.Asset WHERE asset_id=321));
IF NOT EXISTS (SELECT 1 FROM kg.HAS_ASSET WHERE $from_id = (SELECT $node_id FROM kg.Site WHERE site_id=1006) AND $to_id = (SELECT $node_id FROM kg.Asset WHERE asset_id=322))
INSERT INTO kg.HAS_ASSET ($from_id, $to_id) VALUES ((SELECT $node_id FROM kg.Site WHERE site_id=1006), (SELECT $node_id FROM kg.Asset WHERE asset_id=322));

-- IN_ZONE edges
IF NOT EXISTS (SELECT 1 FROM kg.IN_ZONE WHERE $from_id = (SELECT $node_id FROM kg.Asset WHERE asset_id=555) AND $to_id = (SELECT $node_id FROM kg.Zone WHERE zone_id=@zoneB))
INSERT INTO kg.IN_ZONE ($from_id, $to_id) VALUES ((SELECT $node_id FROM kg.Asset WHERE asset_id=555), (SELECT $node_id FROM kg.Zone WHERE zone_id=@zoneB));
IF NOT EXISTS (SELECT 1 FROM kg.IN_ZONE WHERE $from_id = (SELECT $node_id FROM kg.Asset WHERE asset_id=321) AND $to_id = (SELECT $node_id FROM kg.Zone WHERE zone_id=@zoneA))
INSERT INTO kg.IN_ZONE ($from_id, $to_id) VALUES ((SELECT $node_id FROM kg.Asset WHERE asset_id=321), (SELECT $node_id FROM kg.Zone WHERE zone_id=@zoneA));
IF NOT EXISTS (SELECT 1 FROM kg.IN_ZONE WHERE $from_id = (SELECT $node_id FROM kg.Asset WHERE asset_id=322) AND $to_id = (SELECT $node_id FROM kg.Zone WHERE zone_id=@zoneA))
INSERT INTO kg.IN_ZONE ($from_id, $to_id) VALUES ((SELECT $node_id FROM kg.Asset WHERE asset_id=322), (SELECT $node_id FROM kg.Zone WHERE zone_id=@zoneA));

-- ADJACENT_TO edges (both directions)
IF NOT EXISTS (SELECT 1 FROM kg.ADJACENT_TO WHERE $from_id = (SELECT $node_id FROM kg.Zone WHERE zone_id=@zoneB) AND $to_id = (SELECT $node_id FROM kg.Zone WHERE zone_id=@zoneA))
INSERT INTO kg.ADJACENT_TO ($from_id, $to_id) VALUES ((SELECT $node_id FROM kg.Zone WHERE zone_id=@zoneB), (SELECT $node_id FROM kg.Zone WHERE zone_id=@zoneA));
IF NOT EXISTS (SELECT 1 FROM kg.ADJACENT_TO WHERE $from_id = (SELECT $node_id FROM kg.Zone WHERE zone_id=@zoneA) AND $to_id = (SELECT $node_id FROM kg.Zone WHERE zone_id=@zoneB))
INSERT INTO kg.ADJACENT_TO ($from_id, $to_id) VALUES ((SELECT $node_id FROM kg.Zone WHERE zone_id=@zoneA), (SELECT $node_id FROM kg.Zone WHERE zone_id=@zoneB));
IF NOT EXISTS (SELECT 1 FROM kg.ADJACENT_TO WHERE $from_id = (SELECT $node_id FROM kg.Zone WHERE zone_id=@zoneB) AND $to_id = (SELECT $node_id FROM kg.Zone WHERE zone_id=@zoneC))
INSERT INTO kg.ADJACENT_TO ($from_id, $to_id) VALUES ((SELECT $node_id FROM kg.Zone WHERE zone_id=@zoneB), (SELECT $node_id FROM kg.Zone WHERE zone_id=@zoneC));
IF NOT EXISTS (SELECT 1 FROM kg.ADJACENT_TO WHERE $from_id = (SELECT $node_id FROM kg.Zone WHERE zone_id=@zoneC) AND $to_id = (SELECT $node_id FROM kg.Zone WHERE zone_id=@zoneB))
INSERT INTO kg.ADJACENT_TO ($from_id, $to_id) VALUES ((SELECT $node_id FROM kg.Zone WHERE zone_id=@zoneC), (SELECT $node_id FROM kg.Zone WHERE zone_id=@zoneB));
