import mssql from 'mssql';

// Validate required environment variables for SQL connection
const requiredEnv = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASS'];
for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

// Singleton pool instance
let pool: mssql.ConnectionPool | null = null;

export async function getPool(): Promise<mssql.ConnectionPool> {
  if (pool) return pool;
  pool = await new mssql.ConnectionPool({
    server: process.env.DB_HOST!,
    database: process.env.DB_NAME!,
    user: process.env.DB_USER!,
    password: process.env.DB_PASS!,
    options: { encrypt: true, trustServerCertificate: true },
    pool: { max: 10, min: 1 },
  }).connect();
  // Enforce required SET options for filtered indexes / computed columns
  try {
    await pool.request().batch(`SET ANSI_NULLS ON; SET ANSI_WARNINGS ON; SET QUOTED_IDENTIFIER ON; SET CONCAT_NULL_YIELDS_NULL ON;`);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('Failed to set ANSI session options', e);
  }
  return pool;
}

// Helper to run a function with RLS context set
export async function withRls<T>(userId: string | number, fn: (conn: mssql.ConnectionPool) => Promise<T>): Promise<T> {
  const conn = await getPool();
  try {
    await conn.request()
      .input('key', mssql.NVarChar, 'user_id')
      .input('value', mssql.NVarChar, String(userId))
      .execute('sys.sp_set_session_context');
    return await fn(conn);
  } catch (err) {
    // Add logging here if needed
    throw err;
  }
}

// Safe query helper
export async function safeQuery(query: string, params: Record<string, any> = {}): Promise<mssql.IResult<any>> {
  const conn = await getPool();
  const request = conn.request();
  for (const [key, value] of Object.entries(params)) {
    request.input(key, value);
  }
  return request.query(query);
}

// Stub for getKgData (implement as needed)
export async function getKgData(userId: string): Promise<any> {
  // Example: fetch all sites user has access to
  const result = await withRls(userId, async (conn) => {
    return conn.request().query('SELECT * FROM kg.Site');
  });
  return result.recordset;
}

// Advanced graph query functions
export async function getGraphNodes(userId: string, nodeType?: string, siteId?: number): Promise<any[]> {
  return withRls(userId, async (conn) => {
    let query = `
      SELECT
        'Site' as node_type, s.site_id as id, s.name as label, s.city, s.state
      FROM kg.Site s
      UNION ALL
      SELECT
        'Zone' as node_type, z.zone_id as id, z.label, s.name as site_name, NULL as state
      FROM kg.Zone z
      JOIN kg.Site s ON z.site_id = s.site_id
      UNION ALL
      SELECT
        'Asset' as node_type, a.asset_id as id, a.type + ' - ' + a.model as label, s.name as site_name, a.vendor
      FROM kg.Asset a
      JOIN kg.Site s ON a.site_id = s.site_id
      UNION ALL
      SELECT
        'Event' as node_type, e.event_id as id, e.code + ' - ' + LEFT(e.message, 50) as label, s.name as site_name, e.level
      FROM kg.Event e
      JOIN kg.Site s ON e.site_id = s.site_id
      UNION ALL
      SELECT
        'Alert' as node_type, a.alert_id as id, a.rule_name as label, s.name as site_name, CAST(a.priority as varchar) as priority
      FROM kg.Alert a
      JOIN app.Events e ON a.event_id = e.event_id
      JOIN kg.Site s ON e.site_id = s.site_id
      UNION ALL
      SELECT
        'Ticket' as node_type, t.ticket_id as id, t.summary as label, s.name as site_name, t.status
      FROM kg.Ticket t
      JOIN app.Tickets at ON t.ticket_id = at.ticket_id
      JOIN kg.Site s ON at.site_id = s.site_id
    `;

    const params: any = {};
    if (nodeType) {
      query += ' WHERE node_type = @nodeType';
      params.nodeType = nodeType;
    }
    if (siteId) {
      query += nodeType ? ' AND' : ' WHERE';
      query += ' site_id = @siteId';
      params.siteId = siteId;
    }

    const result = await conn.request()
      .input('nodeType', params.nodeType || null)
      .input('siteId', params.siteId || null)
      .query(query);
    return result.recordset;
  });
}

