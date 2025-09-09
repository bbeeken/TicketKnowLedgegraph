import mssql from 'mssql';
export declare function getPool(): Promise<mssql.ConnectionPool>;
export declare function withRls<T>(userId: string, fn: (conn: mssql.ConnectionPool) => Promise<T>): Promise<T>;
export declare function safeQuery(query: string, params?: Record<string, any>): Promise<mssql.IResult<any>>;
export declare function getKgData(userId: string): Promise<any>;
//# sourceMappingURL=sql.d.ts.map