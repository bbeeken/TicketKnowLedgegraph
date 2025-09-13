-- 08_views_and_tvfs.sql
-- Views and TVFs for reporting, graph analytics
USE [OpsGraph];
GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- Open Alerts by Site
CREATE OR ALTER VIEW app.vw_OpenAlertsBySite AS
SELECT
    e.site_id,
    a.alert_id,
    a.raised_at,
    e.canonical_code AS code,
    e.level,
    e.asset_id,
    s.type AS asset_type,
    z.label AS zone_label,
    t.ticket_id
FROM app.Alerts a
JOIN app.Events e ON a.event_id = e.event_id
JOIN app.Assets s ON e.asset_id = s.asset_id
JOIN app.Zones z ON s.zone_id = z.zone_id
LEFT JOIN (
    SELECT ta.asset_id, ta.ticket_id
    FROM app.TicketAssets ta
    JOIN app.Tickets t2 ON ta.ticket_id = t2.ticket_id
    WHERE t2.status IN ('Open','In Progress','Pending')
) t ON t.asset_id = e.asset_id
WHERE a.acknowledged_at IS NULL;
GO

-- Co-failures with ATG COMMS_LOSS in adjacent zones (inline TVF)
CREATE OR ALTER FUNCTION kg.fn_CofailAdjacent(@site_id INT, @window_minutes INT)
RETURNS TABLE
AS
RETURN
    WITH atg AS (
        SELECT a.alert_id, e.occurred_at AS atg_time, s.zone_id
        FROM app.Alerts a
        JOIN app.Events e ON a.event_id = e.event_id
        JOIN app.Assets s ON e.asset_id = s.asset_id
        WHERE e.site_id = @site_id AND e.canonical_code = 'COMMS_LOSS'
    ),
    adj AS (
        SELECT za.zone_id, za.adj_zone_id
        FROM app.ZoneAdjacency za
        WHERE za.zone_id IN (SELECT zone_id FROM atg)
    ),
    other AS (
        SELECT e2.event_id, e2.asset_id, e2.canonical_code, e2.occurred_at, s2.zone_id
        FROM app.Events e2
        JOIN app.Assets s2 ON e2.asset_id = s2.asset_id
        WHERE e2.site_id = @site_id AND e2.canonical_code <> 'COMMS_LOSS'
    )
    SELECT
        @site_id AS site_id,
        atg.alert_id AS atg_alert_id,
        atg.atg_time,
        atg.zone_id AS atg_zone_id,
        adj.adj_zone_id,
        o.asset_id AS other_asset_id,
        o.canonical_code AS other_code,
        o.occurred_at AS other_time,
        DATEDIFF(MINUTE, atg.atg_time, o.occurred_at) AS delta_min
    FROM atg
    JOIN adj ON atg.zone_id = adj.zone_id
    JOIN other o ON o.zone_id = adj.adj_zone_id
    WHERE ABS(DATEDIFF(MINUTE, atg.atg_time, o.occurred_at)) <= @window_minutes;
GO

-- vw_CofailAdjacent120
CREATE OR ALTER VIEW kg.vw_CofailAdjacent120 AS
SELECT * FROM kg.fn_CofailAdjacent(1006, 120);
GO

-- Stub: Network Blast Radius (placeholder; to be replaced with actual logic)
CREATE OR ALTER VIEW kg.vw_NetworkBlastRadius AS
SELECT TOP (0)
    CAST(NULL AS INT)    AS site_id,
    CAST(NULL AS INT)    AS seed_asset_id,
    CAST(NULL AS INT)    AS impacted_asset_id,
    CAST(NULL AS TINYINT) AS hop,
    CAST(NULL AS NVARCHAR(60)) AS relation
FROM sys.objects;
GO

-- Stub: Power Blast Radius (placeholder; to be replaced with actual logic)
CREATE OR ALTER VIEW kg.vw_PowerBlastRadius AS
SELECT TOP (0)
    CAST(NULL AS INT)    AS site_id,
    CAST(NULL AS INT)    AS seed_asset_id,
    CAST(NULL AS INT)    AS impacted_asset_id,
    CAST(NULL AS TINYINT) AS hop,
    CAST(NULL AS NVARCHAR(60)) AS relation
FROM sys.objects;
GO

-- Stub: Food Safety Hot Cases (placeholder; to be replaced with actual logic)
CREATE OR ALTER VIEW kg.vw_FoodSafetyHotCases AS
SELECT TOP (0)
    CAST(NULL AS INT)         AS site_id,
    CAST(NULL AS INT)         AS asset_id,
    CAST(NULL AS DATETIME2(3)) AS last_temp_time,
    CAST(NULL AS DECIMAL(5,2)) AS last_temp_c,
    CAST(NULL AS NVARCHAR(60)) AS status
FROM sys.objects;
GO
