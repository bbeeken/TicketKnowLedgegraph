import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

// Register all KG-related routes
export async function registerKgRoutes(fastify: FastifyInstance) {
  // /kg route (stub, implement as needed)
  fastify.get('/kg', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = request.headers['x-user-id'] || null;
      if (!userId) {
        fastify.log.warn('Missing user_id in request headers');
        return reply.status(401).send({ error: 'Unauthorized: user_id required' });
      }
      await fastify.mssql.query({
        query: `EXEC sys.sp_set_session_context @key=N'user_id', @value=@UserId;`,
        params: { UserId: userId },
      });
      reply.send({ message: 'KG data endpoint (implement logic)' });
    } catch (err: any) {
      fastify.log.error({ err }, 'Failed to fetch KG data');
      reply.status(500).send({ error: 'Failed to fetch KG data' });
    }
  });

  // /kg/sites route
  fastify.get('/kg/sites', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const conn = request.sqlConn;
    const result = await conn.request().query('SELECT * FROM kg.Site');
    return result.recordset;
  });
}
  server.get('/kg/sites', { preHandler: [server.authenticate] }, async (request, reply) => {
    const conn = request.sqlConn;
    const result = await conn.request().query(`SELECT * FROM kg.Site`);
    return result.recordset;
  });
  import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
  import { getKgData } from '../sql';

  // Improved error logging and parameterized query example
  export default async function kgRoutes(fastify: FastifyInstance) {
    fastify.get('/kg', async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // Set user_id in session context for RLS enforcement (example, replace with actual user extraction)
        const userId = request.headers['x-user-id'] || null;
        if (!userId) {
          fastify.log.warn('Missing user_id in request headers');
          return reply.status(401).send({ error: 'Unauthorized: user_id required' });
        }
        // Set session context for SQL Server RLS
        await fastify.mssql.query({
          query: `EXEC sys.sp_set_session_context @key=N'user_id', @value=@UserId;`,
          params: { UserId: userId },
        });

        const data = await getKgData(fastify, userId);
        reply.send(data);
      } catch (err: any) {
        fastify.log.error({ err }, 'Failed to fetch KG data');
        reply.status(500).send({ error: 'Failed to fetch KG data' });
      }
    });
  }
  // ...other KG endpoints...
}
