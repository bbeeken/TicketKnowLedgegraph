import 'fastify';
import type { ConnectionPool } from 'mssql';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: any, reply: any) => Promise<void>;
  }

  interface FastifyRequest {
    sqlConn?: ConnectionPool;
  }
}
