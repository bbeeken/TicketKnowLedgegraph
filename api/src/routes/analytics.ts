import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { getPool } from '../sql';

// Minimal analytics endpoints: ticket counts over time, by status, and top sites
export default async function registerAnalyticsRoutes(app: FastifyInstance) {
  // All endpoints require auth to ensure RLS context is set
  const auth = app.authenticate as any;

  // Ticket counts by day (last 30 days)
  app.get('/analytics/tickets/by-day', { preHandler: [auth] }, async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (req as any).user?.sub;
      const pool = await getPool();
      // Set RLS context for this request explicitly (idempotent with preHandler)
      await pool.request()
        .input('key', 'user_id')
        .input('value', String(userId))
        .execute('sys.sp_set_session_context');

      const result = await pool.request().query(`
        WITH Days AS (
          SELECT CAST(DATEADD(day, -n, CAST(SYSUTCDATETIME() AS date)) AS date) AS d
          FROM (VALUES (0),(1),(2),(3),(4),(5),(6),(7),(8),(9),(10),(11),(12),(13),(14),(15),(16),(17),(18),(19),(20),(21),(22),(23),(24),(25),(26),(27),(28),(29)) v(n)
        )
        SELECT d.d AS date,
               COUNT(t.ticket_id) AS total,
               SUM(CASE WHEN at.status = 'Open' THEN 1 ELSE 0 END) AS open_count,
               SUM(CASE WHEN at.status = 'Closed' THEN 1 ELSE 0 END) AS closed_count
        FROM Days d
        LEFT JOIN app.Tickets at ON CAST(at.created_at AS date) = d.d
        LEFT JOIN kg.Ticket t ON t.ticket_id = at.ticket_id
        GROUP BY d.d
        ORDER BY d.d ASC;
      `);

      return reply.send({ success: true, rows: result.recordset });
    } catch (err: any) {
      req.server.log.error({ err }, 'Analytics by-day failed');
      return reply.code(500).send({ success: false, error: err?.message || 'Internal error' });
    }
  });

  // Tickets by status current snapshot
  app.get('/analytics/tickets/by-status', { preHandler: [auth] }, async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (req as any).user?.sub;
      const pool = await getPool();
      await pool.request()
        .input('key', 'user_id')
        .input('value', String(userId))
        .execute('sys.sp_set_session_context');

      const result = await pool.request().query(`
        SELECT at.status, COUNT(*) AS count
        FROM app.Tickets at
        JOIN kg.Ticket t ON t.ticket_id = at.ticket_id
        GROUP BY at.status
        ORDER BY count DESC;
      `);
      return reply.send({ success: true, rows: result.recordset });
    } catch (err: any) {
      req.server.log.error({ err }, 'Analytics by-status failed');
      return reply.code(500).send({ success: false, error: err?.message || 'Internal error' });
    }
  });

  // Top sites by open tickets
  app.get('/analytics/tickets/top-sites', { preHandler: [auth] }, async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (req as any).user?.sub;
      const pool = await getPool();
      await pool.request()
        .input('key', 'user_id')
        .input('value', String(userId))
        .execute('sys.sp_set_session_context');

      const result = await pool.request().query(`
        SELECT TOP 10 s.site_id, s.name AS site_name, COUNT(*) AS open_tickets
        FROM app.Tickets at
        JOIN kg.Ticket t ON t.ticket_id = at.ticket_id
        JOIN app.TicketsSites ts ON ts.ticket_id = at.ticket_id
        JOIN kg.Site s ON s.site_id = ts.site_id
        WHERE at.status = 'Open'
        GROUP BY s.site_id, s.name
        ORDER BY open_tickets DESC;
      `);
      return reply.send({ success: true, rows: result.recordset });
    } catch (err: any) {
      req.server.log.error({ err }, 'Analytics top-sites failed');
      return reply.code(500).send({ success: false, error: err?.message || 'Internal error' });
    }
  });
}
