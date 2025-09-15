/**
 * Seed admin user and sample data directly with hardcoded connection
 */
const mssql = require('mssql');
const argon2 = require('argon2');

const cfg = {
  user: 'sa',
  password: 'S@fePassw0rd!KG2025',
  server: 'localhost',
  database: 'OpsGraph',
  options: { encrypt: true, trustServerCertificate: true },
};

async function seed() {
  console.log('Connecting to DB...');
  const pool = await mssql.connect(cfg);

  try {
    const adminEmail = 'admin@example.com';
    const adminName = 'Local Admin';
    const adminPwd = 'Admin123!';

    // create admin user
    console.log('Hashing password...');
    const hash = await argon2.hash(adminPwd, { type: argon2.argon2id });

    console.log('Upserting admin user...');
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

    // assign role admin (role_id = 1)
    console.log('Assigning role admin...');
    await pool.request().input('userId', mssql.Int, userId).input('roleId', mssql.Int, 1).query(`
      IF NOT EXISTS (SELECT 1 FROM app.UserRoles ur WHERE ur.user_id = @userId AND ur.role_id = @roleId)
      INSERT INTO app.UserRoles (user_id, role_id, role) VALUES (@userId, @roleId, 'admin');
    `);

    // give admin access to site 1006
    console.log('Granting admin site access...');
    await pool.request().input('userId', mssql.Int, userId).input('siteId', mssql.Int, 1006).query(`
      IF NOT EXISTS (SELECT 1 FROM app.UserSiteAccess usa WHERE usa.user_id = @userId AND usa.site_id = @siteId)
      INSERT INTO app.UserSiteAccess (user_id, site_id) VALUES (@userId, @siteId);
    `);

    // insert sample ticket using stored procedure
    console.log('Inserting sample ticket...');
    const ticketPayload = JSON.stringify({
      summary: 'Sample ticket seeded',
      description: 'This is a test ticket created during seeding',
      status: 'Open',
      severity: 2,
      site_id: 1006
    });
    await pool.request()
      .input('payload', mssql.NVarChar, ticketPayload)
      .execute('app.usp_CreateOrUpdateTicket_v2');

    // create a technician user
    const techEmail = 'tech@example.com';
    const techName = 'Local Technician';
    const techPwd = 'Tech123!';
    const techHash = await argon2.hash(techPwd, { type: argon2.argon2id });

    console.log('Creating technician user...');
    await pool.request()
      .input('email', mssql.NVarChar, techEmail)
      .input('name', mssql.NVarChar, techName)
      .input('hash', mssql.NVarChar, techHash)
      .query(`
        IF NOT EXISTS (SELECT 1 FROM app.Users u WHERE u.email = @email)
        INSERT INTO app.Users (name, email, password, created_at)
        VALUES (@name, @email, @hash, SYSUTCDATETIME());
      `);

    const techRes = await pool.request().input('email', mssql.NVarChar, techEmail).query('SELECT user_id FROM app.Users WHERE email = @email');
    const techUserId = techRes.recordset[0].user_id;
    console.log('Tech user id =', techUserId);

    // assign technician role (role_id = 2)
    await pool.request().input('userId', mssql.Int, techUserId).input('roleId', mssql.Int, 2).query(`
      IF NOT EXISTS (SELECT 1 FROM app.UserRoles ur WHERE ur.user_id = @userId AND ur.role_id = @roleId)
      INSERT INTO app.UserRoles (user_id, role_id, role) VALUES (@userId, @roleId, 'technician');
    `);

    // give tech access to site 1006
    await pool.request().input('userId', mssql.Int, techUserId).input('siteId', mssql.Int, 1006).query(`
      IF NOT EXISTS (SELECT 1 FROM app.UserSiteAccess usa WHERE usa.user_id = @userId AND usa.site_id = @siteId)
      INSERT INTO app.UserSiteAccess (user_id, site_id) VALUES (@userId, @siteId);
    `);

    console.log('Seed complete. Checking ticket count...');
    const ticketCount = await pool.request().query('SELECT COUNT(*) as count FROM app.Tickets');
    console.log('Total tickets:', ticketCount.recordset[0].count);

    console.log('All done.');
  } finally {
    await pool.close();
  }
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});