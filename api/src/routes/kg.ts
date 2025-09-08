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
      const rows = await withRls(userId, async (conn) => {
        const res = await conn.request().query('SELECT id, name, created_at FROM kg.Site ORDER BY name');
        return res.recordset;
      });
      return rows;
    } catch (err) {
      fastify.log.error({ err }, 'Failed to fetch KG sites');
      return reply.code(500).send({ error: 'Failed to fetch KG sites' });
    }
  });
}