export async function getGraphEdges(userId: string, siteId?: number): Promise<any[]> {
  return withRls(userId, async (conn) => {
    const query = `
      SELECT
        'HAS_ZONE' as edge_type,
        s.site_id as source_id, 'Site' as source_type,
        z.zone_id as target_id, 'Zone' as target_type
      FROM kg.HAS_ZONE hz
      JOIN kg.Site s ON hz.$from_id = s.$node_id
      JOIN kg.Zone z ON hz.$to_id = z.$node_id
      ${siteId ? 'WHERE s.site_id = @siteId' : ''}
      UNION ALL
      SELECT
        'HAS_ASSET' as edge_type,
        s.site_id as source_id, 'Site' as source_type,
        a.asset_id as target_id, 'Asset' as target_type
      FROM kg.HAS_ASSET ha
      JOIN kg.Site s ON ha.$from_id = s.$node_id
      JOIN kg.Asset a ON ha.$to_id = a.$node_id
      ${siteId ? 'WHERE s.site_id = @siteId' : ''}
      UNION ALL
      SELECT
        'IN_ZONE' as edge_type,
        a.asset_id as source_id, 'Asset' as source_type,
        z.zone_id as target_id, 'Zone' as target_type
      FROM kg.IN_ZONE iz
      JOIN kg.Asset a ON iz.$from_id = a.$node_id
      JOIN kg.Zone z ON iz.$to_id = z.$node_id
      ${siteId ? 'WHERE a.site_id = @siteId' : ''}
      UNION ALL
      SELECT
        'ADJACENT_TO' as edge_type,
        z1.zone_id as source_id, 'Zone' as source_type,
        z2.zone_id as target_id, 'Zone' as target_type
      FROM kg.ADJACENT_TO at
      JOIN kg.Zone z1 ON at.$from_id = z1.$node_id
      JOIN kg.Zone z2 ON at.$to_id = z2.$node_id
      ${siteId ? 'WHERE z1.site_id = @siteId' : ''}
      UNION ALL
      SELECT
        'ON_ASSET' as edge_type,
        e.event_id as source_id, 'Event' as source_type,
        a.asset_id as target_id, 'Asset' as target_type
      FROM kg.ON_ASSET oa
      JOIN kg.Event e ON oa.$from_id = e.$node_id
      JOIN kg.Asset a ON oa.$to_id = a.$node_id
      ${siteId ? 'WHERE e.site_id = @siteId' : ''}
      UNION ALL
      SELECT
        'LOCATED_AT' as edge_type,
        e.event_id as source_id, 'Event' as source_type,
        s.site_id as target_id, 'Site' as target_type
      FROM kg.LOCATED_AT la
      JOIN kg.Event e ON la.$from_id = e.$node_id
      JOIN kg.Site s ON la.$to_id = s.$node_id
      ${siteId ? 'WHERE s.site_id = @siteId' : ''}
      UNION ALL
      SELECT
        'PROMOTED_TO' as edge_type,
        e.event_id as source_id, 'Event' as source_type,
        a.alert_id as target_id, 'Alert' as target_type
      FROM kg.PROMOTED_TO pt
      JOIN kg.Event e ON pt.$from_id = e.$node_id
      JOIN kg.Alert a ON pt.$to_id = a.$node_id
      ${siteId ? 'WHERE e.site_id = @siteId' : ''}
      UNION ALL
      SELECT
        'CREATED_TICKET' as edge_type,
        a.alert_id as source_id, 'Alert' as source_type,
        t.ticket_id as target_id, 'Ticket' as target_type
      FROM kg.CREATED_TICKET ct
      JOIN kg.Alert a ON ct.$from_id = a.$node_id
      JOIN kg.Ticket t ON ct.$to_id = t.$node_id
      ${siteId ? 'WHERE a.site_id = @siteId' : ''}
      UNION ALL
      SELECT
        'RELATES_TO' as edge_type,
        t.ticket_id as source_id, 'Ticket' as source_type,
        a.asset_id as target_id, 'Asset' as target_type
      FROM kg.RELATES_TO rt
      JOIN kg.Ticket t ON rt.$from_id = t.$node_id
      JOIN kg.Asset a ON rt.$to_id = a.$node_id
      ${siteId ? 'WHERE a.site_id = @siteId' : ''}
    `;

    const result = await conn.request()
      .input('siteId', siteId || null)
      .query(query);
    return result.recordset;
  });
}

