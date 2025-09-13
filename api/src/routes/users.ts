import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { withRls } from '../sql';

export async function registerUserRoutes(fastify: FastifyInstance) {
  // GET /users - get all active users for dropdowns
  fastify.get(
    '/users',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user?.sub;
      if (!userId) return reply.code(401).send({ error: 'Unauthorized' });

      try {
        const result = await withRls(String(userId), async (conn) => {
          const sql = `
            SELECT 
              user_id,
              name,
              email,
              role,
              is_active
            FROM app.Users
            WHERE is_active = 1
            ORDER BY name`;
          const res = await conn.request().query(sql);
          return res.recordset;
        });
        
        return result;
      } catch (err) {
        fastify.log.error({ err }, 'Failed to fetch users');
        return reply.code(500).send({ error: 'Failed to fetch users' });
      }
    }
  );

  // GET /users/search - search users by name or email
  fastify.get(
    '/users/search',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const querySchema = z.object({ 
        q: z.string().min(2).optional(),
        limit: z.string().optional()
      });
      const query = querySchema.safeParse(request.query);
      if (!query.success) {
        return reply.code(400).send({ error: 'Invalid query parameters' });
      }

      const userId = (request as any).user?.sub;
      if (!userId) return reply.code(401).send({ error: 'Unauthorized' });

      try {
        const searchTerm = query.data.q || '';
        const limit = Number(query.data.limit || 20);

        const result = await withRls(String(userId), async (conn) => {
          const sql = `
            SELECT TOP (@limit)
              user_id,
              name,
              email,
              role
            FROM app.Users
            WHERE is_active = 1
              AND (
                name LIKE '%' + @searchTerm + '%'
                OR email LIKE '%' + @searchTerm + '%'
              )
            ORDER BY 
              CASE 
                WHEN name LIKE @searchTerm + '%' THEN 1
                WHEN email LIKE @searchTerm + '%' THEN 2
                ELSE 3
              END,
              name`;
          
          const res = await conn.request()
            .input('searchTerm', searchTerm)
            .input('limit', limit)
            .query(sql);
          return res.recordset;
        });
        
        return result;
      } catch (err) {
        fastify.log.error({ err }, 'Failed to search users');
        return reply.code(500).send({ error: 'Failed to search users' });
      }
    }
  );

  // GET /users/:id - get user by ID
  fastify.get(
    '/users/:id',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const paramsSchema = z.object({ id: z.string() });
      const params = paramsSchema.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send({ error: 'Invalid user ID' });
      }

      const userId = (request as any).user?.sub;
      if (!userId) return reply.code(401).send({ error: 'Unauthorized' });

      try {
        const result = await withRls(String(userId), async (conn) => {
          const sql = `
            SELECT 
              user_id,
              name,
              email,
              role,
              phone,
              is_active,
              created_at
            FROM app.Users
            WHERE user_id = @userId`;
          
          const res = await conn.request()
            .input('userId', Number(params.data.id))
            .query(sql);
          
          if (res.recordset.length === 0) {
            return null;
          }
          
          return res.recordset[0];
        });
        
        if (!result) {
          return reply.code(404).send({ error: 'User not found' });
        }
        
        return result;
      } catch (err) {
        fastify.log.error({ err }, 'Failed to fetch user');
        return reply.code(500).send({ error: 'Failed to fetch user' });
      }
    }
  );
}
