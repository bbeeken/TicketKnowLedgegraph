import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { withRls, getKgData } from '../sql';

// Register all KG-related routes
export async function registerKgRoutes(fastify: FastifyInstance) {
  // /kg route (stub, implement as needed)
  fastify.get('/kg', { preHandler: [fastify.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).user?.sub;
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' });
    try {
      const data = await getKgData(userId);
      reply.send(data);
    } catch (err: any) {
      fastify.log.error({ err }, 'Failed to fetch KG data');
      reply.status(500).send({ error: 'Failed to fetch KG data' });
    }
  });

  // GET /kg/sites - list sites in KG schema
  fastify.get('/kg/sites', { preHandler: [fastify.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).user?.sub;
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' });
    try {
      const rows = await withRls(String(userId), async (conn) => {
        const res = await conn.request().query('SELECT site_id as id, name, city, state FROM kg.Site ORDER BY name');
        return res.recordset;
      });
      return rows;
    } catch (err) {
      fastify.log.error({ err }, 'Failed to fetch KG sites');
      return reply.code(500).send({ error: 'Failed to fetch KG sites' });
    }
  });

  // GET /kg/blast-radius/:assetId - get blast radius analysis
  fastify.get('/kg/blast-radius/:assetId', { preHandler: [fastify.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).user?.sub;
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' });

    const params = request.params as any;
    const query = request.query as any;
    const assetId = parseInt(params.assetId);
    const type = query.type || 'both'; // 'network', 'power', 'both'
    const maxHops = query.maxHops ? parseInt(query.maxHops) : 3;

    if (!assetId || isNaN(assetId)) {
      return reply.code(400).send({ error: 'Invalid asset ID' });
    }

    try {
      // Get source asset info
      const sourceAssetResult = await withRls(userId.toString(), async (conn) => {
        const res = await conn.request()
          .input('assetId', assetId)
          .query('SELECT asset_id, type, site_id FROM kg.Asset WHERE asset_id = @assetId');
        return res.recordset;
      });

      if (sourceAssetResult.length === 0) {
        return reply.code(404).send({ error: 'Asset not found' });
      }

      const sourceAsset = sourceAssetResult[0];
      let networkBlastRadius: any[] = [];
      let powerBlastRadius: any[] = [];

      if (type === 'network' || type === 'both') {
        networkBlastRadius = await withRls(userId.toString(), async (conn) => {
          const res = await conn.request()
            .input('assetId', assetId)
            .input('maxHops', maxHops)
            .query('SELECT affected_asset_id, min_distance, relationship_path FROM kg.fn_NetworkBlastRadius(@assetId, @maxHops) ORDER BY min_distance, affected_asset_id');
          return res.recordset;
        });
      }

      if (type === 'power' || type === 'both') {
        powerBlastRadius = await withRls(userId.toString(), async (conn) => {
          const res = await conn.request()
            .input('assetId', assetId)
            .input('maxHops', maxHops)
            .query('SELECT affected_asset_id, power_dependency_distance FROM kg.fn_PowerBlastRadius(@assetId, @maxHops) ORDER BY power_dependency_distance, affected_asset_id');
          return res.recordset;
        });
      }

      reply.send({
        sourceAsset,
        networkBlastRadius,
        powerBlastRadius,
        metadata: {
          type,
          maxHops,
          networkAffectedCount: networkBlastRadius.length,
          powerAffectedCount: powerBlastRadius.length
        }
      });
    } catch (err: any) {
      fastify.log.error({ err }, 'Failed to calculate blast radius');
      reply.status(500).send({ error: 'Failed to calculate blast radius' });
    }
  });

  // GET /kg/co-failure/:siteId - get co-failure analysis
  fastify.get('/kg/co-failure/:siteId', { preHandler: [fastify.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).user?.sub;
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' });

    const params = request.params as any;
    const query = request.query as any;
    const siteId = parseInt(params.siteId);
    const windowMinutes = query.windowMinutes ? parseInt(query.windowMinutes) : 120;
    const minOccurrences = query.minOccurrences ? parseInt(query.minOccurrences) : 2;

    if (!siteId || isNaN(siteId)) {
      return reply.code(400).send({ error: 'Invalid site ID' });
    }

    try {
      const coFailureResult = await withRls(userId.toString(), async (conn) => {
        const res = await conn.request()
          .input('siteId', siteId)
          .input('windowMinutes', windowMinutes)
          .input('minOccurrences', minOccurrences)
          .query('SELECT asset_id_1, asset_id_2, total_co_failures, failure_window_count, avg_co_failures_per_window FROM kg.fn_CofailAnalysis(@siteId, @windowMinutes, @minOccurrences) ORDER BY total_co_failures DESC');
        return res.recordset;
      });

      reply.send({
        coFailures: coFailureResult,
        metadata: {
          siteId,
          windowMinutes,
          minOccurrences,
          totalPairs: coFailureResult.length
        }
      });
    } catch (err: any) {
      fastify.log.error({ err }, 'Failed to get co-failure analysis');
      reply.status(500).send({ error: 'Failed to get co-failure analysis' });
    }
  });

  // GET /kg/centrality - get graph centrality metrics
  fastify.get('/kg/centrality', { preHandler: [fastify.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).user?.sub;
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' });

    const query = request.query as any;
    const siteId = query.siteId ? parseInt(query.siteId) : null;

    try {
      const centralityResult = await withRls(userId.toString(), async (conn) => {
        const res = await conn.request()
          .input('siteId', siteId)
          .query('SELECT asset_id, asset_type, site_id, outbound_connections, inbound_connections, total_degree, centrality_classification FROM kg.fn_GraphCentrality(@siteId) ORDER BY total_degree DESC, asset_id');
        return res.recordset;
      });

      // Group by classification for summary
      const summary = centralityResult.reduce((acc: any, item: any) => {
        const classification = item.centrality_classification;
        acc[classification] = (acc[classification] || 0) + 1;
        return acc;
      }, {});

      reply.send({
        centrality: centralityResult,
        summary,
        metadata: {
          siteId,
          totalAssets: centralityResult.length
        }
      });
    } catch (err: any) {
      fastify.log.error({ err }, 'Failed to get centrality metrics');
      reply.status(500).send({ error: 'Failed to get centrality metrics' });
    }
  });

  // GET /kg/advanced-analytics - get advanced analytics summary
  fastify.get('/kg/advanced-analytics', { preHandler: [fastify.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).user?.sub;
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' });

    try {
      const advancedMetricsResult = await withRls(userId.toString(), async (conn) => {
        const res = await conn.request()
          .query('SELECT metric_name, metric_value, site_id FROM kg.vw_AdvancedGraphAnalytics ORDER BY metric_name, site_id');
        return res.recordset;
      });

      // Group metrics by site
      const metricsBySite: Record<string, any> = {};
      const globalMetrics: Record<string, any> = {};

      for (const row of advancedMetricsResult) {
        if (row.site_id === null) {
          globalMetrics[row.metric_name] = row.metric_value;
        } else {
          if (!metricsBySite[row.site_id]) {
            metricsBySite[row.site_id] = {};
          }
          metricsBySite[row.site_id][row.metric_name] = row.metric_value;
        }
      }

      reply.send({
        globalMetrics,
        metricsBySite,
        metadata: {
          timestamp: new Date().toISOString(),
          totalSites: Object.keys(metricsBySite).length
        }
      });
    } catch (err: any) {
      fastify.log.error({ err }, 'Failed to get advanced analytics');
      reply.status(500).send({ error: 'Failed to get advanced analytics' });
    }
  });

  // GET /kg/semantic-search - semantic search with embeddings
  fastify.get('/kg/semantic-search', { preHandler: [fastify.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).user?.sub;
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' });

    const query = request.query as any;
    const searchQuery = query.q || query.query || '';
    const entityType = query.type || 'asset';
    const limit = parseInt(query.limit || '20');

    if (!searchQuery || searchQuery.length < 2) {
      return reply.status(400).send({ error: 'Search query must be at least 2 characters' });
    }

    try {
      const searchResults = await withRls(userId.toString(), async (conn) => {
        const res = await conn.request()
          .input('query', searchQuery)
          .input('entityType', entityType)
          .input('limit', limit)
          .query(`
            SELECT TOP (@limit)
              si.entity_id,
              si.entity_type,
              si.searchable_text,
              si.keywords,
              si.tags,
              -- Calculate relevance score
              CASE 
                WHEN si.searchable_text LIKE '%' + @query + '%' THEN 1.0
                WHEN si.keywords LIKE '%' + @query + '%' THEN 0.8
                ELSE 0.5
              END as relevance_score,
              -- Include asset details if searching assets
              CASE WHEN si.entity_type = 'asset' THEN (
                SELECT a.type, a.model, a.vendor, s.name as site_name, s.city, s.state
                FROM app.Assets a
                JOIN app.Sites s ON a.site_id = s.site_id
                WHERE a.asset_id = si.entity_id
                FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
              ) END as entity_details
            FROM semantic.SearchIndex si
            WHERE (@entityType IS NULL OR si.entity_type = @entityType)
              AND (
                si.searchable_text LIKE '%' + @query + '%'
                OR si.keywords LIKE '%' + @query + '%'
                OR si.tags LIKE '%' + @query + '%'
              )
            ORDER BY relevance_score DESC, si.entity_id
          `);
        
        // Parse entity_details JSON
        return res.recordset.map((row: any) => ({
          ...row,
          entity_details: row.entity_details ? JSON.parse(row.entity_details) : null
        }));
      });

      reply.send({
        query: searchQuery,
        entityType,
        results: searchResults,
        metadata: {
          totalResults: searchResults.length,
          maxResults: limit,
          timestamp: new Date().toISOString()
        }
      });
    } catch (err: any) {
      fastify.log.error({ err }, 'Failed to perform semantic search');
      reply.status(500).send({ error: 'Failed to perform semantic search' });
    }
  });
}
