/**
 * Database standup script for OpsGraph (SQL Server).
 * - Optionally drops and recreates the target database (--reset)
 * - Executes all top-level SQL files 00_*.sql .. 99_*.sql in lexical order
 * - Respects GO batch separators
 *
 * Usage:
 *   node scripts/db_standup.js [--reset] [--continue] [--file <path-to-sql>]
 *
 * Env (defaults align with docker-compose):
 *   DB_HOST (default: localhost)
 *   DB_NAME (default: OpsGraph)
 *   DB_USER (default: sa)
 *   DB_PASS (default: S@fePassw0rd!KG2025)
 */
const fs = require('fs');
const path = require('path');
const mssql = require('mssql');

const args = process.argv.slice(2);
const doReset = args.includes('--reset');
const continueOnError = args.includes('--continue');
const fileFlagIdx = args.indexOf('--file');
const singleFile = fileFlagIdx !== -1 ? args[fileFlagIdx + 1] : null;

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_NAME = process.env.DB_NAME || 'OpsGraph';
const DB_USER = process.env.DB_USER || 'sa';
const DB_PASS = process.env.DB_PASS || 'S@fePassw0rd!KG2025';

const masterCfg = {
  user: DB_USER,
  password: DB_PASS,
  server: DB_HOST,
  database: 'master',
  options: { encrypt: true, trustServerCertificate: true },
  pool: { max: 3 },
};

const dbCfg = {
  ...masterCfg,
  database: DB_NAME,
};

function splitOnGoBatches(sqlText) {
  // Split on lines that only contain GO (case-insensitive), possibly with leading/trailing spaces
  const lines = sqlText.replace(/\r\n/g, '\n').split('\n');
  const batches = [];
  let current = [];
  for (const line of lines) {
    if (/^\s*GO\s*$/i.test(line)) {
      if (current.length) batches.push(current.join('\n'));
      current = [];
    } else {
      current.push(line);
    }
  }
  if (current.length) batches.push(current.join('\n'));
  return batches.filter((b) => b.trim().length > 0);
}

async function runBatches(pool, sqlText, label) {
  const batches = splitOnGoBatches(sqlText);
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    try {
      await pool.request().batch(batch);
    } catch (err) {
      console.error(`Failed executing batch ${i + 1} of ${label}:`, err.message);
      // Targeted fallback: replace invalid filtered index on app.Alerts with non-filtered
      const msg = String(err && err.message || '');
      if (/Incorrect WHERE clause for filtered index/i.test(msg) && /01_app_relational_core\.sql/i.test(label)) {
        console.warn('Applying fallback: creating non-filtered index IX_Alerts_Recent on app.Alerts(raised_at)');
        try {
          await pool.request().query(`
            IF NOT EXISTS (
              SELECT 1 FROM sys.indexes WHERE name = 'IX_Alerts_Recent' AND object_id = OBJECT_ID('app.Alerts')
            )
            CREATE INDEX IX_Alerts_Recent ON app.Alerts(raised_at);
          `);
          console.log('Fallback index created. Continuing...');
          continue;
        } catch (e2) {
          console.error('Fallback creation failed:', e2.message);
          if (!continueOnError) throw err;
        }
      }

      if (!continueOnError) throw err;
      console.warn('Continuing after error due to --continue flag.');
    }
  }
}

async function ensureDatabase() {
  const master = await mssql.connect(masterCfg);
  try {
    if (doReset) {
      console.log(`Dropping database ${DB_NAME} if exists...`);
      await master
        .request()
        .input('db', mssql.NVarChar, DB_NAME)
        .query(`
          IF DB_ID(@db) IS NOT NULL
          BEGIN
            DECLARE @sql NVARCHAR(MAX);
            SET @sql = N'ALTER DATABASE [' + REPLACE(@db, ']', ']]') + N'] SET SINGLE_USER WITH ROLLBACK IMMEDIATE';
            EXEC (@sql);
            SET @sql = N'DROP DATABASE [' + REPLACE(@db, ']', ']]') + N']';
            EXEC (@sql);
          END
        `);
    }

    console.log(`Creating database ${DB_NAME} if not exists...`);
    await master
      .request()
      .input('db', mssql.NVarChar, DB_NAME)
      .query(`
        IF DB_ID(@db) IS NULL
        BEGIN
          DECLARE @sql NVARCHAR(MAX);
          SET @sql = N'CREATE DATABASE [' + REPLACE(@db, ']', ']]') + N']';
          EXEC (@sql);
        END
      `);
  } finally {
    await master.close();
  }
}

async function executeTopLevelSqlFiles() {
  const root = path.resolve(__dirname, '..', '..');
  let entries;
  if (singleFile) {
    const abs = path.isAbsolute(singleFile) ? singleFile : path.join(root, singleFile);
    if (!fs.existsSync(abs)) {
      throw new Error(`File not found: ${abs}`);
    }
    entries = [abs];
  } else {
    entries = fs.readdirSync(root)
      .filter((f) => /^(\d{2})_.*\.sql$/i.test(f))
      .map((f) => path.join(root, f))
      .sort((a, b) => a.localeCompare(b));
  }

  if (entries.length === 0) {
    console.warn('No top-level SQL files found matching NN_*.sql');
    return;
  }

  // 00_*.sql should be run against master; others against target DB
  const poolMaster = await mssql.connect(masterCfg);
  const poolDb = await mssql.connect(dbCfg);
  try {
    for (const full of entries) {
      const sqlText = fs.readFileSync(full, 'utf8');
      const label = path.basename(full);
      console.log(`\n>>> Executing ${label} ...`);

  if (/^00_.*\.sql$/i.test(label)) {
        await runBatches(poolMaster, sqlText, label);
      } else {
        await runBatches(poolDb, sqlText, label);
      }
      console.log(`<<< Completed ${label}`);
    }
  } finally {
    await poolMaster.close();
    await poolDb.close();
  }
}

async function main() {
  console.log(`Connecting to SQL Server at ${DB_HOST} as ${DB_USER}`);
  await ensureDatabase();
  await executeTopLevelSqlFiles();
  console.log('Database standup complete.');
}

main().catch((err) => {
  console.error('Standup failed:', err);
  process.exit(1);
});
