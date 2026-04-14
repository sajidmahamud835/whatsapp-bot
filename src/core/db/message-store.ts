import { getDatabase } from './database.js';

export interface StoredMessage {
  id: string;
  client_id: string;
  jid: string;
  body: string | null;
  type: string;
  timestamp: number;
  from_me: boolean;
  has_media: boolean;
  media_url?: string | null;
  raw?: string | null;
}

export const messageStore = {
  insert(msg: StoredMessage): void {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO messages (id, client_id, jid, body, type, timestamp, from_me, has_media, media_url, raw)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      msg.id,
      msg.client_id,
      msg.jid,
      msg.body,
      msg.type,
      msg.timestamp,
      msg.from_me ? 1 : 0,
      msg.has_media ? 1 : 0,
      msg.media_url ?? null,
      msg.raw ?? null,
    );
  },

  getByJid(clientId: string, jid: string, limit = 50, offset = 0): StoredMessage[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM messages
      WHERE client_id = ? AND jid = ?
      ORDER BY timestamp DESC
      LIMIT ? OFFSET ?
    `);
    const rows = stmt.all(clientId, jid, limit, offset) as any[];
    return rows.map(rowToMessage);
  },

  getRecent(clientId: string, limit = 50): StoredMessage[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM messages
      WHERE client_id = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `);
    const rows = stmt.all(clientId, limit) as any[];
    return rows.map(rowToMessage);
  },

  countSince(sinceTimestamp: number): number {
    const db = getDatabase();
    const stmt = db.prepare('SELECT COUNT(*) as count FROM messages WHERE timestamp >= ?');
    return (stmt.get(sinceTimestamp) as { count: number }).count;
  },

  countSentSince(sinceTimestamp: number): number {
    const db = getDatabase();
    const stmt = db.prepare('SELECT COUNT(*) as count FROM messages WHERE timestamp >= ? AND from_me = 1');
    return (stmt.get(sinceTimestamp) as { count: number }).count;
  },

  countReceivedSince(sinceTimestamp: number): number {
    const db = getDatabase();
    const stmt = db.prepare('SELECT COUNT(*) as count FROM messages WHERE timestamp >= ? AND from_me = 0');
    return (stmt.get(sinceTimestamp) as { count: number }).count;
  },

  totalCount(): number {
    const db = getDatabase();
    const stmt = db.prepare('SELECT COUNT(*) as count FROM messages');
    return (stmt.get() as { count: number }).count;
  },

  purge(olderThanDays: number): number {
    const db = getDatabase();
    const cutoff = Math.floor(Date.now() / 1000) - (olderThanDays * 86400);
    const stmt = db.prepare('DELETE FROM messages WHERE timestamp < ?');
    return stmt.run(cutoff).changes;
  },
};

function rowToMessage(row: any): StoredMessage {
  return {
    id: row.id,
    client_id: row.client_id,
    jid: row.jid,
    body: row.body,
    type: row.type,
    timestamp: row.timestamp,
    from_me: row.from_me === 1,
    has_media: row.has_media === 1,
    media_url: row.media_url,
    raw: row.raw,
  };
}
