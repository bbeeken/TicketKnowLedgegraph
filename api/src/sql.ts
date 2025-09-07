import mssql from 'mssql';

export const sqlPool = new mssql.ConnectionPool({
  server: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  options: { encrypt: true, trustServerCertificate: true },
  pool: { max: 10, min: 1 },
});

export async function withRls(userId: string, fn: (conn: mssql.ConnectionPool) => Promise<any>) {
  const conn = await sqlPool.connect();
  await conn.request()
    .input('key', mssql.NVarChar, 'user_id')
    .input('value', mssql.NVarChar, userId)
    .execute('sys.sp_set_session_context');
  try {
    return await fn(conn);
  } finally {
    conn.close();
  }
}
