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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SQL_CONN_SYMBOL = exports.SqlConnection = void 0;
exports.attachSqlConnection = attachSqlConnection;
exports.getSqlConnection = getSqlConnection;
exports.createSqlConnection = createSqlConnection;
exports.withRls = withRls;
const sql = __importStar(require("mssql"));
class SqlConnection {
    constructor(conn, userId) {
        this.conn = conn;
        this.userId = userId;
    }
    async beginTransaction() {
        if (this.transaction)
            return;
        this.transaction = new sql.Transaction(this.conn);
        await this.transaction.begin();
        // Set session context with user_id for RLS
        if (this.userId) {
            await this.transaction.request()
                .input('key', sql.NVarChar, 'user_id')
                .input('value', sql.Int, this.userId)
                .query('EXEC sys.sp_set_session_context @key, @value');
        }
    }
    async commitTransaction() {
        if (this.transaction) {
            await this.transaction.commit();
            this.transaction = undefined;
        }
    }
    async rollbackTransaction() {
        if (this.transaction) {
            await this.transaction.rollback();
            this.transaction = undefined;
        }
    }
    request() {
        if (!this.transaction) {
            throw new Error('No active transaction - call beginTransaction first');
        }
        return this.transaction.request();
    }
    async executeProc(name, params) {
        const req = this.request();
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                req.input(key, value);
            });
        }
        return req.execute(name);
    }
    release() {
        if (this.transaction) {
            this.rollbackTransaction().catch(() => { });
        }
    }
}
exports.SqlConnection = SqlConnection;
exports.SQL_CONN_SYMBOL = Symbol('sqlConn');
async function attachSqlConnection(request, pool, userId) {
    request[exports.SQL_CONN_SYMBOL] = await createSqlConnection(pool, userId);
}
async function getSqlConnection(request) {
    const conn = request[exports.SQL_CONN_SYMBOL];
    if (!conn)
        throw new Error('SQL connection not attached to request');
    return conn;
}
async function createSqlConnection(pool, userId) {
    const conn = new SqlConnection(pool, userId);
    await conn.beginTransaction();
    return conn;
}
// Helper to run SQL with RLS context (only for non-request background jobs)
async function withRls(userId, fn) {
    const pool = await sql.connect(process.env.DB_CONNECTION_STRING);
    const conn = await createSqlConnection(pool, userId);
    try {
        return await fn(conn);
    }
    finally {
        conn.release();
        pool.close();
    }
}
//# sourceMappingURL=sql.js.map