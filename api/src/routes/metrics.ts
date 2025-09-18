import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getPool } from '../sql';

export async function registerMetricsRoutes(fastify: FastifyInstance) {
  // Get Outbox metrics: pending count, last event time
  fastify.get('/metrics/outbox', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const pool = await getPool();
      const result = await pool.request().query(`
        SELECT 
          COUNT(*) as pending_count,
          MAX(created_at) as last_event_at
        FROM app.Outbox 
        WHERE published = 0
      `);
      
      const metrics = result.recordset[0] || { pending_count: 0, last_event_at: null };
      
      reply.send({
        pending_count: metrics.pending_count,
        last_event_at: metrics.last_event_at,
        status: metrics.pending_count > 100 ? 'error' : metrics.pending_count > 50 ? 'warning' : 'healthy'
      });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to get outbox metrics');
      reply.code(500).send({ error: 'Failed to get metrics' });
    }
  });

  // Get basic system health metrics
  fastify.get('/metrics/system', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const pool = await getPool();
      
      // Get recent alert count
      const alertResult = await pool.request().query(`
        SELECT COUNT(*) as recent_alerts
        FROM app.Alerts 
        WHERE raised_at >= DATEADD(hour, -1, GETUTCDATE())
      `);
      
      const alerts = alertResult.recordset[0] || { recent_alerts: 0 };
      
      reply.send({
        alerts: {
          recent_count: alerts.recent_alerts,
          status: alerts.recent_alerts > 10 ? 'warning' : 'healthy'
        },
        monitors: {
          total_sources: 0,
          enabled_sources: 0,
          last_poll_at: null,
          status: 'disabled'
        }
      });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to get system metrics');
      reply.code(500).send({ error: 'Failed to get system metrics' });
    }
  });
}