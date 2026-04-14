import type Database from 'better-sqlite3';

export const migration001Pro = {
  version: 1,
  name: 'pro-tables',
  up(db: Database.Database): void {
    // ─── Managed Contacts ────────────────────────────────────────────────
    db.exec(`
      CREATE TABLE IF NOT EXISTS pro_contacts (
        id TEXT PRIMARY KEY,
        jid TEXT NOT NULL UNIQUE,
        name TEXT,
        phone TEXT NOT NULL,
        email TEXT,
        notes TEXT,
        custom_fields TEXT DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    db.exec('CREATE INDEX IF NOT EXISTS idx_pro_contacts_phone ON pro_contacts (phone)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_pro_contacts_jid ON pro_contacts (jid)');

    // ─── Contact Tags ────────────────────────────────────────────────────
    db.exec(`
      CREATE TABLE IF NOT EXISTS pro_tags (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        color TEXT DEFAULT '#8b949e',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    // ─── Contact-Tag relationship ────────────────────────────────────────
    db.exec(`
      CREATE TABLE IF NOT EXISTS pro_contact_tags (
        contact_id TEXT NOT NULL,
        tag_id TEXT NOT NULL,
        PRIMARY KEY (contact_id, tag_id),
        FOREIGN KEY (contact_id) REFERENCES pro_contacts(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES pro_tags(id) ON DELETE CASCADE
      )
    `);

    // ─── Quick Reply Templates ───────────────────────────────────────────
    db.exec(`
      CREATE TABLE IF NOT EXISTS pro_templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT DEFAULT 'general',
        body TEXT NOT NULL,
        variables TEXT DEFAULT '[]',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    // ─── Broadcast Campaigns ─────────────────────────────────────────────
    db.exec(`
      CREATE TABLE IF NOT EXISTS pro_campaigns (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        client_id TEXT NOT NULL,
        message TEXT NOT NULL,
        template_id TEXT,
        status TEXT NOT NULL DEFAULT 'draft',
        audience_type TEXT NOT NULL DEFAULT 'numbers',
        audience_data TEXT NOT NULL DEFAULT '[]',
        scheduled_at TEXT,
        started_at TEXT,
        completed_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (template_id) REFERENCES pro_templates(id) ON DELETE SET NULL
      )
    `);
    db.exec('CREATE INDEX IF NOT EXISTS idx_pro_campaigns_status ON pro_campaigns (status)');

    // ─── Campaign Recipients (delivery tracking) ─────────────────────────
    db.exec(`
      CREATE TABLE IF NOT EXISTS pro_campaign_recipients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        campaign_id TEXT NOT NULL,
        jid TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        message_id TEXT,
        sent_at TEXT,
        error TEXT,
        FOREIGN KEY (campaign_id) REFERENCES pro_campaigns(id) ON DELETE CASCADE
      )
    `);
    db.exec('CREATE INDEX IF NOT EXISTS idx_pro_camp_recip_cid ON pro_campaign_recipients (campaign_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_pro_camp_recip_status ON pro_campaign_recipients (campaign_id, status)');
  },
};
