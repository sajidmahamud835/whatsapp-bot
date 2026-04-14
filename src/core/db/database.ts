import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config.js';
import { childLogger } from '../logger.js';
import { runMigrations } from './migrations.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const log = childLogger('database');

let db: Database.Database | null = null;

function getDbPath(): string {
  const configPath = config.get<string>('database.path') ?? './data/wa-convo.db';
  return resolve(__dirname, '..', '..', '..', configPath);
}

export function getDatabase(): Database.Database {
  if (db) return db;

  const dbPath = getDbPath();
  const dir = dirname(dbPath);

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  db = new Database(dbPath);

  // Performance pragmas
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('foreign_keys = ON');

  log.info('Database opened: %s', dbPath);

  // Run migrations
  runMigrations(db);

  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    log.info('Database closed');
  }
}
