import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';
// Import schema as a string. Metro doesn't support ?raw; embed at build time by requiring the file and casting.
import schemaText from './schema.sql';

const DB_NAME = 'opsgraph.db';

export function openDb(): SQLite.WebSQLDatabase {
  const db = SQLite.openDatabase(DB_NAME);
  return db;
}

export function migrate(db: SQLite.WebSQLDatabase): Promise<void> {
  return new Promise((resolve, reject) => {
  db.exec([{ sql: String(schemaText), args: [] }], false, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export async function initDb() {
  const db = openDb();
  await migrate(db);
  return db;
}
