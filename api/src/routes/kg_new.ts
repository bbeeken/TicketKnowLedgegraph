import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { withRls, getKgData, getGraphNodes, getGraphEdges, getShortestPath, getNodeNeighbors, getGraphAnalytics } from '../sql';

// Extend FastifyJWT types
declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: { sub: number }
  }
}

interface JwtRequest extends FastifyRequest {
  user: { sub: number }
}

// Register all KG-related routes
export async function registerKgRoutes(fastify: FastifyInstance) {
  // /kg route - enhanced with full graph data
  fastify.get('/kg', { preHandler: [fastify.authenticate] }, async (request: JwtRequest, reply: FastifyReply) => {
    const userId = request.user?.sub;
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' });

    const query = request.query as any;
    const siteId = query.siteId ? parseInt(query.siteId) : undefined;

    try {
      const [nodes, edges, analytics] = await Promise.all([
        getGraphNodes(userId.toString(), undefined, siteId),
        getGraphEdges(userId.toString(), siteId),
        getGraphAnalytics(userId.toString(), siteId)
      ]);

      reply.send({
        nodes,
        edges,
        analytics,
        metadata: {
          siteId,
          timestamp: new Date().toISOString(),
          totalNodes: nodes.length,
          totalEdges: edges.length
        }
      });
    } catch (err: any) {
      fastify.log.error({ err }, 'Failed to fetch KG data');
      reply.status(500).send({ error: 'Failed to fetch KG data' });
    }
  });

  // GET /kg/sites - list sites in KG schema
  fastify.get('/kg/sites', { preHandler: [fastify.authenticate] }, async (request: JwtRequest, reply: FastifyReply) => {
    const userId = request.user?.sub;
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' });
    try {
      const rows = await withRls(userId.toString(), async (conn) => {
        const res = await conn.request().query(`
          SELECT
            s.site_id as id,
            s.name,
            s.city,
            s.state,
            s.created_at,
            COUNT(DISTINCT z.zone_id) as zone_count,
            COUNT(DISTINCT a.asset_id) as asset_count,
            COUNT(DISTINCT e.event_id) as event_count,
            COUNT(DISTINCT al.alert_id) as alert_count,
            COUNT(DISTINCT t.ticket_id) as ticket_count
          FROM kg.Site s
          LEFT JOIN kg.Zone z ON s.site_id = z.site_id
          LEFT JOIN kg.Asset a ON s.site_id = a.site_id
          LEFT JOIN kg.Event e ON s.site_id = e.site_id
          LEFT JOIN kg.Alert al ON EXISTS (
            SELECT 1 FROM app.Events ae WHERE ae.event_id = al.alert_id AND ae.site_id = s.site_id
          )
          LEFT JOIN kg.Ticket t ON EXISTS (
            SELECT 1 FROM app.Tickets at WHERE at.ticket_id = t.ticket_id AND at.site_id = s.site_id
          )
          GROUP BY s.site_id, s.name, s.city, s.state, s.created_at
          ORDER BY s.name
        `);
        return res.recordset;
      });
      return rows;
    } catch (err) {
      fastify.log.error({ err }, 'Failed to fetch KG sites');
      reply.status(500).send({ error: 'Failed to fetch KG sites' });
    }
  });

  // GET /kg/nodes - get nodes with filtering
  fastify.get('/kg/nodes', { preHandler: [fastify.authenticate] }, async (request: JwtRequest, reply: FastifyReply) => {
    const userId = request.user?.sub;
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' });

    const query = request.query as any;
    const nodeType = query.type;
    const siteId = query.siteId ? parseInt(query.siteId) : undefined;
    const search = query.search;

    try {
      let nodes = await getGraphNodes(userId.toString(), nodeType, siteId);

      // Apply search filter if provided
      if (search) {
        const searchLower = search.toLowerCase();
        nodes = nodes.filter(node =>
          node.label?.toLowerCase().includes(searchLower) ||
          node.site_name?.toLowerCase().includes(searchLower) ||
          node.city?.toLowerCase().includes(searchLower) ||
          node.state?.toLowerCase().includes(searchLower)
        );
      }

      reply.send({
        nodes,
        metadata: {
          total: nodes.length,
          filters: { nodeType, siteId, search }
        }
      });
    } catch (err: any) {
      fastify.log.error({ err }, 'Failed to fetch KG nodes');
      reply.status(500).send({ error: 'Failed to fetch KG nodes' });
    }
  });

  // GET /kg/edges - get edges with filtering
  fastify.get('/kg/edges', { preHandler: [fastify.authenticate] }, async (request: JwtRequest, reply: FastifyReply) => {
    const userId = request.user?.sub;
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' });

    const query = request.query as any;
    const edgeType = query.type;
    const siteId = query.siteId ? parseInt(query.siteId) : undefined;

    try {
      let edges = await getGraphEdges(userId.toString(), siteId);

      // Apply edge type filter if provided
      if (edgeType) {
        edges = edges.filter(edge => edge.edge_type === edgeType);
      }

      reply.send({
        edges,
        metadata: {
          total: edges.length,
          filters: { edgeType, siteId }
        }
      });
    } catch (err: any) {
      fastify.log.error({ err }, 'Failed to fetch KG edges');
      reply.status(500).send({ error: 'Failed to fetch KG edges' });
    }
  });

  // GET /kg/path - find shortest path between nodes
  fastify.get('/kg/path', { preHandler: [fastify.authenticate] }, async (request: JwtRequest, reply: FastifyReply) => {
    const userId = request.user?.sub;
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' });

    const query = request.query as any;
    const startNodeId = query.startId;
    const endNodeId = query.endId;
    const startNodeType = query.startType;
    const endNodeType = query.endType;

    if (!startNodeId || !endNodeId || !startNodeType || !endNodeType) {
      return reply.code(400).send({
        error: 'Missing required parameters: startId, endId, startType, endType'
      });
    }

    try {
      const path = await getShortestPath(userId.toString(), startNodeId, endNodeId, startNodeType, endNodeType);
      reply.send({
        path,
        metadata: {
          start: { id: startNodeId, type: startNodeType },
          end: { id: endNodeId, type: endNodeType },
          pathLength: path.length
        }
      });
    } catch (err: any) {
      fastify.log.error({ err }, 'Failed to find shortest path');
      reply.status(500).send({ error: 'Failed to find shortest path' });
    }
  });

  // GET /kg/neighbors - get neighbors of a node
  fastify.get('/kg/neighbors/:nodeId', { preHandler: [fastify.authenticate] }, async (request: JwtRequest, reply: FastifyReply) => {
    const userId = request.user?.sub;
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' });

    const params = request.params as any;
    const query = request.query as any;
    const nodeId = params.nodeId;
    const nodeType = query.type;
    const depth = query.depth ? parseInt(query.depth) : 1;

    if (!nodeType) {
      return reply.code(400).send({ error: 'Missing required parameter: type' });
    }

    try {
      const neighbors = await getNodeNeighbors(userId.toString(), nodeId, nodeType, depth);
      reply.send({
        neighbors,
        metadata: {
          node: { id: nodeId, type: nodeType },
          depth,
          totalNeighbors: neighbors.length
        }
      });
    } catch (err: any) {
      fastify.log.error({ err }, 'Failed to fetch node neighbors');
      reply.status(500).send({ error: 'Failed to fetch node neighbors' });
    }
  });

  // GET /kg/analytics - get graph analytics
  fastify.get('/kg/analytics', { preHandler: [fastify.authenticate] }, async (request: JwtRequest, reply: FastifyReply) => {
    const userId = request.user?.sub;
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' });

    const query = request.query as any;
    const siteId = query.siteId ? parseInt(query.siteId) : undefined;

    try {
      const analytics = await getGraphAnalytics(userId.toString(), siteId);

      // Transform to key-value pairs
      const metrics = analytics.reduce((acc: any, item: any) => {
        acc[item.metric] = item.value;
        return acc;
      }, {});

      reply.send({
        metrics,
        metadata: {
          siteId,
          timestamp: new Date().toISOString()
        }
      });
    } catch (err: any) {
      fastify.log.error({ err }, 'Failed to fetch KG analytics');
      reply.status(500).send({ error: 'Failed to fetch KG analytics' });
    }
  });

  // POST /kg/subgraph - get subgraph for specific nodes
  fastify.post('/kg/subgraph', { preHandler: [fastify.authenticate] }, async (request: JwtRequest, reply: FastifyReply) => {
    const userId = request.user?.sub;
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' });

    const body = request.body as any;
    const nodeIds = body.nodeIds || [];
    const nodeTypes = body.nodeTypes || [];
    const siteId = body.siteId ? parseInt(body.siteId) : undefined;

    try {
      // Get all nodes and edges
      const [allNodes, allEdges] = await Promise.all([
        getGraphNodes(userId.toString(), undefined, siteId),
        getGraphEdges(userId.toString(), siteId)
      ]);

      // Filter nodes based on provided criteria
      let subgraphNodes = allNodes;
      if (nodeIds.length > 0) {
        subgraphNodes = subgraphNodes.filter(node => nodeIds.includes(node.id.toString()));
      }
      if (nodeTypes.length > 0) {
        subgraphNodes = subgraphNodes.filter(node => nodeTypes.includes(node.node_type));
      }

      // Get node IDs for edge filtering
      const subgraphNodeIds = new Set(subgraphNodes.map(node => node.id.toString()));

      // Filter edges to only include those connecting subgraph nodes
      const subgraphEdges = allEdges.filter(edge =>
        subgraphNodeIds.has(edge.source_id.toString()) &&
        subgraphNodeIds.has(edge.target_id.toString())
      );

      reply.send({
        nodes: subgraphNodes,
        edges: subgraphEdges,
        metadata: {
          totalNodes: subgraphNodes.length,
          totalEdges: subgraphEdges.length,
          filters: { nodeIds, nodeTypes, siteId }
        }
      });
    } catch (err: any) {
      fastify.log.error({ err }, 'Failed to fetch subgraph');
      reply.status(500).send({ error: 'Failed to fetch subgraph' });
    }
  });
}
