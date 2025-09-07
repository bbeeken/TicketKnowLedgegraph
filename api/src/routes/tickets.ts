import { FastifyInstance } from 'fastify';
import { z } from 'zod';

export function registerTicketRoutes(server: FastifyInstance) {
  server.get('/tickets', { preHandler: [server.authenticate] }, async (request, reply) => {
    const conn = request.sqlConn;
    const result = await conn.request().query(`
      SELECT * FROM app.Tickets WHERE status IN ('Open', 'InProgress')
    `);
    return result.recordset;
  });

  // ...other endpoints (POST, PATCH, etc.) with validation and RLS...
}
