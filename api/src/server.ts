import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import fastifyCors from '@fastify/cors';
import fastifyRateLimit from '@fastify/rate-limit';
import pino from 'pino';
import { z } from 'zod';
import { getPool } from './sql';
import { registerTicketRoutes } from './routes/tickets';
import { registerTicketWebSocketRoutes } from './routes/ticket-websocket';
import { registerAlertRoutes } from './routes/alerts';
import { registerAssetRoutes } from './routes/assets';
import { registerVendorRoutes } from './routes/vendors';
import { registerKgRoutes } from './routes/kg';
import { registerKGSSERoutes } from './routes/kg-sse';
import knowledgeExtensionsRoutes from './routes/knowledge-extensions';
import { registerSseRoutes } from './routes/sse';
import { registerAttachmentRoutes } from './routes/attachments';
import { registerAuthRoutes } from './routes/auth';
import { registerUserRoutes } from './routes/users';
import { registerKnowledgeIngestionRoutes } from './routes/knowledge-ingestion';
import { registerMetricsRoutes } from './routes/metrics';
import vectorSearchRoutes from './routes/vector-search';
import ticketAIRoutes from './routes/ticket-ai';
import debugVectorRoutes from './routes/debug-vector';
import debugRoutes from './routes/debug';
import analyticsRoutes from './routes/analytics';
import { getEmbeddingDimension } from './ai/embeddings';
import { ensureCollection as ensureQdrantCollection, isEnabled as qdrantEnabled } from './ai/vector/qdrant';
import * as dotenv from 'dotenv';

dotenv.config();

export function createServer() {
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
    server.log.error({ err: e as any }, 'Invalid environment variables');
    throw e;
  }

  server.register(fastifyCors);
  server.register(fastifyRateLimit, { max: 1000, timeWindow: '1 minute' });
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

  server.register(fastifySwaggerUi, { routePrefix: '/documentation' });

  server.register(fastifyJwt, { secret: process.env.JWT_SECRET! });

  server.decorate('authenticate', async function (request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.code(401).send({ error: 'Unauthorized' });
  }
  });

// Create and reuse a global connection pool - initialized on first use by getPool()

// RLS: set SESSION_CONTEXT('user_id') per request
  server.addHook('preHandler', async (request: FastifyRequest, reply) => {
  const user = (request as any).user as { sub?: number };
  const userId = user?.sub;
  
  if (!userId) return; // Skip RLS for unauthenticated requests
  
  try {
    const pool = await getPool();
    const sqlRequest = pool.request();
    sqlRequest.input('key', 'user_id');
    sqlRequest.input('value', userId.toString());
    await sqlRequest.execute('sys.sp_set_session_context');
  } catch (error) {
    server.log.error({ error, userId }, 'Failed to set RLS context');
    // Don't fail the request, just log the error
  }
  });

// Register routes as plugins
  server.register(registerAuthRoutes, { prefix: '/api' });
  server.register(registerTicketRoutes, { prefix: '/api' });
  server.register(registerTicketWebSocketRoutes, { prefix: '/api' });
  server.register(registerUserRoutes, { prefix: '/api' });
  server.register(registerAssetRoutes, { prefix: '/api' });
  server.register(registerVendorRoutes, { prefix: '/api' });
  server.register(registerAlertRoutes, { prefix: '/api' });
  server.register(registerKgRoutes, { prefix: '/api' });
  server.register(registerKGSSERoutes, { prefix: '/api' });
  server.register(knowledgeExtensionsRoutes);
  server.register(registerSseRoutes, { prefix: '/api' });
  server.register(registerAttachmentRoutes, { prefix: '/api' });
  server.register(registerKnowledgeIngestionRoutes, { prefix: '/api' });
  server.register(registerMetricsRoutes, { prefix: '/api' });
  server.register(vectorSearchRoutes, { prefix: '/api' });
  server.register(ticketAIRoutes, { prefix: '/api' });
  server.register(debugVectorRoutes, { prefix: '/api' });
  server.register(debugRoutes, { prefix: '/api' });
  server.register(analyticsRoutes, { prefix: '/api' });

  server.get('/health', async () => ({ status: 'ok' }));
  server.get('/api/health/auth', { preHandler: [server.authenticate] }, async (request: any) => ({ status: 'ok', user_id: request.user?.sub }));
  server.get('/api/health/ai', async () => {
    const usingReal = !!process.env.OPENAI_API_KEY;
    const fallbackAllowed = process.env.OPENAI_EMBED_ALLOW_FALLBACK === 'true';
    const provider = usingReal ? 'openai' : (fallbackAllowed ? 'mock' : 'none');
    const model = usingReal ? (process.env.OPENAI_EMBED_MODEL || 'text-embedding-3-small') : (fallbackAllowed ? 'mock-deterministic-512' : 'unavailable');
    const embeddingDegraded = provider !== 'openai';
    
    let qdrant: any = { 
      configured: false, 
      reachable: false 
    };
    
    if (qdrantEnabled()) {
      qdrant.configured = true;
      const qdrantUrl = process.env.QDRANT_URL ? process.env.QDRANT_URL.replace(/\/$/, '') : '';
      try {
        // Check Qdrant health endpoint
        const healthRes = await fetch(qdrantUrl + '/health');
        qdrant.reachable = healthRes.ok;
        if (healthRes.ok) {
          const healthJson = await healthRes.json();
          qdrant.status = healthJson.status || 'unknown';
        }
        // Check collection exists and get points count
        const colRes = await fetch(qdrantUrl + '/collections/' + encodeURIComponent(process.env.QDRANT_COLLECTION || 'opsgraph_snippets'));
        qdrant.collectionExists = colRes.ok;
        if (colRes.ok) {
          const colJson = await colRes.json();
          qdrant.pointsCount = colJson.result?.points_count ?? null;
        }
      } catch (e: any) {
        qdrant.reachable = false;
        qdrant.collectionExists = false;
        qdrant.error = (e && (typeof e === 'object' && 'message' in e) ? (e as any).message : String(e));
      }
    }
    
    const degraded = embeddingDegraded || (qdrant.configured && !qdrant.reachable);
    
    return {
      status: 'ok',
      embedding: {
        model,
        dimension: getEmbeddingDimension(),
        provider,
        fallback_allowed: fallbackAllowed,
        degraded: embeddingDegraded
      },
      qdrant,
      degraded
    };
  });

  return server;
}
if (process.env.NODE_ENV !== 'test') {
  (async () => {
    const server = createServer();
    try {
      // Start HTTP server first so /health is responsive even if DB is slow
      await server.listen({ port: Number(process.env.PORT) || 3000, host: '0.0.0.0' });
      server.log.info(`Server listening on http://localhost:${process.env.PORT || 3000}`);

      // Initialize DB pool in background, log error but keep server up
      getPool().catch((err) => {
        server.log.error(err, 'Initial DB connection failed');
      });

      // Soft-init Qdrant collection if configured (non-blocking)
      if (qdrantEnabled()) {
        (async () => {
          try {
            const dim = getEmbeddingDimension();
            const res = await ensureQdrantCollection(dim);
            if (!res.ok) server.log.warn({ err: res.error }, 'Qdrant ensureCollection failed');
            else server.log.info({ created: res.created }, 'Qdrant collection ready');
          } catch (e) {
            server.log.warn({ err: e }, 'Qdrant init error');
          }
        })();
      }
    } catch (err) {
      server.log.error(err);
    }
  })();
}

export default createServer;

