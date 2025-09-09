"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const jwt_1 = __importDefault(require("@fastify/jwt"));
const swagger_1 = __importDefault(require("@fastify/swagger"));
const swagger_ui_1 = __importDefault(require("@fastify/swagger-ui"));
const cors_1 = __importDefault(require("@fastify/cors"));
const rate_limit_1 = __importDefault(require("@fastify/rate-limit"));
const pino_1 = __importDefault(require("pino"));
const zod_1 = require("zod");
const mssql_1 = __importDefault(require("mssql"));
const sql_1 = require("./db/sql");
const tickets_1 = require("./routes/tickets");
const alerts_1 = require("./routes/alerts");
const kg_1 = require("./routes/kg");
const sse_1 = require("./routes/sse");
const attachments_1 = require("./routes/attachments");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const server = (0, fastify_1.default)({
    logger: (0, pino_1.default)({
        level: process.env.LOG_LEVEL || 'info',
        transport: process.env.NODE_ENV !== 'production' ? { target: 'pino-pretty' } : undefined,
    }),
});
// Zod schema for environment variables
const envSchema = zod_1.z.object({
    JWT_SECRET: zod_1.z.string().min(1),
    LOG_LEVEL: zod_1.z.string().optional(),
    PORT: zod_1.z.string().optional(),
    NODE_ENV: zod_1.z.string().optional(),
});
try {
    envSchema.parse(process.env);
}
catch (e) {
    server.log.error('Invalid environment variables:', e);
    process.exit(1);
}
server.register(cors_1.default);
server.register(rate_limit_1.default, { max: 100, timeWindow: '1 minute' });
server.register(swagger_1.default, {
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
server.register(swagger_ui_1.default, {
    routePrefix: '/documentation',
});
server.register(jwt_1.default, { secret: process.env.JWT_SECRET });
server.decorate('authenticate', async function (request, reply) {
    try {
        await request.jwtVerify();
    }
    catch (err) {
        reply.code(401).send({ error: 'Unauthorized' });
    }
});
// Create and reuse a global connection pool
const pool = new mssql_1.default.ConnectionPool(process.env.DB_CONNECTION_STRING);
// RLS: set SESSION_CONTEXT('user_id') per request
server.addHook('preHandler', async (request, reply) => {
    const user = request.user;
    const userId = user?.sub;
    try {
        await (0, sql_1.attachSqlConnection)(request, pool, userId);
    }
    catch (error) {
        server.log.error({ error, userId }, 'Failed to set RLS context');
        reply.code(500).send({ error: 'Internal Server Error' });
        return reply;
    }
});
// Clean up SQL resources after request
server.addHook('onResponse', async (request) => {
    const conn = request[sql_1.SQL_CONN_SYMBOL];
    if (conn) {
        conn.release();
    }
});
// Register routes as plugins
server.register(tickets_1.registerTicketRoutes, { prefix: '/api' });
server.register(alerts_1.registerAlertRoutes, { prefix: '/api' });
server.register(kg_1.registerKgRoutes, { prefix: '/api' });
server.register(sse_1.registerSseRoutes, { prefix: '/api' });
server.register(attachments_1.registerAttachmentRoutes, { prefix: '/api' });
server.get('/health', async () => ({ status: 'ok' }));
const start = async () => {
    try {
        await server.listen({ port: Number(process.env.PORT) || 3000, host: '0.0.0.0' });
        server.log.info(`Server listening on http://localhost:${process.env.PORT || 3000}`);
    }
    catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};
start();
exports.default = server;
//# sourceMappingURL=server.js.map