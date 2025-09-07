import { FastifyInstance } from 'fastify';

export function registerSseRoutes(server: FastifyInstance) {
  server.get('/sse/outbox', { preHandler: [server.authenticate] }, async (request, reply) => {
    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');
    // ...stream outbox events as they arrive...
  });
}
