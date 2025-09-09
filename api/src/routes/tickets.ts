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
  // GET /tickets - list open and in-progress tickets (from TicketMaster)
  fastify.get(
    '/tickets',
    { preHandler: [fastify.authenticate] },
    async (request: JwtRequest, reply: FastifyReply) => {
      try {
        const conn = await getSqlConnection(request);
        const sql = `SELECT ticket_id, ticket_no, status, priority, severity, summary, site_id, created_at, updated_at FROM app.TicketMaster WHERE status IN ('Open','InProgress') ORDER BY updated_at DESC`;
        const res = await conn.request().query(sql);
        return res.recordset;
      } catch (err) {
        fastify.log.error({ err }, 'Failed to fetch tickets');
        return reply.code(500).send({ error: 'Failed to fetch tickets' });
      }
    }
  );

  // GET /tickets/:id - detail with rowversion and ETag (from TicketMaster)
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
        const sql = `SELECT t.ticket_id, t.ticket_no, t.status, t.substatus_code, t.severity, t.category_id, t.summary, t.description, t.site_id, t.assignee_user_id, t.team_id, t.vendor_id, t.due_at, t.sla_plan_id, t.created_at, t.updated_at, CAST(t.rowversion AS varbinary(8)) as rowversion_bin FROM app.TicketMaster t WHERE t.ticket_id = @id`;
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

        const ticket = {
          ticket_id: row.ticket_id,
          ticket_no: row.ticket_no,
          status: row.status,
          substatus_code: row.substatus_code,
          severity: row.severity,
          category_id: row.category_id,
          summary: row.summary,
          description: row.description,
          site_id: row.site_id,
          assignee_user_id: row.assignee_user_id,
          team_id: row.team_id,
          vendor_id: row.vendor_id,
          due_at: row.due_at,
          sla_plan_id: row.sla_plan_id,
          created_at: row.created_at,
          updated_at: row.updated_at,
          rowversionBase64: rowversionBase64,
        };
        return ticket;
      } catch (err) {
        fastify.log.error({ err }, 'Failed to fetch ticket detail');
        return reply.code(500).send({ error: 'Failed to fetch ticket' });
      }
    }
  );

  // POST /tickets - create a new ticket using proc v2
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
      });
      const parsed = bodySchema.safeParse(request.body);
      if (!parsed.success)
        return reply.code(400).send({ error: 'Invalid payload' });

      const userId = (request as any).user?.sub;
      if (!userId) return reply.code(401).send({ error: 'Unauthorized' });

      try {
        const payload = {
          ...parsed.data,
          created_by: parsed.data.created_by || Number(userId),
        };
        const localReq = getRequestFromContext(request);
        if (localReq) {
          const req = localReq;
          req.input('payload', JSON.stringify(payload));
          const res = await req.execute('app.usp_CreateOrUpdateTicket_v2');
          const out =
            res.recordset && res.recordset[0]
              ? res.recordset[0].ticket_id
              : null;
          return reply.code(201).send({ ticket_id: out });
        }
        const out = await withRls(userId, async (conn) => {
          const r = await conn
            .request()
            .input('payload', JSON.stringify(payload))
            .execute('app.usp_CreateOrUpdateTicket_v2');
          return r.recordset && r.recordset[0]
            ? r.recordset[0].ticket_id
            : null;
        });
        return reply.code(201).send({ ticket_id: out });
      } catch (err: any) {
        fastify.log.error({ err }, 'Failed to create ticket');
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
}
