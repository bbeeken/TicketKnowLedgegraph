"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cfg = void 0;
const zod_1 = require("zod");
const envSchema = zod_1.z.object({
    DB_HOST: zod_1.z.string(),
    DB_NAME: zod_1.z.string(),
    DB_USER: zod_1.z.string(),
    DB_PASS: zod_1.z.string(),
    PORT: zod_1.z.string().optional(),
    JWT_ISSUER: zod_1.z.string().default('opsgraph'),
    JWT_AUDIENCE: zod_1.z.string().default('opsgraph-users'),
    JWT_SECRET: zod_1.z.string().min(32),
    RATE_LIMIT_MAX: zod_1.z.string().optional(),
    CORS_ORIGINS: zod_1.z.string().optional(),
    SSE_ENABLED: zod_1.z.string().optional(),
    UPLOAD_DIR: zod_1.z.string().optional(),
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    console.error('Invalid environment configuration', parsed.error.format());
    process.exit(1);
}
exports.cfg = {
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
    uploadDir: parsed.data.UPLOAD_DIR || '/data/attachments',
};
//# sourceMappingURL=config.js.map