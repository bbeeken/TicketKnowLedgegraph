const sql = require('mssql');

async function main() {
  const ticketId = Number(process.env.TICKET_ID || '39');
  const config = {
    server: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || '1433'),
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASS || 'S@fePassw0rd!KG2025',
    database: process.env.DB_NAME || 'OpsGraph',
    options: { encrypt: true, trustServerCertificate: true }
  };

  const pool = await sql.connect(config);
  try {
  const tickets = await pool.request().input('id', sql.Int, ticketId).query('SELECT COUNT(*) AS cnt FROM app.Tickets WHERE ticket_id=@id');
  console.log('Tickets exists:', tickets.recordset[0].cnt);
  } finally {
    await pool.close();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
