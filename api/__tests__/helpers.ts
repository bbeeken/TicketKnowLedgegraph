import { getPool } from '../src/sql';
import fs from 'fs';
import path from 'path';

export const API = process.env.API_BASE_URL || 'http://localhost:3000/api';

// Ensure base reference data for tests (roles, site, category, admin user with site access)
export async function ensureBaseTestData() {
  const pool = await getPool();
  // Ensure newer ticket columns exist (defensive explicit statements)
  try { await pool.request().query("IF COL_LENGTH('app.Tickets','type_id') IS NULL ALTER TABLE app.Tickets ADD type_id INT NULL;"); } catch {}
  try { await pool.request().query("IF COL_LENGTH('app.Tickets','substatus_code') IS NULL ALTER TABLE app.Tickets ADD substatus_code NVARCHAR(60) NULL;"); } catch {}
  // Ensure core ticket proc exists; if not apply essential SQL scripts
  const hasProc = await pool.request().query("SELECT CASE WHEN OBJECT_ID('app.usp_CreateOrUpdateTicket_v2','P') IS NOT NULL THEN 1 ELSE 0 END AS has_proc");
  if (!hasProc.recordset[0].has_proc) {
    const root = path.resolve(__dirname, '..', '..');
    const scripts = ['01_app_relational_core.sql','02_enums_calendars_temporal.sql','03_security_rls.sql','11_ticket_master.sql','13_ticket_procs.sql','16_privacy_and_watchers.sql'];
    for (const file of scripts) {
      const full = path.join(root, file);
      if (!fs.existsSync(full)) continue;
      const txt = fs.readFileSync(full, 'utf8');
      const parts = txt.split(/\bGO\b/gi).map(p=>p.trim()).filter(Boolean);
      for (const part of parts) {
        try { await pool.request().batch(part); } catch (e:any) {
          const m=(e.message||'').toLowerCase();
          if (m.includes('already exists') || m.includes('there is already an object') || m.includes('cannot create') || m.includes('duplicate key')) {
            // benign idempotency collision - ignore
            continue;
          }
          throw e;
        }
      }
    }
  }
  else {
    // Ensure TicketMaster table & trigger exist even if proc already existed
    const pool2 = pool; // alias
    const tmCheck = await pool2.request().query("SELECT CASE WHEN OBJECT_ID('app.TicketMaster','U') IS NOT NULL THEN 1 ELSE 0 END AS has_tm, CASE WHEN OBJECT_ID('app.TicketMaster_InsertFromTickets','TR') IS NOT NULL THEN 1 ELSE 0 END AS has_trg");
    if (!tmCheck.recordset[0].has_tm || !tmCheck.recordset[0].has_trg) {
      const root = path.resolve(__dirname, '..', '..');
      const tmScript = path.join(root, '11_ticket_master.sql');
      if (fs.existsSync(tmScript)) {
        const txt = fs.readFileSync(tmScript,'utf8');
        const parts = txt.split(/\bGO\b/gi).map(p=>p.trim()).filter(Boolean);
        for (const part of parts) { try { await pool2.request().batch(part); } catch(e:any) { const m=(e.message||'').toLowerCase(); if (!(m.includes('already exists'))) throw e; } }
      }
    }
    // Always refresh definition of core ticket proc to latest (CREATE OR ALTER is idempotent)
    try {
      const root = path.resolve(__dirname, '..', '..');
      const procScript = path.join(root,'13_ticket_procs.sql');
      if (fs.existsSync(procScript)) {
        const txt = fs.readFileSync(procScript,'utf8');
        const parts = txt.split(/\bGO\b/gi).map(p=>p.trim()).filter(Boolean);
        for (const part of parts) {
          try { await pool2.request().batch(part); } catch (e:any) { const m=(e.message||'').toLowerCase(); if (!(m.includes('already exists'))) throw e; }
        }
      }
      // Also ensure privacy functions exist
      const privacyScript = path.join(root,'16_privacy_and_watchers.sql');
      if (fs.existsSync(privacyScript)) {
        const txt = fs.readFileSync(privacyScript,'utf8');
        const parts = txt.split(/\bGO\b/gi).map(p=>p.trim()).filter(Boolean);
        for (const part of parts) {
          try { await pool2.request().batch(part); } catch (e:any) { const m=(e.message||'').toLowerCase(); if (!(m.includes('already exists'))) throw e; }
        }
      }
      // Log snippet of current procedure text for diagnostics
      try {
        const def = await pool2.request().query("SELECT TOP 1 def = OBJECT_DEFINITION(OBJECT_ID('app.usp_CreateOrUpdateTicket_v2'))");
        // eslint-disable-next-line no-console
        console.log('Proc head:', def.recordset[0].def?.substring(0,180));
      } catch {}
    } catch (e) { /* ignore to avoid test hard fail */ }
  }
  // Roles
  await pool.request().query(`IF NOT EXISTS (SELECT 1 FROM app.Roles WHERE name='admin') INSERT INTO app.Roles(name) VALUES('admin');
    IF NOT EXISTS (SELECT 1 FROM app.Roles WHERE name='technician') INSERT INTO app.Roles(name) VALUES('technician');`);
  // Ensure Substatuses table exists (minimal) and ticket columns expected by proc
  await pool.request().query(`IF OBJECT_ID('app.Substatuses','U') IS NULL BEGIN
      CREATE TABLE app.Substatuses ( substatus_code NVARCHAR(60) PRIMARY KEY, substatus_name NVARCHAR(120) NOT NULL, status NVARCHAR(30) NOT NULL, CONSTRAINT FK_Substatuses_Status FOREIGN KEY(status) REFERENCES app.Statuses(status));
    END;
    IF COL_LENGTH('app.Tickets','type_id') IS NULL ALTER TABLE app.Tickets ADD type_id INT NULL;
    IF COL_LENGTH('app.Tickets','substatus_code') IS NULL ALTER TABLE app.Tickets ADD substatus_code NVARCHAR(60) NULL;
    -- Backfill extended site columns if prior minimal schema
    IF COL_LENGTH('app.Sites','store_id') IS NULL ALTER TABLE app.Sites ADD store_id INT NULL;
    IF COL_LENGTH('app.Sites','form_title') IS NULL ALTER TABLE app.Sites ADD form_title NVARCHAR(200) NULL;
    IF COL_LENGTH('app.Sites','street') IS NULL ALTER TABLE app.Sites ADD street NVARCHAR(200) NULL;
    IF COL_LENGTH('app.Sites','zip') IS NULL ALTER TABLE app.Sites ADD zip CHAR(5) NULL;
    IF COL_LENGTH('app.Sites','phone') IS NULL ALTER TABLE app.Sites ADD phone NVARCHAR(20) NULL;
    IF COL_LENGTH('app.Sites','street_l') IS NULL ALTER TABLE app.Sites ADD street_l NVARCHAR(200) NULL;
    IF COL_LENGTH('app.Sites','pdi_name') IS NULL ALTER TABLE app.Sites ADD pdi_name NVARCHAR(100) NULL;
    IF COL_LENGTH('app.Sites','email') IS NULL ALTER TABLE app.Sites ADD email NVARCHAR(255) NULL;
    IF COL_LENGTH('app.Sites','caribou_id') IS NULL ALTER TABLE app.Sites ADD caribou_id NVARCHAR(20) NULL;
    IF COL_LENGTH('app.Sites','fuel_dispensers') IS NULL ALTER TABLE app.Sites ADD fuel_dispensers BIT NOT NULL DEFAULT 0;
    IF COL_LENGTH('app.Sites','tz') IS NULL ALTER TABLE app.Sites ADD tz NVARCHAR(40) NOT NULL DEFAULT 'America/Chicago';
    IF COL_LENGTH('app.Sites','calendar_id') IS NULL ALTER TABLE app.Sites ADD calendar_id INT NULL;
    IF COL_LENGTH('app.Sites','created_at') IS NULL ALTER TABLE app.Sites ADD created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME();`);
  // Category
  await pool.request().query(`IF NOT EXISTS (SELECT 1 FROM app.Categories WHERE name='General') INSERT INTO app.Categories(name,slug,domain) VALUES('General','general','tickets');`);
  // Statuses & Substatuses minimal
  await pool.request().query(`IF NOT EXISTS (SELECT 1 FROM app.Statuses WHERE status='Open') INSERT INTO app.Statuses(status, sort_order) VALUES('Open',1);
    IF NOT EXISTS (SELECT 1 FROM app.Statuses WHERE status='In Progress') INSERT INTO app.Statuses(status, sort_order) VALUES('In Progress',2);
    IF NOT EXISTS (SELECT 1 FROM app.Statuses WHERE status='Closed') INSERT INTO app.Statuses(status, sort_order) VALUES('Closed',3);
    IF NOT EXISTS (SELECT 1 FROM app.Substatuses WHERE substatus_code='awaiting_assignment') INSERT INTO app.Substatuses(substatus_code, substatus_name, status) VALUES('awaiting_assignment','Awaiting Assignment','Open');`);
  // Severities
  await pool.request().query(`IF NOT EXISTS (SELECT 1 FROM app.Severities WHERE severity=1) INSERT INTO app.Severities(severity) VALUES(1);
    IF NOT EXISTS (SELECT 1 FROM app.Severities WHERE severity=2) INSERT INTO app.Severities(severity) VALUES(2);
    IF NOT EXISTS (SELECT 1 FROM app.Severities WHERE severity=3) INSERT INTO app.Severities(severity) VALUES(3);
    IF NOT EXISTS (SELECT 1 FROM app.Severities WHERE severity=4) INSERT INTO app.Severities(severity) VALUES(4);`);
  // Site
  await pool.request().query(`IF NOT EXISTS (SELECT 1 FROM app.Sites WHERE site_id=1000)
    INSERT INTO app.Sites(site_id,name,city,state, tz)
    VALUES(1000,'Test Site 1000','Testville','TX','America/Chicago');`);
  // Diagnostics (one-time) for TicketMaster presence
  try {
    const diag = await pool.request().query(`SELECT tm_exists = CASE WHEN OBJECT_ID('app.TicketMaster','U') IS NOT NULL THEN 1 ELSE 0 END;
      IF OBJECT_ID('app.TicketMaster','U') IS NOT NULL SELECT TOP 1 'sample_ticket_master_row' AS label, ticket_id FROM app.TicketMaster ORDER BY ticket_id DESC;`);
    // eslint-disable-next-line no-console
    console.log('Test bootstrap diag TicketMaster exists:', diag.recordset?.[0]);
  } catch {/* ignore */}
  // Admin user
  await pool.request().query(`IF NOT EXISTS (SELECT 1 FROM app.Users WHERE email='admin@coffeecup.com')
    BEGIN
      INSERT INTO app.Users(name,email,password,is_active,created_at) VALUES('Admin','admin@coffeecup.com','ChangeMe1!',1,SYSUTCDATETIME());
    END`);
  // Map role by lookup of role_id
  await pool.request().query(`DECLARE @rid INT = (SELECT role_id FROM app.Roles WHERE name='admin');
    DECLARE @uid INT = (SELECT user_id FROM app.Users WHERE email='admin@coffeecup.com');
    IF NOT EXISTS (SELECT 1 FROM app.UserRoles WHERE user_id=@uid AND role_id=@rid)
      INSERT INTO app.UserRoles(user_id,role_id) VALUES(@uid,@rid);`);
  // Site access and team setup for RLS
  await pool.request().query(`DECLARE @uid INT = (SELECT user_id FROM app.Users WHERE email='admin@coffeecup.com');
    IF NOT EXISTS (SELECT 1 FROM app.UserSiteAccess WHERE user_id=@uid AND site_id=1000)
      INSERT INTO app.UserSiteAccess(user_id,site_id) VALUES(@uid,1000);
    -- Create a team and assign user to it for RLS access
    IF NOT EXISTS (SELECT 1 FROM app.Teams WHERE name='AdminTeam')
      INSERT INTO app.Teams(name) VALUES('AdminTeam');
    DECLARE @tid INT = (SELECT team_id FROM app.Teams WHERE name='AdminTeam');
    IF NOT EXISTS (SELECT 1 FROM app.UserTeams WHERE user_id=@uid AND team_id=@tid)
      INSERT INTO app.UserTeams(user_id,team_id) VALUES(@uid,@tid);
    IF NOT EXISTS (SELECT 1 FROM app.TeamSites WHERE team_id=@tid AND site_id=1000)
      INSERT INTO app.TeamSites(team_id,site_id) VALUES(@tid,1000);`);
}

export async function getAdminToken(server: any): Promise<string> {
  await ensureBaseTestData();
  const res = await server.inject({ method:'POST', url:'/api/auth/local/signin', payload:{ email:'admin@coffeecup.com', password:'ChangeMe1!' } });
  if (res.statusCode !== 200) throw new Error('Admin signin failed: '+res.body);
  return res.json().access_token || res.json().token;
}
