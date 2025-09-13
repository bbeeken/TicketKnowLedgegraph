import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { RequestWithSql, getSqlConnection } from '../db/sql';
import { getRequestFromContext } from '../middleware/rls';
import { withRls } from '../sql';

// Extend FastifyJWT types
declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: { sub: number }
  }
}

interface JwtRequest extends RequestWithSql {
  user: { sub: number }
}

export async function registerTicketRoutes(fastify: FastifyInstance) {
  // GET /tickets/metadata - get dropdown data for forms
  fastify.get(
    '/tickets/metadata',
    { preHandler: [fastify.authenticate] },
    async (request: JwtRequest, reply: FastifyReply) => {
      try {
        const userId = (request as any).user?.sub;
        if (!userId) return reply.code(401).send({ error: 'Unauthorized' });

        const result = await withRls(userId, async (conn) => {
          // Get sites (use MIN to pick one site_id per name to eliminate duplicates)
          const sitesRes = await conn.request().query(`
            SELECT MIN(site_id) as site_id, name, name as display_name 
            FROM app.Sites  
            GROUP BY name
            ORDER BY name
          `);

          // Get categories
          const categoriesRes = await conn.request().query(`
            SELECT DISTINCT category_id, name, name as description 
            FROM app.Categories 
            ORDER BY name
          `);

          // Get users
          const usersRes = await conn.request().query(`
            SELECT DISTINCT user_id, name, email, role 
            FROM app.Users 
            WHERE is_active = 1 
            ORDER BY name
          `);

          // Get statuses (include sort_order in SELECT for ORDER BY)
          const statusesRes = await conn.request().query(`
            SELECT DISTINCT status as status_code, status as status_name, status as description, sort_order
            FROM app.Statuses 
            ORDER BY sort_order, status
          `);

          // Get substatuses (include sort_order in SELECT for ORDER BY)
          const substatusesRes = await conn.request().query(`
            SELECT DISTINCT substatus_code, substatus_name, status as status_code, substatus_name as description, sort_order
            FROM app.Substatuses 
            WHERE is_active = 1 
            ORDER BY sort_order, substatus_name
          `);

          return {
            sites: sitesRes.recordset,
            categories: categoriesRes.recordset,
            users: usersRes.recordset,
            statuses: statusesRes.recordset.map(s => ({ status_code: s.status_code, status_name: s.status_name, description: s.description })),
            substatuses: substatusesRes.recordset.map(s => ({ substatus_code: s.substatus_code, substatus_name: s.substatus_name, status_code: s.status_code, description: s.description }))
          };
        });

        return result;
      } catch (err) {
        fastify.log.error({ err }, 'Failed to fetch ticket metadata');
        return reply.code(500).send({ error: 'Failed to fetch metadata' });
      }
    }
  );

  // GET /tickets - list tickets with privacy filtering
  fastify.get(
    '/tickets',
    { preHandler: [fastify.authenticate] },
    async (request: JwtRequest, reply: FastifyReply) => {
      try {
        const userId = (request as any).user?.sub;
        if (!userId) return reply.code(401).send({ error: 'Unauthorized' });

        // Return ticket list with fields matching UI schema from TicketMaster + joins
        const sql = `
          SELECT 
            tm.ticket_id,
            tm.ticket_no,
            tm.summary,
            tm.description,
            COALESCE(t.problem_description, '') AS problem_description,
            tm.status,
            tm.substatus_code,
            COALESCE(ss.substatus_name, tm.substatus_code) AS substatus_name,
            COALESCE(tm.severity, 0) AS severity,
            tm.category_id,
            COALESCE(c.name, 'General') AS category_name,
            tm.site_id,
            COALESCE(s.name, 'Unknown Site') AS site_name,
            COALESCE(t.privacy_level, 'public') AS privacy_level,
            COALESCE(t.is_private, 0) AS is_private,
            tm.assignee_user_id,
            COALESCE(au.name, 'Unassigned') AS assignee_name,
            tm.team_id,
            tm.created_by,
            COALESCE(cu.name, 'Unknown') AS created_by_name,
            tm.created_at,
            tm.updated_at,
            COALESCE(t.contact_name, '') AS contact_name,
            COALESCE(t.contact_email, '') AS contact_email,
            COALESCE(t.contact_phone, '') AS contact_phone,
            COALESCE((SELECT COUNT(*) FROM app.TicketWatchers tw WHERE tw.ticket_id = tm.ticket_id AND tw.is_active = 1), 0) AS watcher_count,
            COALESCE((SELECT COUNT(*) FROM app.TicketWatchers tw WHERE tw.ticket_id = tm.ticket_id AND tw.is_active = 1 AND tw.watcher_type = 'collaborator'), 0) AS collaborator_count
          FROM app.TicketMaster tm
          LEFT JOIN app.Tickets t ON t.ticket_id = tm.ticket_id
          LEFT JOIN app.Sites s ON tm.site_id = s.site_id
          LEFT JOIN app.Categories c ON tm.category_id = c.category_id
          LEFT JOIN app.Substatuses ss ON tm.substatus_code = ss.substatus_code
          LEFT JOIN app.Users au ON tm.assignee_user_id = au.user_id
          LEFT JOIN app.Users cu ON tm.created_by = cu.user_id
          ORDER BY tm.updated_at DESC`;
        
        const result = await withRls(String(userId), async (conn) => {
          const res = await conn.request().query(sql);
          return res.recordset;
        });
        return result;
      } catch (err) {
        fastify.log.error({ err }, 'Failed to fetch tickets');
        if (process.env.NODE_ENV === 'test') {
          return reply.code(500).send({ error: 'Failed to fetch tickets', detail: (err as any)?.message });
        }
        return reply.code(500).send({ error: 'Failed to fetch tickets' });
      }
    }
  );

  // GET /tickets/:id - detail with privacy checking and watcher info
  fastify.get(
    '/tickets/:id',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const paramsSchema = z.object({ id: z.string() });
      const params = paramsSchema.safeParse(request.params);
      if (!params.success)
        return reply.code(400).send({ error: 'Invalid ticket id' });

      const userId = (request as any).user?.sub;
      if (!userId) return reply.code(401).send({ error: 'Unauthorized' });

      try {
        const localReq = getRequestFromContext(request);
        let res: any;
        
        // First check if user can view this ticket
        const privacyCheckSql = `SELECT app.fn_CanUserViewTicket(@ticket_id, @user_id) as can_view`;
        const privacyCheck = localReq 
          ? await localReq.input('ticket_id', params.data.id).input('user_id', userId).query(privacyCheckSql)
          : await withRls(userId, async (conn) => {
              return conn.request().input('ticket_id', params.data.id).input('user_id', userId).query(privacyCheckSql);
            });

        if (!privacyCheck.recordset[0]?.can_view) {
          return reply.code(404).send({ error: 'Ticket not found' });
        }

        // Get ticket details with enhanced information
        const sql = `
          SELECT 
            tm.ticket_id,
            tm.ticket_no,
            tm.status,
            tm.substatus_code,
            st.substatus_name,
            tm.severity,
            tm.category_id,
            c.name as category_name,
            tm.summary,
            tm.description,
            tm.site_id,
            s.name as site_name,
            tt.privacy_level,
            tt.is_private,
            tm.assignee_user_id,
            au.name as assignee_name,
            tm.team_id,
            tm.vendor_id,
            tm.due_at,
            tm.sla_plan_id,
            tm.created_by,
            cu.name as created_by_name,
            tm.created_at,
            tm.updated_at,
            tt.contact_name,
            tt.contact_email,
            tt.contact_phone,
            tt.problem_description,
            CAST(tm.rowversion AS varbinary(8)) as rowversion_bin,
            (SELECT COUNT(*) FROM app.TicketWatchers tw WHERE tw.ticket_id = tm.ticket_id AND tw.is_active = 1) as watcher_count,
            (SELECT COUNT(*) FROM app.TicketWatchers tw WHERE tw.ticket_id = tm.ticket_id AND tw.is_active = 1 AND tw.watcher_type = 'collaborator') as collaborator_count
          FROM app.TicketMaster tm
          LEFT JOIN app.Tickets tt ON tt.ticket_id = tm.ticket_id
          LEFT JOIN app.Sites s ON tm.site_id = s.site_id
          LEFT JOIN app.Categories c ON tm.category_id = c.category_id
          LEFT JOIN app.Substatuses st ON tm.substatus_code = st.substatus_code
          LEFT JOIN app.Users au ON tm.assignee_user_id = au.user_id
          LEFT JOIN app.Users cu ON tm.created_by = cu.user_id
          WHERE tm.ticket_id = @id`;
          
        if (localReq) {
          res = await localReq.input('id', params.data.id).query(sql);
        } else {
          res = await withRls(userId, async (conn) => {
            return conn.request().input('id', params.data.id).query(sql);
          });
        }

        const row = res.recordset[0];
        if (!row) return reply.code(404).send({ error: 'Ticket not found' });
        
        const rowversionBuf = row.rowversion_bin as Buffer;
        const rowversionBase64 = rowversionBuf
          ? rowversionBuf.toString('base64')
          : null;
        if (rowversionBase64) reply.header('ETag', `W/"${rowversionBase64}"`);

        // Get watchers for this ticket
        const watchersSql = `EXEC app.usp_GetTicketWatchers @ticket_id = @ticket_id`;
        const watchersRes = localReq
          ? await localReq.input('ticket_id', params.data.id).query(watchersSql)
          : await withRls(userId, async (conn) => {
              return conn.request().input('ticket_id', params.data.id).query(watchersSql);
            });

        // Get associated assets for this ticket
        const assetsSql = `
          SELECT 
            a.asset_id,
            a.type,
            a.model,
            a.vendor,
            a.serial,
            a.location,
            a.installed_at,
            a.purchase_date,
            a.warranty_until
          FROM app.TicketAssets ta
          INNER JOIN app.Assets a ON ta.asset_id = a.asset_id
          WHERE ta.ticket_id = @ticket_id`;
        const assetsRes = localReq
          ? await localReq.input('ticket_id', params.data.id).query(assetsSql)
          : await withRls(userId, async (conn) => {
              return conn.request().input('ticket_id', params.data.id).query(assetsSql);
            });

        const ticket = {
          ticket_id: row.ticket_id,
          ticket_no: row.ticket_no,
          summary: row.summary,
          description: row.description,
          status: row.status,
          substatus_code: row.substatus_code,
          substatus_name: row.substatus_name,
          severity: row.severity,
          category_id: row.category_id,
          category_name: row.category_name,
          site_id: row.site_id,
          site_name: row.site_name,
          privacy_level: row.privacy_level,
          is_private: row.is_private,
          assignee_user_id: row.assignee_user_id,
          assignee_name: row.assignee_name,
          team_id: row.team_id,
          created_by: row.created_by,
          created_by_name: row.created_by_name,
          created_at: row.created_at,
          updated_at: row.updated_at,
          contact_name: row.contact_name,
          contact_email: row.contact_email,
          contact_phone: row.contact_phone,
          problem_description: row.problem_description,
          watcher_count: row.watcher_count || 0,
          collaborator_count: row.collaborator_count || 0,
          watchers: watchersRes.recordset || [],
          assets: assetsRes.recordset || []
        };

        return ticket;
      } catch (err) {
        fastify.log.error({ err }, 'Failed to fetch ticket detail');
        return reply.code(500).send({ error: 'Failed to fetch ticket' });
      }
    }
  );

  // POST /tickets - create a new ticket with privacy support
  fastify.post(
    '/tickets',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const bodySchema = z.object({
        status: z.string(),
        substatus_code: z.string().optional(),
        severity: z.number().optional(),
        category_id: z.number().optional(),
        summary: z.string().min(1),
        description: z.string().optional(),
        site_id: z.number().optional(),
        assignee_user_id: z.number().nullable().optional(),
        team_id: z.number().nullable().optional(),
        vendor_id: z.number().nullable().optional(),
        due_at: z.string().nullable().optional(),
        sla_plan_id: z.number().nullable().optional(),
        asset_ids: z.array(z.number()).optional(),
        created_by: z.number().optional(),
        // Enhanced fields
        privacy_level: z.enum(['public', 'site_only', 'private']).default('public'),
        contact_name: z.string().optional(),
        contact_email: z.string().optional(),
        contact_phone: z.string().optional(),
        problem_description: z.string().optional(),
        watchers: z.array(z.object({
          user_id: z.number().nullable(),
          email: z.string().nullable(),
          name: z.string().nullable(),
          watcher_type: z.enum(['interested', 'collaborator', 'site_contact']).default('interested')
        })).optional()
      });
      const parsed = bodySchema.safeParse(request.body);
      if (!parsed.success)
        return reply.code(400).send({ error: 'Invalid payload', details: parsed.error.issues });

      const userId = (request as any).user?.sub;
      if (!userId) return reply.code(401).send({ error: 'Unauthorized' });

      try {
        const payload = {
          ...parsed.data,
          created_by: parsed.data.created_by || Number(userId),
          is_private: parsed.data.privacy_level === 'private' ? 1 : 0,
          severity: parsed.data.severity || 2  // Default to "Minor" severity if not provided
        };
        
        const localReq = getRequestFromContext(request);
        if (localReq) {
          const req = localReq;
          req.input('payload', JSON.stringify(payload));
          const res = await req.execute('app.usp_CreateOrUpdateTicket_v2');
          const ticketId = res.recordset && res.recordset[0] ? res.recordset[0].ticket_id : null;
          
          // Add watchers if provided
          if (parsed.data.watchers && ticketId) {
            for (const watcher of parsed.data.watchers) {
              try {
                await req.input('ticket_id', ticketId)
                         .input('user_id', watcher.user_id)
                         .input('email', watcher.email)
                         .input('name', watcher.name)
                         .input('watcher_type', watcher.watcher_type)
                         .input('added_by', userId)
                         .execute('app.usp_AddTicketWatcher');
              } catch (watcherErr) {
                fastify.log.warn({ watcherErr, watcher }, 'Failed to add watcher during ticket creation');
              }
            }
          }
          
          return reply.code(201).send({ ticket_id: ticketId });
        }
        
        const ticketId = await withRls(userId, async (conn) => {
          const r = await conn
            .request()
            .input('payload', JSON.stringify(payload))
            .execute('app.usp_CreateOrUpdateTicket_v2');
          return r.recordset && r.recordset[0] ? r.recordset[0].ticket_id : null;
        });
        
        // Add watchers if provided
        if (parsed.data.watchers && ticketId) {
          for (const watcher of parsed.data.watchers) {
            try {
              await withRls(userId, async (conn) => {
                return conn.request()
                  .input('ticket_id', ticketId)
                  .input('user_id', watcher.user_id)
                  .input('email', watcher.email)
                  .input('name', watcher.name)
                  .input('watcher_type', watcher.watcher_type)
                  .input('added_by', userId)
                  .execute('app.usp_AddTicketWatcher');
              });
            } catch (watcherErr) {
              fastify.log.warn({ watcherErr, watcher }, 'Failed to add watcher during ticket creation');
            }
          }
        }
        
        return reply.code(201).send({ ticket_id: ticketId });
      } catch (err: any) {
        fastify.log.error({ err }, 'Failed to create ticket');
        if (process.env.NODE_ENV === 'test') {
          return reply.code(500).send({ error: 'Failed to create ticket', detail: (err as any)?.message });
        }
        return reply.code(500).send({ error: 'Failed to create ticket' });
      }
    }
  );

  // PATCH /tickets/:id - update ticket using proc v2 with If-Match
  fastify.patch(
    '/tickets/:id',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const paramsSchema = z.object({ id: z.string() });
      const bodySchema = z.object({ data: z.any() });
      const params = paramsSchema.safeParse(request.params);
      const body = bodySchema.safeParse(request.body);
      if (!params.success || !body.success)
        return reply.code(400).send({ error: 'Invalid payload' });

      const userId = (request as any).user?.sub;
      if (!userId) return reply.code(401).send({ error: 'Unauthorized' });

      const ifMatch = request.headers['if-match'] as string | undefined;
      let expectedRowversion: Buffer | null = null;
      if (ifMatch) {
        const m = ifMatch.match(/W\/"(.+)"/);
        if (m) {
          try {
            expectedRowversion = Buffer.from(m[1], 'base64');
          } catch (e) {
            // ignore parse errors
          }
        }
      }

      try {
        const payload = { ticket_id: Number(params.data.id), ...(body.data) };
  const localReq = getRequestFromContext(request);
        if (localReq) {
          const req = localReq;
          req.input('payload', JSON.stringify(payload));
          if (expectedRowversion)
            req.input('expected_rowversion', expectedRowversion);
          try {
            const res = await req.execute('app.usp_CreateOrUpdateTicket_v2');
            const out =
              res.recordset && res.recordset[0]
                ? res.recordset[0].ticket_id
                : null;
            return { ticket_id: out };
          } catch (e: any) {
            // SQL THROW for rowversion mismatch mapped to 412
            if (e && e.message && e.message.indexOf('Rowversion mismatch') !== -1)
              return reply.code(412).send({ error: 'Rowversion mismatch' });
            throw e;
          }
        }

        try {
          const out = await withRls(userId, async (conn) => {
            const r = conn.request().input('payload', JSON.stringify(payload));
            if (expectedRowversion)
              r.input('expected_rowversion', expectedRowversion);
            const rr = await r.execute('app.usp_CreateOrUpdateTicket_v2');
            return rr.recordset && rr.recordset[0]
              ? rr.recordset[0].ticket_id
              : null;
          });
          return { ticket_id: out };
        } catch (err: any) {
          if (err && err.message && err.message.indexOf('Rowversion mismatch') !== -1)
            return reply.code(412).send({ error: 'Rowversion mismatch' });
          throw err;
        }
      } catch (err: any) {
        fastify.log.error({ err }, 'Failed to update ticket');
        return reply.code(500).send({ error: 'Failed to update ticket' });
      }
    }
  );

  // POST /tickets/:id/messages - add message/update (supports HTML/text)
  fastify.post(
    '/tickets/:id/messages',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const paramsSchema = z.object({ id: z.string() });
      const bodySchema = z.object({
        message_type: z.string().default('comment'),
        body: z.string().optional(),
        body_html: z.string().optional(),
        content_format: z.enum(['text','html']).default('text'),
        visibility: z.string().optional(),
      });
      const params = paramsSchema.safeParse(request.params);
      const body = bodySchema.safeParse(request.body);
      if (!params.success || !body.success)
        return reply.code(400).send({ error: 'Invalid payload' });

      const userId = (request as any).user?.sub;
      if (!userId) return reply.code(401).send({ error: 'Unauthorized' });

      try {
        const localReq = getRequestFromContext(request);
        const run = async (req: any) => {
          req.input('ticket_id', Number(params.data.id));
          req.input('author_id', Number(userId));
          req.input('message_type', body.data.message_type);
          req.input('body', body.data.body ?? null);
          req.input('body_html', body.data.body_html ?? null);
          req.input('content_format', body.data.content_format ?? 'text');
          req.input('visibility', body.data.visibility ?? 'public');
          const res = await req.execute('app.usp_AddTicketMessage');
          return res.recordset?.[0]?.comment_id ?? null;
        };
        const commentId = localReq
          ? await run(localReq)
          : await withRls(userId, (conn) => run(conn.request()));
        return reply.code(201).send({ comment_id: commentId });
      } catch (err) {
        fastify.log.error({ err }, 'Failed to add ticket message');
        return reply.code(500).send({ error: 'Failed to add ticket message' });
      }
    }
  );

  // GET /tickets/:id/messages - list messages (paged)
  fastify.get(
    '/tickets/:id/messages',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const paramsSchema = z.object({ id: z.string() });
      const querySchema = z.object({ offset: z.string().optional(), limit: z.string().optional() });
      const params = paramsSchema.safeParse(request.params);
      const query = querySchema.safeParse(request.query);
      if (!params.success || !query.success) return reply.code(400).send({ error: 'Invalid params' });

      const userId = (request as any).user?.sub;
      if (!userId) return reply.code(401).send({ error: 'Unauthorized' });

      try {
        const offset = Number(query.data.offset ?? 0);
        const limit = Number(query.data.limit ?? 50);
        const localReq = getRequestFromContext(request);
        const run = async (req: any) => {
          req.input('ticket_id', Number(params.data.id));
          req.input('offset', offset);
          req.input('limit', limit);
          const res = await req.execute('app.usp_GetTicketMessages');
          return res.recordset;
        };
        const rows = localReq ? await run(localReq) : await withRls(userId, (c) => run(c.request()));
        return rows;
      } catch (err) {
        fastify.log.error({ err }, 'Failed to fetch ticket messages');
        return reply.code(500).send({ error: 'Failed to fetch ticket messages' });
      }
    }
  );

  // PATCH /tickets/:id/type - set ticket type
  fastify.patch(
    '/tickets/:id/type',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const paramsSchema = z.object({ id: z.string() });
      const bodySchema = z.object({ type_id: z.number() });
      const params = paramsSchema.safeParse(request.params);
      const body = bodySchema.safeParse(request.body);
      if (!params.success || !body.success)
        return reply.code(400).send({ error: 'Invalid payload' });

      const userId = (request as any).user?.sub;
      if (!userId) return reply.code(401).send({ error: 'Unauthorized' });

      try {
        const payload = { ticket_id: Number(params.data.id), type_id: body.data.type_id };
        const localReq = getRequestFromContext(request);
        const run = async (req: any) => {
          const r = await req.input('payload', JSON.stringify(payload)).execute('app.usp_CreateOrUpdateTicket_v2');
          return r.recordset?.[0]?.ticket_id ?? null;
        };
        const out = localReq ? await run(localReq) : await withRls(userId, (c) => run(c.request()));
        return { ticket_id: out };
      } catch (err) {
        fastify.log.error({ err }, 'Failed to update ticket type');
        return reply.code(500).send({ error: 'Failed to update ticket type' });
      }
    }
  );

  // POST /tickets/:id/service-request - create or update vendor service request
  fastify.post(
    '/tickets/:id/service-request',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const paramsSchema = z.object({ id: z.string() });
      const bodySchema = z.object({
        vendor_id: z.number(),
        request_type: z.string(),
        status: z.string().optional(),
        notes: z.string().optional(),
        vsr_id: z.number().optional(),
      });
      const params = paramsSchema.safeParse(request.params);
      const body = bodySchema.safeParse(request.body);
      if (!params.success || !body.success)
        return reply.code(400).send({ error: 'Invalid payload' });

      const userId = (request as any).user?.sub;
      if (!userId) return reply.code(401).send({ error: 'Unauthorized' });

      try {
        const payload = { ticket_id: Number(params.data.id), ...body.data };
        const localReq = getRequestFromContext(request);
        const run = async (req: any) => {
          const r = await req.input('payload', JSON.stringify(payload)).execute('app.usp_UpsertVendorServiceRequest');
          return r.recordset?.[0]?.vsr_id ?? null;
        };
        const out = localReq ? await run(localReq) : await withRls(userId, (c) => run(c.request()));
        return reply.code(201).send({ vsr_id: out });
      } catch (err) {
        fastify.log.error({ err }, 'Failed to upsert vendor service request');
        return reply.code(500).send({ error: 'Failed to upsert vendor service request' });
      }
    }
  );

  // === PRIVACY AND WATCHER MANAGEMENT ENDPOINTS ===

  // PATCH /tickets/:id/privacy - update ticket privacy level
  fastify.patch(
    '/tickets/:id/privacy',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const paramsSchema = z.object({ id: z.string() });
      const bodySchema = z.object({ 
        privacy_level: z.enum(['public', 'site_only', 'private']) 
      });
      const params = paramsSchema.safeParse(request.params);
      const body = bodySchema.safeParse(request.body);
      if (!params.success || !body.success)
        return reply.code(400).send({ error: 'Invalid payload' });

      const userId = (request as any).user?.sub;
      if (!userId) return reply.code(401).send({ error: 'Unauthorized' });

      try {
        const localReq = getRequestFromContext(request);
        const run = async (req: any) => {
          req.input('ticket_id', Number(params.data.id));
          req.input('privacy_level', body.data.privacy_level);
          req.input('updated_by', userId);
          const res = await req.execute('app.usp_UpdateTicketPrivacy');
          return res.recordset;
        };
        const result = localReq ? await run(localReq) : await withRls(userId, (c) => run(c.request()));
        return { message: 'Privacy level updated successfully' };
      } catch (err) {
        fastify.log.error({ err }, 'Failed to update ticket privacy');
        return reply.code(500).send({ error: 'Failed to update ticket privacy' });
      }
    }
  );

  // GET /tickets/:id/watchers - get ticket watchers
  fastify.get(
    '/tickets/:id/watchers',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const paramsSchema = z.object({ id: z.string() });
      const params = paramsSchema.safeParse(request.params);
      if (!params.success)
        return reply.code(400).send({ error: 'Invalid ticket id' });

      const userId = (request as any).user?.sub;
      if (!userId) return reply.code(401).send({ error: 'Unauthorized' });

      try {
        // Check if user can view this ticket
        const localReq = getRequestFromContext(request);
        const privacyCheck = async (req: any) => {
          return req.input('ticket_id', params.data.id).input('user_id', userId).query('SELECT app.fn_CanUserViewTicket(@ticket_id, @user_id) as can_view');
        };
        const privacyResult = localReq ? await privacyCheck(localReq) : await withRls(userId, (c) => privacyCheck(c.request()));
        
        if (!privacyResult.recordset[0]?.can_view) {
          return reply.code(404).send({ error: 'Ticket not found' });
        }

        const run = async (req: any) => {
          req.input('ticket_id', Number(params.data.id));
          const res = await req.execute('app.usp_GetTicketWatchers');
          return res.recordset;
        };
        const watchers = localReq ? await run(localReq) : await withRls(userId, (c) => run(c.request()));
        return watchers;
      } catch (err) {
        fastify.log.error({ err }, 'Failed to fetch ticket watchers');
        return reply.code(500).send({ error: 'Failed to fetch ticket watchers' });
      }
    }
  );

  // POST /tickets/:id/watchers - add a watcher to a ticket
  fastify.post(
    '/tickets/:id/watchers',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const paramsSchema = z.object({ id: z.string() });
      const bodySchema = z.object({
        user_id: z.number().nullable().optional(),
        email: z.string().email().nullable().optional(),
        name: z.string().nullable().optional(),
        watcher_type: z.enum(['interested', 'collaborator', 'site_contact', 'assignee_backup']).default('interested'),
        notification_preferences: z.string().optional()
      });
      const params = paramsSchema.safeParse(request.params);
      const body = bodySchema.safeParse(request.body);
      if (!params.success || !body.success)
        return reply.code(400).send({ error: 'Invalid payload' });

      // Validate that either user_id or both email and name are provided
      if (!body.data.user_id && (!body.data.email || !body.data.name)) {
        return reply.code(400).send({ error: 'Must provide either user_id or both email and name' });
      }

      const userId = (request as any).user?.sub;
      if (!userId) return reply.code(401).send({ error: 'Unauthorized' });

      try {
        const localReq = getRequestFromContext(request);
        const run = async (req: any) => {
          req.input('ticket_id', Number(params.data.id));
          req.input('user_id', body.data.user_id);
          req.input('email', body.data.email);
          req.input('name', body.data.name);
          req.input('watcher_type', body.data.watcher_type);
          req.input('added_by', userId);
          if (body.data.notification_preferences) {
            req.input('notification_preferences', body.data.notification_preferences);
          }
          const res = await req.execute('app.usp_AddTicketWatcher');
          return res.recordset;
        };
        const result = localReq ? await run(localReq) : await withRls(userId, (c) => run(c.request()));
        return reply.code(201).send({ message: 'Watcher added successfully', watcher_id: result[0]?.watcher_id });
      } catch (err: any) {
        if (err.message && err.message.includes('already exists')) {
          return reply.code(409).send({ error: 'Watcher already exists for this ticket' });
        }
        fastify.log.error({ err }, 'Failed to add ticket watcher');
        return reply.code(500).send({ error: 'Failed to add ticket watcher' });
      }
    }
  );

  // DELETE /tickets/:id/watchers/:watcherId - remove a watcher from a ticket
  fastify.delete(
    '/tickets/:id/watchers/:watcherId',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const paramsSchema = z.object({ 
        id: z.string(), 
        watcherId: z.string() 
      });
      const params = paramsSchema.safeParse(request.params);
      if (!params.success)
        return reply.code(400).send({ error: 'Invalid parameters' });

      const userId = (request as any).user?.sub;
      if (!userId) return reply.code(401).send({ error: 'Unauthorized' });

      try {
        const localReq = getRequestFromContext(request);
        const run = async (req: any) => {
          req.input('watcher_id', Number(params.data.watcherId));
          const res = await req.execute('app.usp_RemoveTicketWatcher');
          return res.recordset;
        };
        const result = localReq ? await run(localReq) : await withRls(userId, (c) => run(c.request()));
        return { message: 'Watcher removed successfully' };
      } catch (err) {
        fastify.log.error({ err }, 'Failed to remove ticket watcher');
        return reply.code(500).send({ error: 'Failed to remove ticket watcher' });
      }
    }
  );

  // GET /privacy-levels - get available privacy levels
  fastify.get(
    '/privacy-levels',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user?.sub;
      if (!userId) return reply.code(401).send({ error: 'Unauthorized' });

      try {
        const localReq = getRequestFromContext(request);
        const run = async (req: any) => {
          const sql = `SELECT privacy_level, display_name, description, sort_order FROM app.TicketPrivacyLevels ORDER BY sort_order`;
          const res = await req.query(sql);
          return res.recordset;
        };
        const result = localReq ? await run(localReq) : await withRls(String(userId), (c) => run(c.request()));
        return result;
      } catch (err) {
        fastify.log.error({ err }, 'Failed to fetch privacy levels');
        return reply.code(500).send({ error: 'Failed to fetch privacy levels' });
      }
    }
  );

  // GET /substatuses - get available substatuses grouped by status
  fastify.get(
    '/substatuses',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user?.sub;
      if (!userId) return reply.code(401).send({ error: 'Unauthorized' });

      try {
        const localReq = getRequestFromContext(request);
        const run = async (req: any) => {
          const sql = `
            SELECT 
              s.status,
              ss.substatus_id,
              ss.substatus_code,
              ss.substatus_name,
              ss.sort_order
            FROM app.Substatuses ss
            JOIN app.Statuses s ON ss.status = s.status
            WHERE ss.is_active = 1
            ORDER BY s.sort_order, ss.sort_order`;
          const res = await req.query(sql);
          
          // Group by status
          const grouped = res.recordset.reduce((acc: any, row: any) => {
            if (!acc[row.status]) {
              acc[row.status] = [];
            }
            acc[row.status].push({
              substatus_id: row.substatus_id,
              substatus_code: row.substatus_code,
              substatus_name: row.substatus_name,
              sort_order: row.sort_order
            });
            return acc;
          }, {});
          
          return grouped;
        };
        const result = localReq ? await run(localReq) : await withRls(String(userId), (c) => run(c.request()));
        return result;
      } catch (err) {
        fastify.log.error({ err }, 'Failed to fetch substatuses');
        return reply.code(500).send({ error: 'Failed to fetch substatuses' });
      }
    }
  );
}
