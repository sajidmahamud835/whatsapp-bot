import { getDatabase } from './database.js';
import type { AIMessage } from '../ai/types.js';

export const aiHistoryStore = {
  getHistory(jid: string, limit = 10): AIMessage[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT role, content FROM ai_conversations
      WHERE jid = ?
      ORDER BY id DESC
      LIMIT ?
    `);
    const rows = stmt.all(jid, limit) as { role: string; content: string }[];
    // Reverse so oldest first (chronological order)
    return rows.reverse().map(r => ({ role: r.role as AIMessage['role'], content: r.content }));
  },

  appendMessage(jid: string, role: string, content: string): void {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO ai_conversations (jid, role, content)
      VALUES (?, ?, ?)
    `);
    stmt.run(jid, role, content);
  },

  clearHistory(jid: string): void {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM ai_conversations WHERE jid = ?');
    stmt.run(jid);
  },

  conversationCount(): number {
    const db = getDatabase();
    const stmt = db.prepare('SELECT COUNT(DISTINCT jid) as count FROM ai_conversations');
    return (stmt.get() as { count: number }).count;
  },

  purge(olderThanDays: number): number {
    const db = getDatabase();
    const cutoff = Math.floor(Date.now() / 1000) - (olderThanDays * 86400);
    const stmt = db.prepare('DELETE FROM ai_conversations WHERE created_at < ?');
    return stmt.run(cutoff).changes;
  },
};
