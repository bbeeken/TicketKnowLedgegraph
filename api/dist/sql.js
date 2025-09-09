"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPool = getPool;
exports.withRls = withRls;
exports.safeQuery = safeQuery;
exports.getKgData = getKgData;
const mssql_1 = __importDefault(require("mssql"));
// Validate required environment variables for SQL connection
const requiredEnv = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASS'];
for (const key of requiredEnv) {
    if (!process.env[key]) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
}
// Singleton pool instance
let pool = null;
async function getPool() {
    if (pool)
        return pool;
    pool = await new mssql_1.default.ConnectionPool({
        server: process.env.DB_HOST,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        options: { encrypt: true, trustServerCertificate: true },
        pool: { max: 10, min: 1 },
    }).connect();
    return pool;
}
// Helper to run a function with RLS context set
async function withRls(userId, fn) {
    const conn = await getPool();
    try {
        await conn.request()
            .input('key', mssql_1.default.NVarChar, 'user_id')
            .input('value', mssql_1.default.NVarChar, userId)
            .execute('sys.sp_set_session_context');
        return await fn(conn);
    }
    catch (err) {
        // Add logging here if needed
        throw err;
    }
}
// Safe query helper
async function safeQuery(query, params = {}) {
    const conn = await getPool();
    const request = conn.request();
    for (const [key, value] of Object.entries(params)) {
        request.input(key, value);
    }
    return request.query(query);
}
// Stub for getKgData (implement as needed)
async function getKgData(userId) {
    // Example: fetch all sites user has access to
    const result = await withRls(userId, async (conn) => {
        return conn.request().query('SELECT * FROM kg.Site');
    });
    return result.recordset;
}
//# sourceMappingURL=sql.js.map