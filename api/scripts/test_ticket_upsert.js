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
    status: 'Open',
    severity: 5,
  category_id: 3,
    summary: 'ATG and Dispenser Faults',
    description: 'Multiple faults detected',
    site_id: 1006,
    created_by: null,
    assignee_user_id: null,
    team_id: null,
    vendor_id: null,
    due_at: null,
    sla_plan_id: null,
    asset_ids: [555, 321],
  };
  const json = JSON.stringify(payload);
  const pool = await mssql.connect(cfg);
  try {
    const req = pool.request();
    req.input('payload', mssql.NVarChar, json);
    const r = await req.execute('app.usp_CreateOrUpdateTicket');
    console.log('Done:', r.rowsAffected);
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await pool.close();
  }
})();
