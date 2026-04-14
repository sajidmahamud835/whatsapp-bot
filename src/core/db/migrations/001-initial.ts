import type Database from 'better-sqlite3';

export const migration001 = {
  version: 1,
  name: 'initial-tables',
  up(db: Database.Database): void {
    // Messages table — stores incoming and outgoing WhatsApp messages
    db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        jid TEXT NOT NULL,
        body TEXT,
        type TEXT NOT NULL DEFAULT 'unknown',
        timestamp INTEGER NOT NULL,
        from_me INTEGER NOT NULL DEFAULT 0,
        has_media INTEGER NOT NULL DEFAULT 0,
        media_url TEXT,
        raw TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    db.exec('CREATE INDEX IF NOT EXISTS idx_messages_client_jid_ts ON messages (client_id, jid, timestamp)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages (timestamp)');

    // AI conversation history — persists per-JID AI conversation context
    db.exec(`
      CREATE TABLE IF NOT EXISTS ai_conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        jid TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
      )
    `);
    db.exec('CREATE INDEX IF NOT EXISTS idx_ai_conv_jid_ts ON ai_conversations (jid, created_at)');

    // Webhook delivery log — tracks webhook dispatch attempts
    db.exec(`
      CREATE TABLE IF NOT EXISTS webhook_deliveries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        webhook_id TEXT NOT NULL,
        event TEXT NOT NULL,
        status_code INTEGER,
        response_time_ms INTEGER,
        error TEXT,
        payload TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
      )
    `);
    db.exec('CREATE INDEX IF NOT EXISTS idx_webhook_del_wid_ts ON webhook_deliveries (webhook_id, created_at)');

    // Cron execution log — tracks cron job runs
    db.exec(`
      CREATE TABLE IF NOT EXISTS cron_executions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        job_id TEXT NOT NULL,
        action TEXT NOT NULL,
        success INTEGER NOT NULL DEFAULT 1,
        error TEXT,
        executed_at INTEGER NOT NULL DEFAULT (unixepoch())
      )
    `);
    db.exec('CREATE INDEX IF NOT EXISTS idx_cron_exec_jid_ts ON cron_executions (job_id, executed_at)');
  },
};
