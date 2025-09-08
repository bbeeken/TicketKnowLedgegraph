import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

const clients: Array<{ id: string; reply: FastifyReply }> = [];

export async function registerSseRoutes(fastify: FastifyInstance) {
  fastify.get('/stream/alerts', { preHandler: [fastify.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const id = Math.random().toString(36).slice(2);
    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.write('\n');

    clients.push({ id, reply });

    request.raw.on('close', () => {
      const idx = clients.findIndex(c => c.id === id);
      if (idx !== -1) clients.splice(idx, 1);
    });
  });

  // Helper to publish events to connected clients
  fastify.decorate('publishEvent', (event: string, data: any) => {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const c of clients) {
      try {
        c.reply.raw.write(payload);
      } catch (e) {
        // ignore write errors
      }
    }
  });
}
