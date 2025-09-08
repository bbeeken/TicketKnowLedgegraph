import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import mssql from 'mssql';
import { getPool } from '../sql';

// fastify plugin to manage per-request SQL transaction and set SESSION_CONTEXT('user_id')
export default fp(async function sessionContext(fastify: FastifyInstance) {
  fastify.addHook('onRequest', async (request: FastifyRequest, reply) => {
    const user = (request as any).user;
    const userId = user?.sub;
    if (!userId) return;

    const pool = await getPool();
    const tx = new mssql.Transaction(pool);
    try {
      await tx.begin();
      const req = tx.request();
      req.input('key', mssql.NVarChar, 'user_id');
      req.input('value', mssql.NVarChar, userId);
      // set session context on the connection used by this transaction
      await req.execute('sys.sp_set_session_context');
      // attach transaction/connection to request for handlers to use
      (request as any).sqlConn = {
        tx,
        request: () => tx.request(),
      };
    } catch (err) {
      try { await tx.rollback(); } catch (e) { fastify.log.error({ err: e }, 'rollback error'); }
      throw err;
    }
  });

  fastify.addHook('onResponse', async (request) => {
    const sqlConn = (request as any).sqlConn;
    if (sqlConn && sqlConn.tx) {
      try {
        await sqlConn.tx.commit();
      } catch (err) {
        fastify.log.error({ err }, 'Failed to commit transaction');
        try { await sqlConn.tx.rollback(); } catch (e) { fastify.log.error({ err: e }, 'rollback after commit failure'); }
      }
    }
  });

  fastify.addHook('onError', async (request, reply, err) => {
    const sqlConn = (request as any).sqlConn;
    if (sqlConn && sqlConn.tx) {
      try {
        await sqlConn.tx.rollback();
      } catch (e) {
        fastify.log.error({ err: e }, 'Failed to rollback transaction on error');
      }
    }
  });
});
