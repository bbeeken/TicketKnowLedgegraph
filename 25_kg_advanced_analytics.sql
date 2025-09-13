-- 25_kg_advanced_analytics.sql
-- Advanced Knowledge Graph Analytics: Blast Radius, Co-failure Analysis, Graph Metrics
USE [OpsGraph];
GO
SET ANSI_NULLS ON; SET QUOTED_IDENTIFIER ON; GO

/* Network Blast Radius - Find all assets that could be affected by a network failure */
CREATE OR ALTER FUNCTION kg.fn_NetworkBlastRadius(@asset_id INT, @max_hops INT = 3)
RETURNS TABLE AS
RETURN (
  WITH NetworkPath AS (
    -- Direct network connections
    SELECT 
      a.$node_id as source_node,
      conn.$to_id as target_node,
      a.asset_id as source_asset_id,
      ta.asset_id as target_asset_id,
      1 as hop_count,
      'CONNECTS_TO' as relationship_type
    FROM kg.Asset a
    JOIN kg.CONNECTS_TO conn ON conn.$from_id = a.$node_id
    JOIN kg.Asset ta ON ta.$node_id = conn.$to_id
    WHERE a.asset_id = @asset_id
    
    UNION ALL
    
    -- Power dependencies (could cause network failures)
    SELECT 
      a.$node_id,
      power.$to_id,
      a.asset_id,
      ta.asset_id,
      1,
      'FEEDS_POWER'
    FROM kg.Asset a
    JOIN kg.FEEDS_POWER power ON power.$from_id = a.$node_id
    JOIN kg.Asset ta ON ta.$node_id = power.$to_id
    WHERE a.asset_id = @asset_id
    
    UNION ALL
    
    -- Recursive traversal
    SELECT 
      np.target_node,
      conn.$to_id,
      np.target_asset_id,
      ta.asset_id,
      np.hop_count + 1,
      'CONNECTS_TO'
    FROM NetworkPath np
    JOIN kg.CONNECTS_TO conn ON conn.$from_id = np.target_node
    JOIN kg.Asset ta ON ta.$node_id = conn.$to_id
    WHERE np.hop_count < @max_hops
  )
  SELECT DISTINCT
    target_asset_id as affected_asset_id,
    MIN(hop_count) as min_distance,
    STRING_AGG(relationship_type, ',') as relationship_path
  FROM NetworkPath
  WHERE target_asset_id != @asset_id
  GROUP BY target_asset_id
);
GO

/* Power Blast Radius - Find all assets affected by power failure */
CREATE OR ALTER FUNCTION kg.fn_PowerBlastRadius(@asset_id INT, @max_hops INT = 3)
RETURNS TABLE AS
RETURN (
  WITH PowerPath AS (
    -- Direct power dependencies
    SELECT 
      a.$node_id as source_node,
      power.$to_id as target_node,
      a.asset_id as source_asset_id,
      ta.asset_id as target_asset_id,
      1 as hop_count
    FROM kg.Asset a
    JOIN kg.FEEDS_POWER power ON power.$from_id = a.$node_id
    JOIN kg.Asset ta ON ta.$node_id = power.$to_id
    WHERE a.asset_id = @asset_id
    
    UNION ALL
    
    -- Recursive power chain
    SELECT 
      pp.target_node,
      power.$to_id,
      pp.target_asset_id,
      ta.asset_id,
      pp.hop_count + 1
    FROM PowerPath pp
    JOIN kg.FEEDS_POWER power ON power.$from_id = pp.target_node
    JOIN kg.Asset ta ON ta.$node_id = power.$to_id
    WHERE pp.hop_count < @max_hops
  )
  SELECT DISTINCT
    target_asset_id as affected_asset_id,
    MIN(hop_count) as power_dependency_distance
  FROM PowerPath
  WHERE target_asset_id != @asset_id
  GROUP BY target_asset_id
);
GO

/* Co-failure Analysis - Find assets that frequently fail together */
CREATE OR ALTER FUNCTION kg.fn_CofailAnalysis(@site_id INT, @window_minutes INT = 120, @min_occurrences INT = 2)
RETURNS TABLE AS
RETURN (
  WITH AssetFailures AS (
    SELECT 
      a.asset_id,
      a.type as asset_type,
      al.raised_at as failure_time,
      al.alert_id
    FROM kg.Asset a
    JOIN app.Events e ON e.asset_id = a.asset_id
    JOIN app.Alerts al ON al.event_id = e.event_id
    WHERE a.site_id = @site_id
      AND al.level IN ('critical', 'error')
      AND al.raised_at >= DATEADD(day, -30, GETUTCDATE())
  ),
  FailureWindows AS (
    SELECT 
      af1.asset_id as asset_id_1,
      af2.asset_id as asset_id_2,
      af1.failure_time,
      COUNT(*) as co_occurrence_count
    FROM AssetFailures af1
    JOIN AssetFailures af2 ON af1.asset_id < af2.asset_id
      AND ABS(DATEDIFF(minute, af1.failure_time, af2.failure_time)) <= @window_minutes
    GROUP BY af1.asset_id, af2.asset_id, af1.failure_time
    HAVING COUNT(*) >= @min_occurrences
  )
  SELECT 
    asset_id_1,
    asset_id_2,
    SUM(co_occurrence_count) as total_co_failures,
    COUNT(*) as failure_window_count,
    AVG(CAST(co_occurrence_count as FLOAT)) as avg_co_failures_per_window
  FROM FailureWindows
  GROUP BY asset_id_1, asset_id_2
);
GO

