import { FastifyInstance } from 'fastify';

export function registerAlertRoutes(server: FastifyInstance) {
  server.get('/alerts', { preHandler: [server.authenticate] }, async (request, reply) => {
    const conn = request.sqlConn;
    const result = await conn.request().query(`
      SELECT * FROM app.Alerts WHERE raised_at > DATEADD(day, -60, SYSUTCDATETIME())
    `);
    return result.recordset;
  });
}
