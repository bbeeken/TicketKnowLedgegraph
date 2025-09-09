"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const mssql_1 = __importDefault(require("mssql"));
const sql_1 = require("../sql");
// fastify plugin to manage per-request SQL transaction and set SESSION_CONTEXT('user_id')
exports.default = (0, fastify_plugin_1.default)(async function sessionContext(fastify) {
    fastify.addHook('onRequest', async (request, reply) => {
        const user = request.user;
        const userId = user?.sub;
        if (!userId)
            return;
        const pool = await (0, sql_1.getPool)();
        const tx = new mssql_1.default.Transaction(pool);
        try {
            await tx.begin();
            const req = tx.request();
            req.input('key', mssql_1.default.NVarChar, 'user_id');
            req.input('value', mssql_1.default.NVarChar, userId);
            // set session context on the connection used by this transaction
            await req.execute('sys.sp_set_session_context');
            // attach transaction/connection to request for handlers to use
            request.sqlConn = {
                tx,
                request: () => tx.request(),
            };
        }
        catch (err) {
            try {
                await tx.rollback();
            }
            catch (e) {
                fastify.log.error({ err: e }, 'rollback error');
            }
            throw err;
        }
    });
    fastify.addHook('onResponse', async (request) => {
        const sqlConn = request.sqlConn;
        if (sqlConn && sqlConn.tx) {
            try {
                await sqlConn.tx.commit();
            }
            catch (err) {
                fastify.log.error({ err }, 'Failed to commit transaction');
                try {
                    await sqlConn.tx.rollback();
                }
                catch (e) {
                    fastify.log.error({ err: e }, 'rollback after commit failure');
                }
            }
        }
    });
    fastify.addHook('onError', async (request, reply, err) => {
        const sqlConn = request.sqlConn;
        if (sqlConn && sqlConn.tx) {
            try {
                await sqlConn.tx.rollback();
            }
            catch (e) {
                fastify.log.error({ err: e }, 'Failed to rollback transaction on error');
            }
        }
    });
});
//# sourceMappingURL=sessionContext.js.map