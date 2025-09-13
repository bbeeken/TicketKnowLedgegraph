-- 25_kg_advanced_analytics_fixed.sql
-- Advanced Knowledge Graph Analytics: Blast Radius, Co-failure Analysis, Graph Metrics
USE [OpsGraph];

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;

-- Network Blast Radius - Find all assets that could be affected by a network failure
IF OBJECT_ID('kg.fn_NetworkBlastRadius', 'TF') IS NOT NULL
    DROP FUNCTION kg.fn_NetworkBlastRadius;

IF OBJECT_ID('kg.fn_PowerBlastRadius', 'TF') IS NOT NULL
    DROP FUNCTION kg.fn_PowerBlastRadius;

IF OBJECT_ID('kg.fn_CofailAnalysis', 'TF') IS NOT NULL
    DROP FUNCTION kg.fn_CofailAnalysis;

IF OBJECT_ID('kg.fn_GraphCentrality', 'TF') IS NOT NULL
    DROP FUNCTION kg.fn_GraphCentrality;
GO

-- Simple blast radius function for testing
GO
CREATE FUNCTION kg.fn_NetworkBlastRadius(@asset_id INT, @max_hops INT = 3)
RETURNS @result TABLE (
    source_asset_id INT,
    target_asset_id INT,
    hop_count INT,
    relationship_type NVARCHAR(50),
    impact_score DECIMAL(5,2)
)
AS
BEGIN
    -- For now, return basic connected assets from the same zone
    INSERT INTO @result
    SELECT DISTINCT
        @asset_id as source_asset_id,
        target_a.asset_id as target_asset_id,
        1 as hop_count,
        'ADJACENT' as relationship_type,
        0.8 as impact_score
    FROM app.Assets source_a
    JOIN app.Assets target_a ON source_a.zone_id = target_a.zone_id
    WHERE source_a.asset_id = @asset_id 
      AND target_a.asset_id != @asset_id;
    
    RETURN;
END;
GO

CREATE FUNCTION kg.fn_PowerBlastRadius(@asset_id INT, @max_hops INT = 3)
RETURNS @result TABLE (
    source_asset_id INT,
    target_asset_id INT,
    hop_count INT,
    relationship_type NVARCHAR(50),
    impact_score DECIMAL(5,2)
)
AS
BEGIN
    -- For now, return basic power-dependent assets from the same site
    INSERT INTO @result
    SELECT DISTINCT
        @asset_id as source_asset_id,
        target_a.asset_id as target_asset_id,
        1 as hop_count,
        'POWER_DEPENDENT' as relationship_type,
        0.9 as impact_score
    FROM app.Assets source_a
    JOIN app.Assets target_a ON source_a.site_id = target_a.site_id
    WHERE source_a.asset_id = @asset_id 
      AND target_a.asset_id != @asset_id
      AND target_a.type IN ('POS', 'ATG', 'Controller');
    
    RETURN;
END;
GO

-- Co-failure Analysis - Find assets that tend to fail together
CREATE FUNCTION kg.fn_CofailAnalysis(@site_id INT, @window_minutes INT = 120)
RETURNS @result TABLE (
    asset_id_1 INT,
    asset_id_2 INT,
    cofail_count INT,
    total_failures_1 INT,
    total_failures_2 INT,
    cofail_probability DECIMAL(5,3),
    time_window_minutes INT
)
AS
BEGIN
    -- Find events that occurred within the time window
    INSERT INTO @result
    SELECT 
        e1.asset_id as asset_id_1,
        e2.asset_id as asset_id_2,
        COUNT(*) as cofail_count,
        COUNT(DISTINCT e1.event_id) as total_failures_1,
        COUNT(DISTINCT e2.event_id) as total_failures_2,
        CAST(COUNT(*) AS DECIMAL(5,3)) / NULLIF(GREATEST(COUNT(DISTINCT e1.event_id), COUNT(DISTINCT e2.event_id)), 0) as cofail_probability,
        @window_minutes as time_window_minutes
    FROM app.Events e1
    JOIN app.Events e2 ON e1.asset_id != e2.asset_id
        AND ABS(DATEDIFF(MINUTE, e1.occurred_at, e2.occurred_at)) <= @window_minutes
    JOIN app.Assets a1 ON e1.asset_id = a1.asset_id
    JOIN app.Assets a2 ON e2.asset_id = a2.asset_id
    WHERE a1.site_id = @site_id
      AND a2.site_id = @site_id
      AND e1.canonical_code IN ('FAILURE', 'ERROR', 'ALARM')
      AND e2.canonical_code IN ('FAILURE', 'ERROR', 'ALARM')
      AND e1.occurred_at >= DATEADD(DAY, -30, GETUTCDATE())
    GROUP BY e1.asset_id, e2.asset_id
    HAVING COUNT(*) >= 2;
    
    RETURN;
