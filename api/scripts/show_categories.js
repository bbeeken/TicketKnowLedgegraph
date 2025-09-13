const mssql = require('mssql');
const cfg = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASS || 'S@fePassw0rd!KG2025',
  server: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'OpsGraph',
  options: { encrypt: true, trustServerCertificate: true },
};
(async () => {
  const pool = await mssql.connect(cfg);
  try {
    const r = await pool.request().query('SELECT COUNT(*) cnt FROM app.Categories; SELECT TOP 10 category_id,name,slug,domain FROM app.Categories ORDER BY category_id');
    console.log('Count:', r.recordsets[0][0].cnt);
    console.log(r.recordsets[1]);
  } catch (e) { console.error(e); }
  finally { await pool.close(); }
})();
