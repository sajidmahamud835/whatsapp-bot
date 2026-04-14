import type Database from 'better-sqlite3';
import { migration001Pro } from './migrations/001-pro-tables.js';
import { migration002Flows } from './migrations/002-flows.js';

interface Migration {
  version: number;
  name: string;
  up: (db: Database.Database) => void;
}

const proMigrations: Migration[] = [
  migration001Pro,
  migration002Flows,
];

export function runProMigrations(db: Database.Database): void {
  // Pro uses a separate migration tracking table
  db.exec(`
    CREATE TABLE IF NOT EXISTS _pro_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  const getMaxVersion = db.prepare('SELECT MAX(version) as max_version FROM _pro_migrations');
  const currentVersion = (getMaxVersion.get() as { max_version: number | null })?.max_version ?? 0;

  const pending = proMigrations.filter(m => m.version > currentVersion);
  if (pending.length === 0) return;

  const insertMigration = db.prepare('INSERT INTO _pro_migrations (version, name) VALUES (?, ?)');

  for (const migration of pending) {
    const runInTransaction = db.transaction(() => {
      migration.up(db);
      insertMigration.run(migration.version, migration.name);
    });
    runInTransaction();
  }
}
