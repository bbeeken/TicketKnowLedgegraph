import { FastifyRequest } from 'fastify';
import * as sql from 'mssql';

export interface RequestSqlConnection {
  request(): sql.Request;
  executeProc(name: string, params?: Record<string, any>): Promise<sql.IProcedureResult<any>>;
  beginTransaction(): Promise<void>;
  commitTransaction(): Promise<void>;
  rollbackTransaction(): Promise<void>;
  release(): void;
}

export class SqlConnection implements RequestSqlConnection {
  private conn: sql.ConnectionPool;
  private transaction?: sql.Transaction;
  private userId?: number;

  constructor(conn: sql.ConnectionPool, userId?: number) {
    this.conn = conn;
    this.userId = userId;
  }

  async beginTransaction(): Promise<void> {
    if (this.transaction) return;
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

  async commitTransaction(): Promise<void> {
    if (this.transaction) {
      await this.transaction.commit();
      this.transaction = undefined;
    }
  }

  async rollbackTransaction(): Promise<void> {
    if (this.transaction) {
      await this.transaction.rollback();
      this.transaction = undefined;
    }
  }

  request(): sql.Request {
    if (!this.transaction) {
      throw new Error('No active transaction - call beginTransaction first');
    }
    return this.transaction.request();
  }

  async executeProc(name: string, params?: Record<string, any>): Promise<sql.IProcedureResult<any>> {
    const req = this.request();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        req.input(key, value);
      });
    }
    return req.execute(name);
  }

  release(): void {
    if (this.transaction) {
      this.rollbackTransaction().catch(() => {});
    }
  }
}

export const SQL_CONN_SYMBOL = Symbol('sqlConn');

export interface RequestWithSql extends FastifyRequest {
  [SQL_CONN_SYMBOL]?: RequestSqlConnection;
}

export async function attachSqlConnection(request: RequestWithSql, pool: sql.ConnectionPool, userId?: number): Promise<void> {
  request[SQL_CONN_SYMBOL] = await createSqlConnection(pool, userId);
}

export async function getSqlConnection(request: RequestWithSql): Promise<RequestSqlConnection> {
  const conn = request[SQL_CONN_SYMBOL];
  if (!conn) throw new Error('SQL connection not attached to request');
  return conn;
}

export async function createSqlConnection(pool: sql.ConnectionPool, userId?: number): Promise<RequestSqlConnection> {
  const conn = new SqlConnection(pool, userId);
  await conn.beginTransaction();
  return conn;
}

// Helper to run SQL with RLS context (only for non-request background jobs)
export async function withRls<T>(userId: number, fn: (conn: RequestSqlConnection) => Promise<T>): Promise<T> {
  const pool = await sql.connect(process.env.DB_CONNECTION_STRING!);
  const conn = await createSqlConnection(pool, userId);
  try {
    return await fn(conn);
  } finally {
    conn.release();
    pool.close();
  }
}
