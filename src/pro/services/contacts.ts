import { randomUUID } from 'crypto';
import { getProDatabase } from '../db/pro-database.js';

export interface ManagedContact {
  id: string;
  jid: string;
  name: string | null;
  phone: string;
  email: string | null;
  notes: string | null;
  custom_fields: Record<string, string>;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  contact_count?: number;
}

function toJid(phone: string): string {
  if (phone.includes('@')) return phone;
  const clean = phone.replace(/^\+/, '').replace(/\s/g, '');
  return `${clean}@s.whatsapp.net`;
}

export const contactsService = {
  list(options?: { tag?: string; search?: string; limit?: number; offset?: number }): { contacts: ManagedContact[]; total: number } {
    const db = getProDatabase();
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;
    const params: unknown[] = [];

    let where = '';
    if (options?.tag) {
      where = ' WHERE c.id IN (SELECT contact_id FROM pro_contact_tags WHERE tag_id = ?)';
      params.push(options.tag);
    }
    if (options?.search) {
      const searchClause = where ? ' AND' : ' WHERE';
      where += `${searchClause} (c.name LIKE ? OR c.phone LIKE ? OR c.jid LIKE ?)`;
      const term = `%${options.search}%`;
      params.push(term, term, term);
    }

    const countStmt = db.prepare(`SELECT COUNT(*) as count FROM pro_contacts c${where}`);
    const total = (countStmt.get(...params) as { count: number }).count;

    const stmt = db.prepare(`
      SELECT c.* FROM pro_contacts c${where}
      ORDER BY c.updated_at DESC LIMIT ? OFFSET ?
    `);
    const rows = stmt.all(...params, limit, offset) as any[];

    const contacts = rows.map(r => this._enrichContact(r));
    return { contacts, total };
  },

  get(id: string): ManagedContact | null {
    const db = getProDatabase();
    const row = db.prepare('SELECT * FROM pro_contacts WHERE id = ?').get(id) as any;
    if (!row) return null;
    return this._enrichContact(row);
  },

  getByJid(jid: string): ManagedContact | null {
    const db = getProDatabase();
    const row = db.prepare('SELECT * FROM pro_contacts WHERE jid = ?').get(jid) as any;
    if (!row) return null;
    return this._enrichContact(row);
  },

  create(data: { phone: string; name?: string; email?: string; notes?: string; tags?: string[]; custom_fields?: Record<string, string> }): ManagedContact {
    const db = getProDatabase();
    const id = randomUUID();
    const jid = toJid(data.phone);

    db.prepare(`
      INSERT INTO pro_contacts (id, jid, name, phone, email, notes, custom_fields)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, jid, data.name ?? null, data.phone, data.email ?? null, data.notes ?? null, JSON.stringify(data.custom_fields ?? {}));

    if (data.tags?.length) {
      const tagStmt = db.prepare('INSERT OR IGNORE INTO pro_contact_tags (contact_id, tag_id) VALUES (?, ?)');
      for (const tagId of data.tags) {
        tagStmt.run(id, tagId);
      }
    }

    return this.get(id)!;
  },

  update(id: string, data: Partial<{ name: string; email: string; notes: string; phone: string; tags: string[]; custom_fields: Record<string, string> }>): ManagedContact {
    const db = getProDatabase();
    const existing = db.prepare('SELECT id FROM pro_contacts WHERE id = ?').get(id);
    if (!existing) throw new Error(`Contact ${id} not found`);

    const sets: string[] = ["updated_at = datetime('now')"];
    const params: unknown[] = [];

    if (data.name !== undefined) { sets.push('name = ?'); params.push(data.name); }
    if (data.email !== undefined) { sets.push('email = ?'); params.push(data.email); }
    if (data.notes !== undefined) { sets.push('notes = ?'); params.push(data.notes); }
    if (data.phone !== undefined) {
      sets.push('phone = ?', 'jid = ?');
      params.push(data.phone, toJid(data.phone));
    }
    if (data.custom_fields !== undefined) { sets.push('custom_fields = ?'); params.push(JSON.stringify(data.custom_fields)); }

    params.push(id);
    db.prepare(`UPDATE pro_contacts SET ${sets.join(', ')} WHERE id = ?`).run(...params);

    // Update tags if provided
    if (data.tags !== undefined) {
      db.prepare('DELETE FROM pro_contact_tags WHERE contact_id = ?').run(id);
      const tagStmt = db.prepare('INSERT OR IGNORE INTO pro_contact_tags (contact_id, tag_id) VALUES (?, ?)');
      for (const tagId of data.tags) {
        tagStmt.run(id, tagId);
      }
    }

    return this.get(id)!;
  },

  delete(id: string): void {
    const db = getProDatabase();
    const result = db.prepare('DELETE FROM pro_contacts WHERE id = ?').run(id);
    if (result.changes === 0) throw new Error(`Contact ${id} not found`);
  },

  importBulk(contacts: Array<{ phone: string; name?: string; tags?: string[] }>): { imported: number; skipped: number } {
    const db = getProDatabase();
    let imported = 0;
    let skipped = 0;

    const insertContact = db.prepare(`
      INSERT OR IGNORE INTO pro_contacts (id, jid, name, phone, custom_fields)
      VALUES (?, ?, ?, ?, '{}')
    `);
    const insertTag = db.prepare('INSERT OR IGNORE INTO pro_contact_tags (contact_id, tag_id) VALUES (?, ?)');

    const runBatch = db.transaction(() => {
      for (const c of contacts) {
        const id = randomUUID();
        const jid = toJid(c.phone);
        const result = insertContact.run(id, jid, c.name ?? null, c.phone);
        if (result.changes > 0) {
          imported++;
          if (c.tags?.length) {
            for (const tagId of c.tags) insertTag.run(id, tagId);
          }
        } else {
          skipped++;
        }
      }
    });

    runBatch();
    return { imported, skipped };
  },

  // ─── Tags ──────────────────────────────────────────────────────────────

  listTags(): Tag[] {
    const db = getProDatabase();
    return db.prepare(`
      SELECT t.*, COUNT(ct.contact_id) as contact_count
      FROM pro_tags t
      LEFT JOIN pro_contact_tags ct ON ct.tag_id = t.id
      GROUP BY t.id
      ORDER BY t.name
    `).all() as Tag[];
  },

  createTag(name: string, color?: string): Tag {
    const db = getProDatabase();
    const id = randomUUID();
    db.prepare('INSERT INTO pro_tags (id, name, color) VALUES (?, ?, ?)').run(id, name, color ?? '#8b949e');
    return { id, name, color: color ?? '#8b949e' };
  },

  deleteTag(id: string): void {
    const db = getProDatabase();
    db.prepare('DELETE FROM pro_tags WHERE id = ?').run(id);
  },

  // ─── Segments (tag-based queries) ──────────────────────────────────────

  getSegment(tagIds: string[]): { contacts: ManagedContact[]; total: number } {
    const db = getProDatabase();
    const placeholders = tagIds.map(() => '?').join(',');
    const stmt = db.prepare(`
      SELECT DISTINCT c.* FROM pro_contacts c
      INNER JOIN pro_contact_tags ct ON ct.contact_id = c.id
      WHERE ct.tag_id IN (${placeholders})
      ORDER BY c.name
    `);
    const rows = stmt.all(...tagIds) as any[];
    const contacts = rows.map(r => this._enrichContact(r));
    return { contacts, total: contacts.length };
  },

  // ─── Internal ──────────────────────────────────────────────────────────

  _enrichContact(row: any): ManagedContact {
    const db = getProDatabase();
    const tagRows = db.prepare(`
      SELECT t.name FROM pro_tags t
      INNER JOIN pro_contact_tags ct ON ct.tag_id = t.id
      WHERE ct.contact_id = ?
    `).all(row.id) as { name: string }[];

    return {
      id: row.id,
      jid: row.jid,
      name: row.name,
      phone: row.phone,
      email: row.email,
      notes: row.notes,
      custom_fields: JSON.parse(row.custom_fields || '{}'),
      tags: tagRows.map(t => t.name),
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  },
};
