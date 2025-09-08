/**
 * Seed a test admin user and sample data, then verify SESSION_CONTEXT works for RLS.
 * Usage: node scripts/seed_and_verify.js
 * Requires environment variables: DB_HOST, DB_NAME, DB_USER, DB_PASS
 */
const mssql = require('mssql');
const argon2 = require('argon2');

const cfg = {
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  server: process.env.DB_HOST,
  database: process.env.DB_NAME,
  options: { encrypt: true, trustServerCertificate: true },
};

async function seed() {
  if (!cfg.user || !cfg.password || !cfg.server || !cfg.database) {
    console.error('Missing DB connection env variables. Set DB_HOST, DB_NAME, DB_USER, DB_PASS');
    process.exit(1);
  }

  console.log('Connecting to DB...');
  const pool = await mssql.connect(cfg);

  try {
    const adminEmail = 'admin@example.com';
    const adminName = 'Local Admin';
    const adminPwd = 'Admin123!';

    // create users table upsert -- adjust column names to your schema
    console.log('Hashing password...');
    const hash = await argon2.hash(adminPwd, { type: argon2.argon2id });

    console.log('Upserting admin user...');
    // Note: adjust the INSERT/UPDATE statements to match your app.Users schema
    await pool.request()
      .input('email', mssql.NVarChar, adminEmail)
      .input('name', mssql.NVarChar, adminName)
      .input('hash', mssql.NVarChar, hash)
      .query(`
        IF EXISTS (SELECT 1 FROM app.Users u WHERE u.email = @email)
        BEGIN
          UPDATE app.Users SET name = @name, password = @hash WHERE email = @email;
        END
        ELSE
        BEGIN
          INSERT INTO app.Users (name, email, password, created_at)
          VALUES (@name, @email, @hash, SYSUTCDATETIME());
        END
      `);

    // fetch user_id
    const res = await pool.request().input('email', mssql.NVarChar, adminEmail).query('SELECT user_id FROM app.Users WHERE email = @email');
    const userId = res.recordset[0].user_id;
    console.log('Admin user id =', userId);

    // assign role app_admin
    console.log('Assigning role app_admin...');
    await pool.request().input('userId', mssql.Int, userId).input('role', mssql.NVarChar, 'app_admin').query(`
      IF NOT EXISTS (SELECT 1 FROM app.UserRoles ur WHERE ur.user_id = @userId AND ur.role = @role)
      INSERT INTO app.UserRoles (user_id, role) VALUES (@userId, @role);
    `);

    // insert sample site
    console.log('Inserting sample site...');
    await pool.request().input('siteName', mssql.NVarChar, 'Local Test Site').input('siteId', mssql.Int, 1006).query(`
      IF NOT EXISTS (SELECT 1 FROM app.Sites s WHERE s.site_id = @siteId)
      INSERT INTO app.Sites (site_id, name, city, state, tz) VALUES (@siteId, @siteName, 'LocalCity', 'LS', 'UTC');
    `);

    // insert sample ticket
    console.log('Inserting sample ticket...');
    await pool.request().input('siteId', mssql.Int, 1006).input('summary', mssql.NVarChar, 'Sample ticket seeded').query(`
      IF NOT EXISTS (SELECT 1 FROM app.Tickets t WHERE t.summary = @summary AND t.site_id = @siteId)
      INSERT INTO app.Tickets (ticket_no, summary, status, site_id, created_at) VALUES (CONCAT('SAMPLE-', NEXT VALUE FOR app.TicketSeq), @summary, 'Open', @siteId, SYSUTCDATETIME());
    `);

    // insert sample alert
    console.log('Inserting sample alert...');
    await pool.request().input('siteId', mssql.Int, 1006).input('alertId', mssql.NVarChar, 'ALERT-LOCAL-1').input('code', mssql.NVarChar, 'TEST').query(`
      IF NOT EXISTS (SELECT 1 FROM app.Alerts a WHERE a.alert_id = @alertId)
      INSERT INTO app.Alerts (alert_id, site_id, raised_at, code, level) VALUES (@alertId, @siteId, SYSUTCDATETIME(), @code, 'medium');
    `);

    // insert an outbox row
    console.log('Inserting sample outbox event...');
    await pool.request().input('etype', mssql.NVarChar, 'alert.created').input('payload', mssql.NVarChar, JSON.stringify({ alert_id: 'ALERT-LOCAL-1' })).query(`
      INSERT INTO app.Outbox (event_type, payload, created_at) VALUES (@etype, @payload, SYSUTCDATETIME());
    `);

    console.log('Seed complete. Verifying SESSION_CONTEXT behavior...');

    // Verify session context set via sp_set_session_context
    const tx = new mssql.Transaction(pool);
    await tx.begin();
    try {
      const treq = tx.request();
      treq.input('key', mssql.NVarChar, 'user_id');
      treq.input('value', mssql.NVarChar, String(userId));
      await treq.execute('sys.sp_set_session_context');

      const check = await tx.request().query("SELECT SESSION_CONTEXT(N'user_id') as user_id_in_context");
      console.log('SESSION_CONTEXT returned:', check.recordset[0].user_id_in_context);
      await tx.commit();
      console.log('SESSION_CONTEXT verification complete');
    } catch (e) {
      console.error('Failed to verify session_context', e);
      try { await tx.rollback(); } catch (er) { console.error('rollback error', er); }
    }

    console.log('All done.');
  } finally {
    await pool.close();
  }
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
