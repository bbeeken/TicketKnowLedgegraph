// Smoke test for rich messaging: add HTML and fetch
const mssql = require('mssql');

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_NAME = process.env.DB_NAME || 'OpsGraph';
const DB_USER = process.env.DB_USER || 'sa';
const DB_PASS = process.env.DB_PASS || 'S@fePassw0rd!KG2025';

const cfg = {
  user: DB_USER,
  password: DB_PASS,
  server: DB_HOST,
  database: DB_NAME,
  options: { encrypt: true, trustServerCertificate: true },
};

async function main() {
  const pool = await mssql.connect(cfg);
  try {
    // pick most recent ticket
    const t = await pool.request().query(`SELECT TOP 1 ticket_id FROM app.Tickets ORDER BY ticket_id DESC`);
    if (!t.recordset[0]) throw new Error('No ticket found');
    const ticket_id = t.recordset[0].ticket_id;

    // ensure author exists
    await pool.request().query(`IF NOT EXISTS (SELECT 1 FROM app.Users WHERE user_id=1) INSERT INTO app.Users(name,email) VALUES (N'Test User',N'test1@example.com')`);

    // add HTML message
    const req = pool.request();
    req.input('ticket_id', ticket_id);
    req.input('author_id', 1);
    req.input('message_type', 'comment');
    req.input('body', null);
    req.input('body_html', '<p><strong>Update:</strong> <em>Formatted</em> message with <u>HTML</u>.</p>');
    req.input('content_format', 'html');
    req.input('visibility', 'public');
    const ins = await req.execute('app.usp_AddTicketMessage');
    const comment_id = ins.recordset[0].comment_id;

    // fetch back
    const get = await pool.request().input('ticket_id', ticket_id).execute('app.usp_GetTicketMessages');
    console.log('ticket_id', ticket_id, 'inserted comment_id', comment_id, 'messages', get.recordset.length);
  } finally {
    await pool.close();
  }
}

main().then(() => { console.log('rich messaging smoke complete'); process.exit(0); }).catch((e) => { console.error(e); process.exit(1); });
