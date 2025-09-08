import mssql from 'mssql';

// Validate required environment variables for SQL connection
const requiredEnv = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASS'];
for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

// Singleton pool instance
let pool: mssql.ConnectionPool | null = null;

export async function getPool(): Promise<mssql.ConnectionPool> {
  if (pool) return pool;
  pool = await new mssql.ConnectionPool({
    server: process.env.DB_HOST!,
    database: process.env.DB_NAME!,
    user: process.env.DB_USER!,
    password: process.env.DB_PASS!,
    options: { encrypt: true, trustServerCertificate: true },
    pool: { max: 10, min: 1 },
  }).connect();
  return pool;
}

// Helper to run a function with RLS context set
export async function withRls<T>(userId: string, fn: (conn: mssql.ConnectionPool) => Promise<T>): Promise<T> {
  const conn = await getPool();
  try {
    await conn.request()
      .input('key', mssql.NVarChar, 'user_id')
      .input('value', mssql.NVarChar, userId)
      .execute('sys.sp_set_session_context');
    return await fn(conn);
  } catch (err) {
    // Add logging here if needed
    throw err;
  }
}

// Safe query helper
export async function safeQuery(query: string, params: Record<string, any> = {}): Promise<mssql.IResult<any>> {
  const conn = await getPool();
  const request = conn.request();
  for (const [key, value] of Object.entries(params)) {
    request.input(key, value);
  }
  return request.query(query);
}

// Stub for getKgData (implement as needed)
export async function getKgData(userId: string): Promise<any> {
  // Example: fetch all sites user has access to
  const result = await withRls(userId, async (conn) => {
    return conn.request().query('SELECT * FROM kg.Site');
  });
  return result.recordset;
}
