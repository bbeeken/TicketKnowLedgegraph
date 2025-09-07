import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import fastifyCors from '@fastify/cors';
import fastifyRateLimit from '@fastify/rate-limit';
import pino from 'pino';
import { z } from 'zod';
import { sqlPool, withRls } from './sql';
import { registerTicketRoutes } from './routes/tickets';
import { registerAlertRoutes } from './routes/alerts';
import { registerKgRoutes } from './routes/kg';
import { registerSseRoutes } from './routes/sse';
import * as dotenv from 'dotenv';

dotenv.config();

const server = Fastify({
  logger: pino({ 
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV !== 'production' ? { target: 'pino-pretty' } : undefined,
  }),
});

// Zod schema for environment variables
const envSchema = z.object({
  JWT_SECRET: z.string().min(1),
  LOG_LEVEL: z.string().optional(),
  PORT: z.string().optional(),
  NODE_ENV: z.string().optional(),
});

try {
  envSchema.parse(process.env);
} catch (e) {
  server.log.error('Invalid environment variables:', e);
  process.exit(1);
}

server.register(fastifyCors);
server.register(fastifyRateLimit, { max: 100, timeWindow: '1 minute' });
server.register(fastifySwagger, {
  openapi: { 
    info: { title: 'OpsGraph API', version: '1.0.0' },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
});

server.register(fastifySwaggerUi, {
  routePrefix: '/documentation',
});

server.register(fastifyJwt, { secret: process.env.JWT_SECRET! });

server.decorate('authenticate', async function (request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.code(401).send({ error: 'Unauthorized' });
  }
});

// RLS: set SESSION_CONTEXT('user_id') per request
server.addHook('preHandler', async (request, reply) => {
  if (request.user?.sub) {
    try {
      // This seems to create a new connection with RLS context.
      // Ensure `withRls` handles connection pooling correctly.
      await withRls(request.user.sub, async (conn) => {
        request.sqlConn = conn;
      });
    } catch (error) {
      server.log.error({ error, userId: request.user.sub }, 'Failed to set RLS context');
      reply.code(500).send({ error: 'Internal Server Error' });
    }
  }
});

// Register routes as plugins
server.register(registerTicketRoutes, { prefix: '/api' });
server.register(registerAlertRoutes, { prefix: '/api' });
server.register(registerKgRoutes, { prefix: '/api' });
server.register(registerSseRoutes, { prefix: '/api' });

server.get('/health', async () => ({ status: 'ok' }));

const start = async () => {
  try {
    await server.listen({ port: Number(process.env.PORT) || 3000, host: '0.0.0.0' });
    server.log.info(`Server listening on http://localhost:${process.env.PORT || 3000}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();

export default server;

