import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { withRls } from '../sql';

export async function registerAlertRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/alerts',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user?.sub;
      if (!userId) return reply.code(401).send({ error: 'Unauthorized' });
      try {
        const rows = await withRls(String(userId), async (conn) => {
          const res = await conn.request().query(
            `SELECT alert_id, [rule] as message, raised_at FROM app.Alerts WHERE raised_at > DATEADD(day, -60, SYSUTCDATETIME()) ORDER BY raised_at DESC`
          );
          return res.recordset;
        });
        return rows;
      } catch (err) {
        fastify.log.error({ err }, 'Failed to fetch alerts');
        return reply.code(500).send({ error: 'Failed to fetch alerts' });
      }
    }
  );
}