export async function getShortestPath(userId: string, startNodeId: string, endNodeId: string, startNodeType: string, endNodeType: string): Promise<any[]> {
  return withRls(userId, async (conn) => {
    // This is a simplified implementation - in production you'd want more sophisticated path finding
    const query = `
      SELECT DISTINCT
        n1.id as source_id, n1.node_type as source_type, n1.label as source_label,
        n2.id as target_id, n2.node_type as target_type, n2.label as target_label,
        e.edge_type
      FROM (
        SELECT 'Site' as node_type, site_id as id, name as label FROM kg.Site
        UNION ALL SELECT 'Zone' as node_type, zone_id as id, label FROM kg.Zone
        UNION ALL SELECT 'Asset' as node_type, asset_id as id, type + ' - ' + model as label FROM kg.Asset
        UNION ALL SELECT 'Event' as node_type, event_id as id, code as label FROM kg.Event
        UNION ALL SELECT 'Alert' as node_type, alert_id as id, rule_name as label FROM kg.Alert
        UNION ALL SELECT 'Ticket' as node_type, ticket_id as id, summary as label FROM kg.Ticket
      ) n1
      CROSS JOIN (
        SELECT 'Site' as node_type, site_id as id, name as label FROM kg.Site
        UNION ALL SELECT 'Zone' as node_type, zone_id as id, label FROM kg.Zone
        UNION ALL SELECT 'Asset' as node_type, asset_id as id, type + ' - ' + model as label FROM kg.Asset
        UNION ALL SELECT 'Event' as node_type, event_id as id, code as label FROM kg.Event
        UNION ALL SELECT 'Alert' as node_type, alert_id as id, rule_name as label FROM kg.Alert
        UNION ALL SELECT 'Ticket' as node_type, ticket_id as id, summary as label FROM kg.Ticket
      ) n2
      LEFT JOIN (
        -- All possible edges
        SELECT s.site_id as source_id, 'Site' as source_type, z.zone_id as target_id, 'Zone' as target_type, 'HAS_ZONE' as edge_type
        FROM kg.HAS_ZONE hz JOIN kg.Site s ON hz.$from_id = s.$node_id JOIN kg.Zone z ON hz.$to_id = z.$node_id
        UNION ALL SELECT s.site_id, 'Site', a.asset_id, 'Asset', 'HAS_ASSET'
        FROM kg.HAS_ASSET ha JOIN kg.Site s ON ha.$from_id = s.$node_id JOIN kg.Asset a ON ha.$to_id = a.$node_id
        UNION ALL SELECT a.asset_id, 'Asset', z.zone_id, 'Zone', 'IN_ZONE'
        FROM kg.IN_ZONE iz JOIN kg.Asset a ON iz.$from_id = a.$node_id JOIN kg.Zone z ON iz.$to_id = z.$node_id
        UNION ALL SELECT z1.zone_id, 'Zone', z2.zone_id, 'Zone', 'ADJACENT_TO'
        FROM kg.ADJACENT_TO at JOIN kg.Zone z1 ON at.$from_id = z1.$node_id JOIN kg.Zone z2 ON at.$to_id = z2.$node_id
        UNION ALL SELECT e.event_id, 'Event', a.asset_id, 'Asset', 'ON_ASSET'
        FROM kg.ON_ASSET oa JOIN kg.Event e ON oa.$from_id = e.$node_id JOIN kg.Asset a ON oa.$to_id = a.$node_id
        UNION ALL SELECT e.event_id, 'Event', s.site_id, 'Site', 'LOCATED_AT'
        FROM kg.LOCATED_AT la JOIN kg.Event e ON la.$from_id = e.$node_id JOIN kg.Site s ON la.$to_id = s.$node_id
        UNION ALL SELECT e.event_id, 'Event', a.alert_id, 'Alert', 'PROMOTED_TO'
        FROM kg.PROMOTED_TO pt JOIN kg.Event e ON pt.$from_id = e.$node_id JOIN kg.Alert a ON pt.$to_id = a.$node_id
        UNION ALL SELECT a.alert_id, 'Alert', t.ticket_id, 'Ticket', 'CREATED_TICKET'
        FROM kg.CREATED_TICKET ct JOIN kg.Alert a ON ct.$from_id = a.$node_id JOIN kg.Ticket t ON ct.$to_id = t.$node_id
        UNION ALL SELECT t.ticket_id, 'Ticket', a.asset_id, 'Asset', 'RELATES_TO'
        FROM kg.RELATES_TO rt JOIN kg.Ticket t ON rt.$from_id = t.$node_id JOIN kg.Asset a ON rt.$to_id = a.$node_id
      ) e ON n1.id = e.source_id AND n1.node_type = e.source_type AND n2.id = e.target_id AND n2.node_type = e.target_type
      WHERE n1.id = @startNodeId AND n1.node_type = @startNodeType
        AND n2.id = @endNodeId AND n2.node_type = @endNodeType
        AND e.edge_type IS NOT NULL
    `;

    const result = await conn.request()
      .input('startNodeId', startNodeId)
      .input('endNodeId', endNodeId)
      .input('startNodeType', startNodeType)
      .input('endNodeType', endNodeType)
      .query(query);
    return result.recordset;
  });
}

