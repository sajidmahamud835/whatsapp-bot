/**
 * Pro Database — extends the core SQLite database with Pro tables.
 * Reuses the same DB file from core, adds pro-specific migrations.
 */

import type Database from 'better-sqlite3';
import { getDatabase } from '../../core/db/database.js';
import { runProMigrations } from './pro-migrations.js';

let initialized = false;

export function getProDatabase(): Database.Database {
  const db = getDatabase();

  if (!initialized) {
    runProMigrations(db);
    initialized = true;
  }

  return db;
}