/* Graph Centrality Metrics */
CREATE OR ALTER FUNCTION kg.fn_GraphCentrality(@site_id INT = NULL)
RETURNS TABLE AS
RETURN (
  WITH NodeConnections AS (
    SELECT 
      a.asset_id,
      a.type as asset_type,
      a.site_id,
      COUNT(DISTINCT conn_out.$to_id) as outbound_connections,
      COUNT(DISTINCT conn_in.$from_id) as inbound_connections
    FROM kg.Asset a
    LEFT JOIN kg.CONNECTS_TO conn_out ON conn_out.$from_id = a.$node_id
    LEFT JOIN kg.CONNECTS_TO conn_in ON conn_in.$to_id = a.$node_id
    LEFT JOIN kg.FEEDS_POWER power_out ON power_out.$from_id = a.$node_id
    LEFT JOIN kg.FEEDS_POWER power_in ON power_in.$to_id = a.$node_id
    WHERE (@site_id IS NULL OR a.site_id = @site_id)
    GROUP BY a.asset_id, a.type, a.site_id
  )
  SELECT 
    asset_id,
    asset_type,
    site_id,
    outbound_connections,
    inbound_connections,
    (outbound_connections + inbound_connections) as total_degree,
    CASE 
      WHEN (outbound_connections + inbound_connections) = 0 THEN 'isolated'
      WHEN (outbound_connections + inbound_connections) >= 5 THEN 'critical_hub'
      WHEN (outbound_connections + inbound_connections) >= 3 THEN 'important_node'
      ELSE 'standard_node'
    END as centrality_classification
  FROM NodeConnections
);
GO

/* Enhanced Graph Analytics View */
CREATE OR ALTER VIEW kg.vw_AdvancedGraphAnalytics AS
SELECT 
  'total_nodes' as metric_name,
  COUNT(*) as metric_value,
  NULL as site_id
FROM (
  SELECT $node_id FROM kg.Site UNION ALL
  SELECT $node_id FROM kg.Asset UNION ALL
  SELECT $node_id FROM kg.Alert UNION ALL
  SELECT $node_id FROM kg.Event UNION ALL
  SELECT $node_id FROM kg.Ticket UNION ALL
  SELECT $node_id FROM kg.UserProfile UNION ALL
  SELECT $node_id FROM kg.Team UNION ALL
  SELECT $node_id FROM kg.Vendor UNION ALL
  SELECT $node_id FROM kg.Document UNION ALL
  SELECT $node_id FROM kg.Invoice UNION ALL
  SELECT $node_id FROM kg.KnowledgeSnippet
) all_nodes

UNION ALL

SELECT 
  'total_edges',
  COUNT(*),
  NULL
FROM (
  SELECT $edge_id FROM kg.HAS_ASSET UNION ALL
  SELECT $edge_id FROM kg.CONNECTS_TO UNION ALL
  SELECT $edge_id FROM kg.FEEDS_POWER UNION ALL
  SELECT $edge_id FROM kg.RELATES_TO UNION ALL
  SELECT $edge_id FROM kg.DOCUMENT_FOR UNION ALL
  SELECT $edge_id FROM kg.SESSION_FOR UNION ALL
  SELECT $edge_id FROM kg.SNIPPET_REF
) all_edges

UNION ALL

SELECT 
  'critical_hubs',
  COUNT(*),
  site_id
FROM kg.fn_GraphCentrality(NULL)
WHERE centrality_classification = 'critical_hub'
GROUP BY site_id

UNION ALL

SELECT 
  'isolated_nodes',
  COUNT(*),
  site_id
FROM kg.fn_GraphCentrality(NULL)
WHERE centrality_classification = 'isolated'
GROUP BY site_id

UNION ALL

SELECT 
  'avg_node_degree',
  AVG(total_degree),
  site_id
FROM kg.fn_GraphCentrality(NULL)
GROUP BY site_id;
GO

/* Update the existing view to include blast radius */
CREATE OR ALTER VIEW kg.vw_NetworkBlastRadius AS
SELECT 
  a.asset_id as source_asset_id,
  a.type as source_asset_type,
  a.site_id,
  br.affected_asset_id,
  aa.type as affected_asset_type,
  br.min_distance,
  br.relationship_path
FROM kg.Asset a
CROSS APPLY kg.fn_NetworkBlastRadius(a.asset_id, 3) br
JOIN kg.Asset aa ON aa.asset_id = br.affected_asset_id;
GO

CREATE OR ALTER VIEW kg.vw_PowerBlastRadius AS
SELECT 
  a.asset_id as source_asset_id,
  a.type as source_asset_type,
  a.site_id,
  br.affected_asset_id,
  aa.type as affected_asset_type,
  br.power_dependency_distance
FROM kg.Asset a
CROSS APPLY kg.fn_PowerBlastRadius(a.asset_id, 3) br
JOIN kg.Asset aa ON aa.asset_id = br.affected_asset_id;
GO

CREATE OR ALTER VIEW kg.vw_CofailAdjacent120 AS
SELECT 
  ca.asset_id_1,
  ca.asset_id_2,
  a1.type as asset_type_1,
  a2.type as asset_type_2,
  a1.site_id,
  ca.total_co_failures,
  ca.failure_window_count,
  ca.avg_co_failures_per_window
FROM kg.fn_CofailAnalysis(1000, 120, 2) ca
JOIN kg.Asset a1 ON a1.asset_id = ca.asset_id_1
JOIN kg.Asset a2 ON a2.asset_id = ca.asset_id_2;
GO

PRINT '25_kg_advanced_analytics.sql applied - Advanced KG analytics ready';
GO