export async function getNodeNeighbors(userId: string, nodeId: string, nodeType: string, depth: number = 1): Promise<any[]> {
  return withRls(userId, async (conn) => {
    const query = `
      WITH NodeHierarchy AS (
        SELECT
          n.id, n.node_type, n.label,
          0 as depth,
          CAST(n.id + '|' + n.node_type as varchar(max)) as path
        FROM (
          SELECT site_id as id, 'Site' as node_type, name as label FROM kg.Site WHERE site_id = @nodeId AND @nodeType = 'Site'
          UNION ALL SELECT zone_id, 'Zone', label FROM kg.Zone WHERE zone_id = @nodeId AND @nodeType = 'Zone'
          UNION ALL SELECT asset_id, 'Asset', type + ' - ' + model FROM kg.Asset WHERE asset_id = @nodeId AND @nodeType = 'Asset'
          UNION ALL SELECT event_id, 'Event', code FROM kg.Event WHERE event_id = @nodeId AND @nodeType = 'Event'
          UNION ALL SELECT alert_id, 'Alert', rule_name FROM kg.Alert WHERE alert_id = @nodeId AND @nodeType = 'Alert'
          UNION ALL SELECT ticket_id, 'Ticket', summary FROM kg.Ticket WHERE ticket_id = @nodeId AND @nodeType = 'Ticket'
        ) n

        UNION ALL

        SELECT
          n2.id, n2.node_type, n2.label,
          nh.depth + 1,
          CAST(nh.path + '->' + n2.id + '|' + n2.node_type as varchar(max))
        FROM NodeHierarchy nh
        CROSS APPLY (
          -- Find all connected nodes
          SELECT DISTINCT target_id as id, target_type as node_type, target_label as label
          FROM (
            SELECT s.site_id as source_id, 'Site' as source_type, z.zone_id as target_id, 'Zone' as target_type, z.label as target_label
            FROM kg.HAS_ZONE hz JOIN kg.Site s ON hz.$from_id = s.$node_id JOIN kg.Zone z ON hz.$to_id = z.$node_id
            UNION ALL SELECT s.site_id, 'Site', a.asset_id, 'Asset', a.type + ' - ' + a.model
            FROM kg.HAS_ASSET ha JOIN kg.Site s ON ha.$from_id = s.$node_id JOIN kg.Asset a ON ha.$to_id = a.$node_id
            UNION ALL SELECT a.asset_id, 'Asset', z.zone_id, 'Zone', z.label
            FROM kg.IN_ZONE iz JOIN kg.Asset a ON iz.$from_id = a.$node_id JOIN kg.Zone z ON iz.$to_id = z.$node_id
            UNION ALL SELECT z1.zone_id, 'Zone', z2.zone_id, 'Zone', z2.label
            FROM kg.ADJACENT_TO at JOIN kg.Zone z1 ON at.$from_id = z1.$node_id JOIN kg.Zone z2 ON at.$to_id = z2.$node_id
            UNION ALL SELECT e.event_id, 'Event', a.asset_id, 'Asset', a.type + ' - ' + a.model
            FROM kg.ON_ASSET oa JOIN kg.Event e ON oa.$from_id = e.$node_id JOIN kg.Asset a ON oa.$to_id = a.$node_id
            UNION ALL SELECT e.event_id, 'Event', s.site_id, 'Site', s.name
            FROM kg.LOCATED_AT la JOIN kg.Event e ON la.$from_id = e.$node_id JOIN kg.Site s ON la.$to_id = s.$node_id
            UNION ALL SELECT e.event_id, 'Event', a.alert_id, 'Alert', a.rule_name
            FROM kg.PROMOTED_TO pt JOIN kg.Event e ON pt.$from_id = e.$node_id JOIN kg.Alert a ON pt.$to_id = a.$node_id
            UNION ALL SELECT a.alert_id, 'Alert', t.ticket_id, 'Ticket', t.summary
            FROM kg.CREATED_TICKET ct JOIN kg.Alert a ON ct.$from_id = a.$node_id JOIN kg.Ticket t ON ct.$to_id = t.$node_id
            UNION ALL SELECT t.ticket_id, 'Ticket', a.asset_id, 'Asset', a.type + ' - ' + a.model
            FROM kg.RELATES_TO rt JOIN kg.Ticket t ON rt.$from_id = t.$node_id JOIN kg.Asset a ON rt.$to_id = a.$node_id
          ) connections
          WHERE connections.source_id = nh.id AND connections.source_type = nh.node_type

          UNION ALL

          -- Reverse connections
          SELECT DISTINCT source_id as id, source_type as node_type, source_label as label
          FROM (
            SELECT z.zone_id as source_id, 'Zone' as source_type, z.label as source_label, s.site_id as target_id, 'Site' as target_type
            FROM kg.HAS_ZONE hz JOIN kg.Site s ON hz.$from_id = s.$node_id JOIN kg.Zone z ON hz.$to_id = z.$node_id
            UNION ALL SELECT a.asset_id, 'Asset', a.type + ' - ' + a.model, s.site_id, 'Site'
            FROM kg.HAS_ASSET ha JOIN kg.Site s ON ha.$from_id = s.$node_id JOIN kg.Asset a ON ha.$to_id = a.$node_id
            UNION ALL SELECT z.zone_id, 'Zone', z.label, a.asset_id, 'Asset'
            FROM kg.IN_ZONE iz JOIN kg.Asset a ON iz.$from_id = a.$node_id JOIN kg.Zone z ON iz.$to_id = z.$node_id
            UNION ALL SELECT z2.zone_id, 'Zone', z2.label, z1.zone_id, 'Zone'
            FROM kg.ADJACENT_TO at JOIN kg.Zone z1 ON at.$from_id = z1.$node_id JOIN kg.Zone z2 ON at.$to_id = z2.$node_id
            UNION ALL SELECT a.asset_id, 'Asset', a.type + ' - ' + a.model, e.event_id, 'Event'
            FROM kg.ON_ASSET oa JOIN kg.Event e ON oa.$from_id = e.$node_id JOIN kg.Asset a ON oa.$to_id = a.$node_id
            UNION ALL SELECT s.site_id, 'Site', s.name, e.event_id, 'Event'
            FROM kg.LOCATED_AT la JOIN kg.Event e ON la.$from_id = e.$node_id JOIN kg.Site s ON la.$to_id = s.$node_id
            UNION ALL SELECT a.alert_id, 'Alert', a.rule_name, e.event_id, 'Event'
            FROM kg.PROMOTED_TO pt JOIN kg.Event e ON pt.$from_id = e.$node_id JOIN kg.Alert a ON pt.$to_id = a.$node_id
            UNION ALL SELECT t.ticket_id, 'Ticket', t.summary, a.alert_id, 'Alert'
            FROM kg.CREATED_TICKET ct JOIN kg.Alert a ON ct.$from_id = a.$node_id JOIN kg.Ticket t ON ct.$to_id = t.$node_id
            UNION ALL SELECT a.asset_id, 'Asset', a.type + ' - ' + a.model, t.ticket_id, 'Ticket'
            FROM kg.RELATES_TO rt JOIN kg.Ticket t ON rt.$from_id = t.$node_id JOIN kg.Asset a ON rt.$to_id = a.$node_id
          ) reverse_connections
          WHERE reverse_connections.target_id = nh.id AND reverse_connections.target_type = nh.node_type
        ) n2
        WHERE nh.depth < @depth
      )
      SELECT DISTINCT id, node_type, label, depth, path
      FROM NodeHierarchy
      WHERE depth > 0
      ORDER BY depth, node_type, label
    `;

    const result = await conn.request()
      .input('nodeId', nodeId)
      .input('nodeType', nodeType)
      .input('depth', depth)
      .query(query);
    return result.recordset;
  });
}

