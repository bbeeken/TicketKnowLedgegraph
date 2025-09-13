const mssql = require('mssql');

const cfg = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASS || 'S@fePassw0rd!KG2025',
  server: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'OpsGraph',
  options: { encrypt: true, trustServerCertificate: true },
};

(async () => {
  const payload = {
    source: 'franklin',
    occurred_at: '2025-09-03T11:33:00Z',
    site_id: 1006,
    asset_id: 555,
    code: 'ATG_COMM_ERR',
    message: 'Console communication timeout',
  };
  const json = JSON.stringify(payload);
  const pool = await mssql.connect(cfg);
  try {
    const req = pool.request();
    req.input('payload', mssql.NVarChar, json);
    const r = await req.execute('app.usp_UpsertEventFromVendor');
    console.log('Done:', r.rowsAffected);
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await pool.close();
  }
})();
