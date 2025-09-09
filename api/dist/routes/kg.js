"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerKgRoutes = registerKgRoutes;
const sql_1 = require("../sql");
// Register all KG-related routes
async function registerKgRoutes(fastify) {
    // /kg route (stub, implement as needed)
    fastify.get('/kg', { preHandler: [fastify.authenticate] }, async (request, reply) => {
        const userId = request.user?.sub;
        if (!userId)
            return reply.code(401).send({ error: 'Unauthorized' });
        try {
            const data = await (0, sql_1.getKgData)(userId);
            reply.send(data);
        }
        catch (err) {
            fastify.log.error({ err }, 'Failed to fetch KG data');
            reply.status(500).send({ error: 'Failed to fetch KG data' });
        }
    });
    // GET /kg/sites - list sites in KG schema
    fastify.get('/kg/sites', { preHandler: [fastify.authenticate] }, async (request, reply) => {
        const userId = request.user?.sub;
        if (!userId)
            return reply.code(401).send({ error: 'Unauthorized' });
        try {
            const rows = await (0, sql_1.withRls)(userId, async (conn) => {
                const res = await conn.request().query('SELECT id, name, created_at FROM kg.Site ORDER BY name');
                return res.recordset;
            });
            return rows;
        }
        catch (err) {
            fastify.log.error({ err }, 'Failed to fetch KG sites');
            return reply.code(500).send({ error: 'Failed to fetch KG sites' });
        }
    });
}
//# sourceMappingURL=kg.js.map