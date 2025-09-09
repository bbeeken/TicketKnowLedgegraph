"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerAlertRoutes = registerAlertRoutes;
const sql_1 = require("../sql");
async function registerAlertRoutes(fastify) {
    fastify.get('/alerts', { preHandler: [fastify.authenticate] }, async (request, reply) => {
        const userId = request.user?.sub;
        if (!userId)
            return reply.code(401).send({ error: 'Unauthorized' });
        try {
            const rows = await (0, sql_1.withRls)(userId, async (conn) => {
                const res = await conn.request().query(`SELECT id, message, raised_at FROM app.Alerts WHERE raised_at > DATEADD(day, -60, SYSUTCDATETIME()) ORDER BY raised_at DESC`);
                return res.recordset;
            });
            return rows;
        }
        catch (err) {
            fastify.log.error({ err }, 'Failed to fetch alerts');
            return reply.code(500).send({ error: 'Failed to fetch alerts' });
        }
    });
}
//# sourceMappingURL=alerts.js.map