export async function getGraphAnalytics(userId: string, siteId?: number): Promise<any> {
  return withRls(userId, async (conn) => {
    const query = `
      SELECT
        'total_nodes' as metric,
        COUNT(*) as value
      FROM (
        SELECT site_id FROM kg.Site
        UNION ALL SELECT zone_id FROM kg.Zone
        UNION ALL SELECT asset_id FROM kg.Asset
        UNION ALL SELECT event_id FROM kg.Event
        UNION ALL SELECT alert_id FROM kg.Alert
        UNION ALL SELECT ticket_id FROM kg.Ticket
      ) n
      ${siteId ? 'WHERE site_id = @siteId' : ''}

      UNION ALL

      SELECT
        'total_edges' as metric,
        COUNT(*) as value
      FROM (
        SELECT 1 FROM kg.HAS_ZONE
        UNION ALL SELECT 1 FROM kg.HAS_ASSET
        UNION ALL SELECT 1 FROM kg.IN_ZONE
        UNION ALL SELECT 1 FROM kg.ADJACENT_TO
        UNION ALL SELECT 1 FROM kg.ON_ASSET
        UNION ALL SELECT 1 FROM kg.LOCATED_AT
        UNION ALL SELECT 1 FROM kg.PROMOTED_TO
        UNION ALL SELECT 1 FROM kg.CREATED_TICKET
        UNION ALL SELECT 1 FROM kg.RELATES_TO
      ) e

      UNION ALL

      SELECT
        'active_alerts' as metric,
        COUNT(*) as value
      FROM app.Alerts a
      JOIN app.Events e ON a.event_id = e.event_id
      WHERE a.acknowledged_at IS NULL
      ${siteId ? 'AND e.site_id = @siteId' : ''}

      UNION ALL

      SELECT
        'open_tickets' as metric,
        COUNT(*) as value
      FROM app.Tickets
      WHERE status IN ('Open', 'In Progress', 'Pending')
      ${siteId ? 'AND site_id = @siteId' : ''}
    `;

    const result = await conn.request()
      .input('siteId', siteId || null)
      .query(query);
    return result.recordset;
  });
}
