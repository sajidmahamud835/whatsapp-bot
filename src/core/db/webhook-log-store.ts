import { getDatabase } from './database.js';

export interface DeliveryLogEntry {
  webhook_id: string;
  event: string;
  status_code: number | null;
  response_time_ms: number | null;
  error: string | null;
  payload?: string | null;
}

export const webhookLogStore = {
  log(entry: DeliveryLogEntry): void {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO webhook_deliveries (webhook_id, event, status_code, response_time_ms, error, payload)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      entry.webhook_id,
      entry.event,
      entry.status_code,
      entry.response_time_ms,
      entry.error,
      entry.payload ?? null,
    );
  },

  getByWebhookId(webhookId: string, limit = 100): DeliveryLogEntry[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT webhook_id, event, status_code, response_time_ms, error, created_at
      FROM webhook_deliveries
      WHERE webhook_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `);
    return stmt.all(webhookId, limit) as DeliveryLogEntry[];
  },

  countSince(sinceTimestamp: number): number {
    const db = getDatabase();
    const stmt = db.prepare('SELECT COUNT(*) as count FROM webhook_deliveries WHERE created_at >= ?');
    return (stmt.get(sinceTimestamp) as { count: number }).count;
  },

  purge(olderThanDays: number): number {
    const db = getDatabase();
    const cutoff = Math.floor(Date.now() / 1000) - (olderThanDays * 86400);
    const stmt = db.prepare('DELETE FROM webhook_deliveries WHERE created_at < ?');
    return stmt.run(cutoff).changes;
  },
};
