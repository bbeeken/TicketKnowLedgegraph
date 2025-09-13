import { z } from 'zod';

const envSchema = z.object({
  DB_HOST: z.string(),
  DB_NAME: z.string(),
  DB_USER: z.string(),
  DB_PASS: z.string(),
  PORT: z.string().optional(),
  JWT_ISSUER: z.string().default('opsgraph'),
  JWT_AUDIENCE: z.string().default('opsgraph-users'),
  JWT_SECRET: z.string().min(32),
  RATE_LIMIT_MAX: z.string().optional(),
  CORS_ORIGINS: z.string().optional(),
  SSE_ENABLED: z.string().optional(),
  UPLOAD_DIR: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment configuration', parsed.error.format());
  process.exit(1);
}

export const cfg = {
  db: {
    host: parsed.data.DB_HOST,
    name: parsed.data.DB_NAME,
    user: parsed.data.DB_USER,
    pass: parsed.data.DB_PASS,
  },
  port: Number(parsed.data.PORT || 3000),
  jwt: {
    issuer: parsed.data.JWT_ISSUER,
    audience: parsed.data.JWT_AUDIENCE,
    secret: parsed.data.JWT_SECRET,
  },
  rateLimitMax: Number(parsed.data.RATE_LIMIT_MAX || 100),
  corsOrigins: parsed.data.CORS_ORIGINS ? parsed.data.CORS_ORIGINS.split(',') : ['http://localhost:3000'],
  sseEnabled: (parsed.data.SSE_ENABLED || 'true') === 'true',
  uploadDir: parsed.data.UPLOAD_DIR || '/tmp/attachments',
};
