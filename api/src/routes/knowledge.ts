import { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';
import { RequestWithSql, getSqlConnection } from '../db/sql';

interface JwtRequest extends RequestWithSql {
  user: { sub: number }
}

export async function registerKnowledgeRoutes(fastify: FastifyInstance) {
  // GET /knowledge/articles - List knowledge base articles
  fastify.get('/knowledge/articles', async (request: JwtRequest, reply) => {
    const querySchema = z.object({
      category: z.string().optional(),
      asset_type: z.string().optional(),
      search: z.string().optional(),
      page: z.number().default(1),
      limit: z.number().default(20)
    });

    const query = querySchema.safeParse(request.query);
    if (!query.success) {
      return reply.code(400).send({ error: 'Invalid query parameters' });
    }

    try {
      const conn = await getSqlConnection(request);
      const offset = (query.data.page - 1) * query.data.limit;

      let sql = `
        SELECT 
          ka.*,
          u.name as author_name,
          c.name as category_name,
          (
            SELECT COUNT(DISTINCT ar.ticket_id)
            FROM app.ArticleReferences ar
            WHERE ar.article_id = ka.article_id
            AND ar.was_helpful = 1
          ) as successful_uses
        FROM app.KnowledgeArticles ka
        JOIN app.Users u ON ka.created_by = u.user_id
        JOIN app.Categories c ON ka.category_id = c.category_id
        WHERE ka.is_published = 1
      `;

      const params: any = {};

      if (query.data.category) {
        sql += ` AND c.name = @category`;
        params.category = query.data.category;
      }

      if (query.data.asset_type) {
        sql += ` AND ka.asset_type = @asset_type`;
        params.asset_type = query.data.asset_type;
      }

      if (query.data.search) {
        sql += ` AND (
          ka.title LIKE '%' + @search + '%'
          OR ka.content LIKE '%' + @search + '%'
          OR ka.tags LIKE '%' + @search + '%'
        )`;
        params.search = query.data.search;
      }

      sql += ` ORDER BY ka.view_count DESC
              OFFSET @offset ROWS
              FETCH NEXT @limit ROWS ONLY`;

      params.offset = offset;
      params.limit = query.data.limit;

      const req = conn.request();
      Object.entries(params).forEach(([key, value]) => {
        req.input(key, value);
      });

      const result = await req.query(sql);
      return result.recordset;
    } catch (err) {
      fastify.log.error({ err }, 'Failed to fetch knowledge articles');
      return reply.code(500).send({ error: 'Failed to fetch knowledge articles' });
    }
  });

  // POST /knowledge/articles - Create new article
  fastify.post('/knowledge/articles', async (request: JwtRequest, reply) => {
    const schema = z.object({
      title: z.string(),
      content: z.string(),
      category_id: z.number(),
      asset_type: z.string().optional(),
      tags: z.array(z.string()).optional(),
      solution_steps: z.array(z.string()).optional(),
      resolution_time_mins: z.number().optional(),
      is_published: z.boolean().default(false)
    });

    const body = schema.safeParse(request.body);
    if (!body.success) {
      return reply.code(400).send({ error: 'Invalid article data' });
    }

    try {
      const conn = await getSqlConnection(request);
      const result = await conn.request()
        .input('title', body.data.title)
        .input('content', body.data.content)
        .input('category_id', body.data.category_id)
        .input('asset_type', body.data.asset_type)
        .input('tags', body.data.tags ? JSON.stringify(body.data.tags) : null)
        .input('solution_steps', body.data.solution_steps ? JSON.stringify(body.data.solution_steps) : null)
        .input('resolution_time_mins', body.data.resolution_time_mins)
        .input('is_published', body.data.is_published)
        .input('created_by', request.user.sub)
        .query(`
          INSERT INTO app.KnowledgeArticles (
            title, content, category_id, asset_type,
            tags, solution_steps, resolution_time_mins,
            is_published, created_by, created_at, updated_at
          )
          VALUES (
            @title, @content, @category_id, @asset_type,
            @tags, @solution_steps, @resolution_time_mins,
            @is_published, @created_by, SYSUTCDATETIME(), SYSUTCDATETIME()
          );

          SELECT * FROM app.KnowledgeArticles WHERE article_id = SCOPE_IDENTITY();
        `);

      return reply.code(201).send(result.recordset[0]);
    } catch (err) {
      fastify.log.error({ err }, 'Failed to create knowledge article');
      return reply.code(500).send({ error: 'Failed to create knowledge article' });
    }
  });

  // GET /knowledge/recommendations/:ticketId
  fastify.get('/knowledge/recommendations/:ticketId', async (request: JwtRequest, reply) => {
    const params = z.object({
      ticketId: z.string()
    }).safeParse(request.params);

    if (!params.success) {
      return reply.code(400).send({ error: 'Invalid ticket ID' });
    }

    try {
      const conn = await getSqlConnection(request);
      const result = await conn.request()
        .input('ticket_id', params.data.ticketId)
        .input('max_results', 5)
        .execute('app.usp_GetKnowledgeRecommendations');

      return result.recordset;
    } catch (err) {
      fastify.log.error({ err }, 'Failed to get knowledge recommendations');
      return reply.code(500).send({ error: 'Failed to get knowledge recommendations' });
    }
  });

  // POST /knowledge/references - Record article usage
  fastify.post('/knowledge/references', async (request: JwtRequest, reply) => {
    const schema = z.object({
      article_id: z.number(),
      ticket_id: z.number(),
      was_helpful: z.boolean(),
      resolution_time_mins: z.number().optional()
    });

    const body = schema.safeParse(request.body);
    if (!body.success) {
      return reply.code(400).send({ error: 'Invalid reference data' });
    }

    try {
      const conn = await getSqlConnection(request);
      const result = await conn.request()
        .input('article_id', body.data.article_id)
        .input('ticket_id', body.data.ticket_id)
        .input('was_helpful', body.data.was_helpful)
        .input('resolution_time_mins', body.data.resolution_time_mins)
        .query(`
          INSERT INTO app.ArticleReferences (
            article_id, ticket_id, was_helpful,
            resolution_time_mins, applied_at
          )
          VALUES (
            @article_id, @ticket_id, @was_helpful,
            @resolution_time_mins, SYSUTCDATETIME()
          );

          -- Update article metrics
          UPDATE app.KnowledgeArticles
          SET 
            help_count = help_count + CASE WHEN @was_helpful = 1 THEN 1 ELSE 0 END,
            success_rate = (
              SELECT CAST(COUNT(*) * 100.0 / NULLIF(COUNT(*), 0) as DECIMAL(5,2))
              FROM app.ArticleReferences
              WHERE article_id = @article_id
              AND was_helpful = 1
            )
          WHERE article_id = @article_id;

          SELECT * FROM app.ArticleReferences WHERE reference_id = SCOPE_IDENTITY();
        `);

      return reply.code(201).send(result.recordset[0]);
    } catch (err) {
      fastify.log.error({ err }, 'Failed to record article reference');
      return reply.code(500).send({ error: 'Failed to record article reference' });
    }
  });

  // GET /analytics/metrics/tickets - Get ticket metrics
  fastify.get('/analytics/metrics/tickets', async (request: JwtRequest, reply) => {
    try {
      const conn = await getSqlConnection(request);
      const result = await conn.request().query(`
        SELECT * FROM app.vw_TicketMetrics
        ORDER BY hour_bucket DESC
      `);

      return result.recordset;
    } catch (err) {
      fastify.log.error({ err }, 'Failed to fetch ticket metrics');
      return reply.code(500).send({ error: 'Failed to fetch ticket metrics' });
    }
  });

  // GET /analytics/asset/:assetId/impact - Get asset impact analysis
  fastify.get('/analytics/asset/:assetId/impact', async (request: JwtRequest, reply) => {
    const params = z.object({
      assetId: z.string()
    }).safeParse(request.params);

    if (!params.success) {
      return reply.code(400).send({ error: 'Invalid asset ID' });
    }

    try {
      const conn = await getSqlConnection(request);
      const result = await conn.request()
        .input('asset_id', params.data.assetId)
        .execute('app.usp_AnalyzeAssetImpact');

      if (!result.recordset[0]) {
        return reply.code(404).send({ error: 'Asset not found' });
      }

      return result.recordset[0];
    } catch (err) {
      fastify.log.error({ err }, 'Failed to get asset impact analysis');
      return reply.code(500).send({ error: 'Failed to get asset impact analysis' });
    }
  });
}
