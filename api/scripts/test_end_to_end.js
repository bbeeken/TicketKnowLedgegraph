// End-to-end smoke: vendor upsert, asset upsert, ticket create/update/assign
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

async function exec(pool, sql, params = {}) {
  const req = pool.request();
  for (const [k, v] of Object.entries(params)) req.input(k, v);
  return req.query(sql);
}

async function main() {
  const pool = await mssql.connect(cfg);
  try {
  // Ensure a user exists for assignment
  await exec(pool, `IF NOT EXISTS (SELECT 1 FROM app.Users WHERE user_id=1)
            INSERT INTO app.Users(name, email) VALUES (N'Test User', N'test1@example.com');`);
    // Upsert vendor
    const vendorPayload = {
      name: 'Acme Pumps',
      contact_email: 'support@acme.test',
      phone: '+1-555-0100',
      contact: { name: 'Jane Tech', email: 'jane@acme.test', role: 'Rep' },
      contract: { name: 'SLA Gold', notes: '24/7 support' },
    };
    let r = await exec(pool, `DECLARE @p NVARCHAR(MAX)=@payload; EXEC app.usp_UpsertVendor @p;`, { payload: JSON.stringify(vendorPayload) });
    const vendor_id = r.recordset[0].vendor_id;

    // Create asset 9001 at site 1006
    await exec(
      pool,
      `EXEC app.usp_CreateAsset @asset_id=@aid, @site_id=1006, @type=N'Pump', @model=N'X100', @vendor_id=@vid, @vendor_name=N'Acme Pumps', @serial=N'ACX-9001';`,
      { aid: 9001, vid: vendor_id }
    );

    // Create ticket with two assets
    const ticketPayload = {
      status: 'Open',
      severity: 3,
      category_id: 3,
      summary: 'Pump pressure anomaly',
      description: 'Sensor reading out of range',
      site_id: 1006,
      vendor_id,
      asset_ids: [9001, 321],
    };
    r = await exec(pool, `DECLARE @p NVARCHAR(MAX)=@payload; EXEC app.usp_CreateOrUpdateTicket_v2 @p;`, { payload: JSON.stringify(ticketPayload) });
    const ticket_id = r.recordset[0].ticket_id;

    // Update ticket severity and add substatus
    const updPayload = { ...ticketPayload, ticket_id, severity: 4, substatus_code: 'Researching' };
    await exec(pool, `DECLARE @p NVARCHAR(MAX)=@payload; EXEC app.usp_CreateOrUpdateTicket_v2 @p;`, { payload: JSON.stringify(updPayload) });

    // Assign ticket to user 1
    const assignPayload = { ticket_id, user_id: 1, assigned_by: 1 };
    await exec(pool, `DECLARE @p NVARCHAR(MAX)=@payload; EXEC app.usp_AssignTicket @p;`, { payload: JSON.stringify(assignPayload) });

  // Add attachments (ticket, vendor, asset) with distinct hashes
  const crypto = require('crypto');
  const shaT = crypto.randomBytes(32);
  const shaV = crypto.randomBytes(32);
  const shaA = crypto.randomBytes(32);
  await exec(pool, `EXEC app.usp_AddAttachment @ticket_id=@tid, @uri=N'https://files.local/t1.png', @kind=N'image', @mime_type=N'image/png', @size_bytes=12345, @content_sha256=@sha, @uploaded_by=1;`, { tid: ticket_id, sha: shaT });
  await exec(pool, `EXEC app.usp_AddAttachment @vendor_id=@vid, @uri=N'https://files.local/v1.pdf', @kind=N'doc', @mime_type=N'application/pdf', @size_bytes=4567, @content_sha256=@sha, @uploaded_by=1;`, { vid: vendor_id, sha: shaV });
  await exec(pool, `EXEC app.usp_AddAttachment @asset_id=9001, @uri=N'https://files.local/a1.jpg', @kind=N'image', @mime_type=N'image/jpeg', @size_bytes=890, @content_sha256=@sha, @uploaded_by=1;`, { sha: shaA });

  // Verify
    const v1 = await exec(pool, `SELECT TOP 1 vendor_id, name FROM app.Vendors WHERE vendor_id=@id`, { id: vendor_id });
    const a1 = await exec(pool, `SELECT asset_id, vendor_id FROM app.Assets WHERE asset_id=9001`);
  const t1 = await exec(pool, `SELECT ticket_id, status, severity, substatus_code, assignee_user_id FROM app.Tickets WHERE ticket_id=@id`, { id: ticket_id });
    const ta = await exec(pool, `SELECT TOP 1 ticket_id, user_id FROM app.TicketAssignments WHERE ticket_id=@id ORDER BY id DESC`, { id: ticket_id });
  const attT = await exec(pool, `SELECT COUNT(*) AS c FROM app.Attachments WHERE ticket_id=@id`, { id: ticket_id });
  const attV = await exec(pool, `SELECT COUNT(*) AS c FROM app.Attachments WHERE vendor_id=@id`, { id: vendor_id });
  const attA = await exec(pool, `SELECT COUNT(*) AS c FROM app.Attachments WHERE asset_id=9001`);

    console.log('Vendor:', v1.recordset[0]);
    console.log('Asset:', a1.recordset[0]);
    console.log('Ticket:', t1.recordset[0]);
  console.log('Assignment:', ta.recordset[0]);
  console.log('Attachments:', { ticket: attT.recordset[0].c, vendor: attV.recordset[0].c, asset: attA.recordset[0].c });

    // Basic asserts
    if (!t1.recordset[0] || t1.recordset[0].severity !== 4) throw new Error('Ticket update failed');
  if (!ta.recordset[0] || ta.recordset[0].user_id !== 1) throw new Error('Assignment failed');
  if (attT.recordset[0].c < 1 || attV.recordset[0].c < 1 || attA.recordset[0].c < 1) throw new Error('Attachments not recorded');
  } finally {
    await pool.close();
  }
}

main().then(() => {
  console.log('End-to-end test complete.');
  process.exit(0);
}).catch((e) => {
  console.error('E2E FAILED:', e);
  process.exit(1);
});
