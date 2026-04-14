import type Database from 'better-sqlite3';

export const migration002Flows = {
  version: 2,
  name: 'flow-builder-tables',
  up(db: Database.Database): void {
    // Bot flows — stores the visual flow definition
    db.exec(`
      CREATE TABLE IF NOT EXISTS pro_flows (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        client_id TEXT NOT NULL DEFAULT '1',
        trigger_type TEXT NOT NULL DEFAULT 'message',
        trigger_config TEXT NOT NULL DEFAULT '{}',
        nodes TEXT NOT NULL DEFAULT '[]',
        edges TEXT NOT NULL DEFAULT '[]',
        variables TEXT NOT NULL DEFAULT '{}',
        enabled INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    db.exec('CREATE INDEX IF NOT EXISTS idx_pro_flows_enabled ON pro_flows (enabled)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_pro_flows_trigger ON pro_flows (trigger_type, enabled)');

    // Flow execution log
    db.exec(`
      CREATE TABLE IF NOT EXISTS pro_flow_executions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        flow_id TEXT NOT NULL,
        client_id TEXT NOT NULL,
        jid TEXT NOT NULL,
        trigger_data TEXT,
        status TEXT NOT NULL DEFAULT 'running',
        nodes_executed INTEGER DEFAULT 0,
        error TEXT,
        started_at TEXT NOT NULL DEFAULT (datetime('now')),
        completed_at TEXT,
        FOREIGN KEY (flow_id) REFERENCES pro_flows(id) ON DELETE CASCADE
      )
    `);
    db.exec('CREATE INDEX IF NOT EXISTS idx_pro_flow_exec_fid ON pro_flow_executions (flow_id)');

    // Flow conversation state — tracks where a user is in a multi-step flow
    db.exec(`
      CREATE TABLE IF NOT EXISTS pro_flow_state (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        flow_id TEXT NOT NULL,
        jid TEXT NOT NULL,
        current_node_id TEXT NOT NULL,
        variables TEXT NOT NULL DEFAULT '{}',
        waiting_for_input INTEGER NOT NULL DEFAULT 0,
        expires_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(flow_id, jid),
        FOREIGN KEY (flow_id) REFERENCES pro_flows(id) ON DELETE CASCADE
      )
    `);
    db.exec('CREATE INDEX IF NOT EXISTS idx_pro_flow_state_jid ON pro_flow_state (jid, waiting_for_input)');
  },
};