END;
GO

-- Graph Centrality Analysis
CREATE FUNCTION kg.fn_GraphCentrality(@site_id INT = NULL)
RETURNS @result TABLE (
    asset_id INT,
    asset_type NVARCHAR(50),
    site_id INT,
    degree_centrality INT,
    betweenness_score DECIMAL(5,2),
    centrality_class NVARCHAR(20),
    criticality_score DECIMAL(5,2)
)
AS
BEGIN
    -- Calculate basic centrality metrics based on asset relationships
    INSERT INTO @result
    SELECT 
        a.asset_id,
        a.type as asset_type,
        a.site_id,
        -- Degree centrality: count of connected assets in same zone
        (SELECT COUNT(*) FROM app.Assets a2 WHERE a2.zone_id = a.zone_id AND a2.asset_id != a.asset_id) as degree_centrality,
        -- Simple betweenness approximation
        CASE 
            WHEN a.type IN ('Controller', 'Gateway', 'Switch') THEN 0.8
            WHEN a.type IN ('Server', 'Router') THEN 0.9
            ELSE 0.3
        END as betweenness_score,
        -- Centrality classification
        CASE 
            WHEN a.type IN ('Controller', 'Gateway', 'Switch', 'Server', 'Router') THEN 'HIGH'
            WHEN a.type IN ('POS', 'ATG') THEN 'MEDIUM'
            ELSE 'LOW'
        END as centrality_class,
        -- Overall criticality score
        CASE 
            WHEN a.type IN ('Controller', 'Gateway', 'Switch', 'Server', 'Router') THEN 0.9
            WHEN a.type IN ('POS', 'ATG', 'Dispenser') THEN 0.7
            ELSE 0.4
        END as criticality_score
    FROM app.Assets a
    WHERE (@site_id IS NULL OR a.site_id = @site_id);
    
    RETURN;
END;
GO

-- Create views for easy access to analytics

-- Drop existing views if they exist
IF OBJECT_ID('kg.vw_AdvancedGraphAnalytics', 'V') IS NOT NULL
    DROP VIEW kg.vw_AdvancedGraphAnalytics;

IF OBJECT_ID('kg.vw_NetworkBlastRadius', 'V') IS NOT NULL
    DROP VIEW kg.vw_NetworkBlastRadius;

IF OBJECT_ID('kg.vw_PowerBlastRadius', 'V') IS NOT NULL
    DROP VIEW kg.vw_PowerBlastRadius;

IF OBJECT_ID('kg.vw_CofailAdjacent120', 'V') IS NOT NULL
    DROP VIEW kg.vw_CofailAdjacent120;
GO

CREATE VIEW kg.vw_AdvancedGraphAnalytics AS
SELECT 
    a.asset_id,
    a.type as asset_type,
    a.site_id,
    s.name as site_name,
    gc.degree_centrality,
    gc.betweenness_score,
    gc.centrality_class,
    gc.criticality_score,
    -- Network blast radius summary
    (SELECT COUNT(*) FROM kg.fn_NetworkBlastRadius(a.asset_id, 2)) as network_blast_count,
    -- Power blast radius summary  
    (SELECT COUNT(*) FROM kg.fn_PowerBlastRadius(a.asset_id, 2)) as power_blast_count,
    -- Recent failure indicator
    CASE WHEN EXISTS (
        SELECT 1 FROM app.Events e 
        WHERE e.asset_id = a.asset_id 
          AND e.canonical_code IN ('FAILURE', 'ERROR') 
          AND e.occurred_at >= DATEADD(HOUR, -24, GETUTCDATE())
    ) THEN 1 ELSE 0 END as recent_failure
FROM app.Assets a
JOIN app.Sites s ON a.site_id = s.site_id
CROSS APPLY kg.fn_GraphCentrality(a.site_id) gc
WHERE gc.asset_id = a.asset_id;
GO

-- Network blast radius view (sample for asset 321)
CREATE VIEW kg.vw_NetworkBlastRadius AS
SELECT * FROM kg.fn_NetworkBlastRadius(321, 3);
GO

-- Power blast radius view (sample for asset 321)
CREATE VIEW kg.vw_PowerBlastRadius AS  
SELECT * FROM kg.fn_PowerBlastRadius(321, 3);
GO

-- Co-failure analysis view (120 minute window)
CREATE VIEW kg.vw_CofailAdjacent120 AS
SELECT * FROM kg.fn_CofailAnalysis(1006, 120);
GO

PRINT '25_kg_advanced_analytics_fixed.sql applied - Advanced KG analytics ready';
