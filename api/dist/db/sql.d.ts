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
export declare class SqlConnection implements RequestSqlConnection {
    private conn;
    private transaction?;
    private userId?;
    constructor(conn: sql.ConnectionPool, userId?: number);
    beginTransaction(): Promise<void>;
    commitTransaction(): Promise<void>;
    rollbackTransaction(): Promise<void>;
    request(): sql.Request;
    executeProc(name: string, params?: Record<string, any>): Promise<sql.IProcedureResult<any>>;
    release(): void;
}
export declare const SQL_CONN_SYMBOL: unique symbol;
export interface RequestWithSql extends FastifyRequest {
    [SQL_CONN_SYMBOL]?: RequestSqlConnection;
}
export declare function attachSqlConnection(request: RequestWithSql, pool: sql.ConnectionPool, userId?: number): Promise<void>;
export declare function getSqlConnection(request: RequestWithSql): Promise<RequestSqlConnection>;
export declare function createSqlConnection(pool: sql.ConnectionPool, userId?: number): Promise<RequestSqlConnection>;
export declare function withRls<T>(userId: number, fn: (conn: RequestSqlConnection) => Promise<T>): Promise<T>;
//# sourceMappingURL=sql.d.ts.map