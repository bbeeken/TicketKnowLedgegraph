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

          // Get ticket types
          const typesRes = await conn.request().query(`
            SELECT type_id, name as type_name
            FROM app.TicketTypes
            ORDER BY name
          `);

          return {
            sites: sitesRes.recordset,
            categories: categoriesRes.recordset,
            users: usersRes.recordset,
            statuses: statusesRes.recordset.map(s => ({ status_code: s.status_code, status_name: s.status_name, description: s.description })),
            substatuses: substatusesRes.recordset.map(s => ({ substatus_code: s.substatus_code, substatus_name: s.substatus_name, status_code: s.status_code, description: s.description })),
            types: typesRes.recordset
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

        // Return ticket list using system-of-record app.Tickets only
        const sql = `
          SELECT 
            t.ticket_id,
            t.ticket_no,
            t.summary,
            t.description,
            COALESCE(t.problem_description, '') AS problem_description,
            t.status,
            t.substatus_code,
            COALESCE(ss.substatus_name, t.substatus_code) AS substatus_name,
            COALESCE(t.severity, 0) AS severity,
            t.category_id,
            COALESCE(c.name, 'General') AS category_name,
            t.site_id,
            COALESCE(s.name, 'Unknown Site') AS site_name,
            COALESCE(t.privacy_level, 'public') AS privacy_level,
            COALESCE(t.is_private, 0) AS is_private,
            t.assignee_user_id,
            COALESCE(au.name, 'Unassigned') AS assignee_name,
            t.team_id,
            t.created_by,
            COALESCE(cu.name, 'Unknown') AS created_by_name,
            t.created_at,
            t.updated_at,
            COALESCE(t.contact_name, '') AS contact_name,
            COALESCE(t.contact_email, '') AS contact_email,
            COALESCE(t.contact_phone, '') AS contact_phone,
            COALESCE((SELECT COUNT(*) FROM app.TicketWatchers tw WHERE tw.ticket_id = t.ticket_id AND tw.is_active = 1), 0) AS watcher_count,
            COALESCE((SELECT COUNT(*) FROM app.TicketWatchers tw WHERE tw.ticket_id = t.ticket_id AND tw.is_active = 1 AND tw.watcher_type = 'collaborator'), 0) AS collaborator_count
          FROM app.Tickets t
          LEFT JOIN app.Sites s ON t.site_id = s.site_id
          LEFT JOIN app.Categories c ON t.category_id = c.category_id
          LEFT JOIN app.Substatuses ss ON t.substatus_code = ss.substatus_code
          LEFT JOIN app.Users au ON t.assignee_user_id = au.user_id
          LEFT JOIN app.Users cu ON t.created_by = cu.user_id
          ORDER BY t.updated_at DESC`;
        
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
            t.ticket_id,
            t.ticket_no,
            t.status,
            t.substatus_code,
            st.substatus_name,
            t.severity,
            t.category_id,
            c.name as category_name,
            t.summary,
            t.description,
            t.site_id,
            s.name as site_name,
            t.type_id,
            tt2.name as type_name,
            t.privacy_level,
            t.is_private,
            t.assignee_user_id,
            au.name as assignee_name,
            t.team_id,
            t.vendor_id,
            t.due_at,
            t.sla_plan_id,
            t.created_by,
            cu.name as created_by_name,
            t.created_at,
            t.updated_at,
            t.contact_name,
            t.contact_email,
            t.contact_phone,
            t.problem_description,
            CAST(t.rowversion AS varbinary(8)) as rowversion_bin,
            (SELECT COUNT(*) FROM app.TicketWatchers tw WHERE tw.ticket_id = t.ticket_id AND tw.is_active = 1) as watcher_count,
            (SELECT COUNT(*) FROM app.TicketWatchers tw WHERE tw.ticket_id = t.ticket_id AND tw.is_active = 1 AND tw.watcher_type = 'collaborator') as collaborator_count
          FROM app.Tickets t
          LEFT JOIN app.Sites s ON t.site_id = s.site_id
          LEFT JOIN app.Categories c ON t.category_id = c.category_id
          LEFT JOIN app.Substatuses st ON t.substatus_code = st.substatus_code
          LEFT JOIN app.TicketTypes tt2 ON t.type_id = tt2.type_id
          LEFT JOIN app.Users au ON t.assignee_user_id = au.user_id
          LEFT JOIN app.Users cu ON t.created_by = cu.user_id
          WHERE t.ticket_id = @id`;
          
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
          type_id: row.type_id,
          type_name: row.type_name,
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
        // If privacy_level is present, update privacy first using dedicated proc
        const maybeUpdatePrivacy = async (req: any) => {
          if (body.data && Object.prototype.hasOwnProperty.call(body.data, 'privacy_level')) {
            const level = (body.data as any).privacy_level;
            if (level) {
              // Only run proc if supporting table exists
              const hasTickets = await req.query("SELECT 1 AS x WHERE OBJECT_ID('app.Tickets','U') IS NOT NULL");
              if (hasTickets?.recordset?.length) {
                await req
                  .input('ticket_id', Number(params.data.id))
                  .input('privacy_level', level)
                  .input('updated_by', userId)
                  .execute('app.usp_UpdateTicketPrivacy');
              }
            }
          }
        };

        // If contact fields are present, update them directly on app.Tickets (proc v2 does not handle these yet)
        const maybeUpdateContactFields = async (req: any) => {
          const keys = ['contact_name','contact_email','contact_phone','problem_description'];
          const provided = keys.filter(k => Object.prototype.hasOwnProperty.call(body.data as any, k));
          if (provided.length === 0) return;
          // Skip if app.Tickets doesn't exist in this environment
          const existsRes = await req.query("SELECT 1 AS x WHERE OBJECT_ID('app.Tickets','U') IS NOT NULL");
          if (!existsRes?.recordset?.length) return;
          // Check which columns actually exist
          const colsRes = await req.query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='app' AND TABLE_NAME='Tickets' AND COLUMN_NAME IN ('contact_name','contact_email','contact_phone','problem_description')");
          const existing = new Set((colsRes.recordset || []).map((r: any) => r.COLUMN_NAME));
          const setClauses: string[] = [];
          const r = req;
          r.input('tid', Number(params.data.id));
          if (provided.includes('contact_name') && existing.has('contact_name')) { setClauses.push('contact_name = @contact_name'); r.input('contact_name', (body.data as any).contact_name ?? null); }
          if (provided.includes('contact_email') && existing.has('contact_email')) { setClauses.push('contact_email = @contact_email'); r.input('contact_email', (body.data as any).contact_email ?? null); }
          if (provided.includes('contact_phone') && existing.has('contact_phone')) { setClauses.push('contact_phone = @contact_phone'); r.input('contact_phone', (body.data as any).contact_phone ?? null); }
          if (provided.includes('problem_description') && existing.has('problem_description')) { setClauses.push('problem_description = @problem_description'); r.input('problem_description', (body.data as any).problem_description ?? null); }
          if (setClauses.length > 0) {
            const sql = `UPDATE app.Tickets SET ${setClauses.join(', ')}, updated_at = SYSUTCDATETIME() WHERE ticket_id = @tid`;
            await r.query(sql);
          }
        };

        // Helper: load current ticket state needed by usp for fields not provided
        const loadCurrent = async (req: any): Promise<any> => {
          const sql = `
            SELECT 
              t.status,
              t.substatus_code,
              t.severity,
              t.category_id,
              t.summary,
              t.description,
              t.site_id,
              t.created_by,
              t.assignee_user_id,
              t.team_id,
              t.vendor_id,
              t.due_at,
              t.sla_plan_id
            FROM app.Tickets t
            WHERE t.ticket_id = @id`;
          const res = await req.input('id', Number(params.data.id)).query(sql);
          return res.recordset?.[0] ?? {};
        };

        if (localReq) {
          const req = localReq;
          // Handle privacy and contact fields first so GET reflects immediately
          await maybeUpdatePrivacy(req);
          await maybeUpdateContactFields(req);

          // Merge with current state to avoid nulling required fields on partial updates
          const current = await loadCurrent(req);
          const merged = { ...current, ...body.data, ticket_id: Number(params.data.id) };
          req.input('payload', JSON.stringify(merged));
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
            const r = conn.request();
            // Handle privacy + contact fields first
            await maybeUpdatePrivacy(r);
            await maybeUpdateContactFields(r);
            const current = await loadCurrent(r);
            const merged = { ...current, ...body.data, ticket_id: Number(params.data.id) };
            r.input('payload', JSON.stringify(merged));
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
        const runAdd = async (req: any) => {
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

  // Tickets-only model: no backfill

        const attempt = async () => {
          if (localReq) return runAdd(localReq);
          return withRls(userId, (conn) => runAdd(conn.request()));
        };

        try {
          const commentId = await attempt();
          return reply.code(201).send({ comment_id: commentId });
        } catch (e: any) {
          const msg = e?.message || '';
          if (msg.includes('Invalid ticket_id')) {
            return reply.code(404).send({ error: 'Ticket not found' });
          }
          throw e;
        }
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

  // Tickets-only model: no backfill

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

        const attempt = async () => {
          if (localReq) return run(localReq);
          return withRls(userId, (c) => run(c.request()));
        };

        try {
          const result = await attempt();
          return reply.code(201).send({ message: 'Watcher added successfully', watcher_id: result[0]?.watcher_id });
        } catch (e: any) {
          const msg = e?.message || '';
          if (msg.includes('Ticket not found') || msg.includes('Invalid ticket')) {
            return reply.code(404).send({ error: 'Ticket not found' });
          }
          if (msg.includes('already exists')) {
            return reply.code(409).send({ error: 'Watcher already exists for this ticket' });
          }
          throw e;
        }
      } catch (err: any) {
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
