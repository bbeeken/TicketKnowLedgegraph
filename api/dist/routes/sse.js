"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSseRoutes = registerSseRoutes;
const clients = [];
async function registerSseRoutes(fastify) {
    fastify.get('/stream/alerts', { preHandler: [fastify.authenticate] }, async (request, reply) => {
        const id = Math.random().toString(36).slice(2);
        reply.raw.setHeader('Content-Type', 'text/event-stream');
        reply.raw.setHeader('Cache-Control', 'no-cache');
        reply.raw.setHeader('Connection', 'keep-alive');
        reply.raw.write('\n');
        clients.push({ id, reply });
        request.raw.on('close', () => {
            const idx = clients.findIndex(c => c.id === id);
            if (idx !== -1)
                clients.splice(idx, 1);
        });
    });
    // Helper to publish events to connected clients
    fastify.decorate('publishEvent', (event, data) => {
        const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        for (const c of clients) {
            try {
                c.reply.raw.write(payload);
            }
            catch (e) {
                // ignore write errors
            }
        }
    });
}
//# sourceMappingURL=sse.js.map