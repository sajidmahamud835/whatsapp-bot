import type Database from 'better-sqlite3';
import { childLogger } from '../logger.js';
import { migration001 } from './migrations/001-initial.js';

const log = childLogger('migrations');

interface Migration {
  version: number;
  name: string;
  up: (db: Database.Database) => void;
}

const migrations: Migration[] = [
  migration001,
];

export function runMigrations(db: Database.Database): void {
  // Create migrations tracking table
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  const getMaxVersion = db.prepare('SELECT MAX(version) as max_version FROM _migrations');
  const currentVersion = (getMaxVersion.get() as { max_version: number | null })?.max_version ?? 0;

  const pending = migrations.filter(m => m.version > currentVersion);

  if (pending.length === 0) {
    log.debug('Database is up to date (version %d)', currentVersion);
    return;
  }

  log.info('Running %d migration(s) from version %d…', pending.length, currentVersion);

  const insertMigration = db.prepare('INSERT INTO _migrations (version, name) VALUES (?, ?)');

  for (const migration of pending) {
    log.info('  → Running migration %d: %s', migration.version, migration.name);

    const runInTransaction = db.transaction(() => {
      migration.up(db);
      insertMigration.run(migration.version, migration.name);
    });

    runInTransaction();
  }

  log.info('Migrations complete (now at version %d)', pending[pending.length - 1]!.version);
}
