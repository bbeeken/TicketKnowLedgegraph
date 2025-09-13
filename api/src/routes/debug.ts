import { FastifyInstance } from 'fastify';
import * as sql from 'mssql';
import { cfg } from '../config';

export default async function debugRoutes(fastify: FastifyInstance) {
  fastify.get('/debug/monitor-sources', async (request, reply) => {
    const pool = new sql.ConnectionPool({
      server: cfg.db.host,
      database: cfg.db.name,
      user: cfg.db.user,
      password: cfg.db.pass,
      options: {
        encrypt: false,
        trustServerCertificate: true,
      },
    });
    await pool.connect();
    
    const result = await pool.request().query(`
      SELECT TOP 5 * FROM app.MonitorSources
    `);
    
    await pool.close();
    return { sources: result.recordset };
  });
}
