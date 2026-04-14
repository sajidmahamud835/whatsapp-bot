import { getDatabase } from './database.js';

export interface CronExecEntry {
  job_id: string;
  action: string;
  success: boolean;
  error: string | null;
}

export const cronLogStore = {
  log(entry: CronExecEntry): void {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO cron_executions (job_id, action, success, error)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(entry.job_id, entry.action, entry.success ? 1 : 0, entry.error);
  },

  getByJobId(jobId: string, limit = 50): Array<CronExecEntry & { executed_at: number }> {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT job_id, action, success, error, executed_at
      FROM cron_executions
      WHERE job_id = ?
      ORDER BY executed_at DESC
      LIMIT ?
    `);
    const rows = stmt.all(jobId, limit) as any[];
    return rows.map(r => ({
      job_id: r.job_id,
      action: r.action,
      success: r.success === 1,
      error: r.error,
      executed_at: r.executed_at,
    }));
  },

  countTodayExecutions(): number {
    const db = getDatabase();
    const todayStart = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000);
    const stmt = db.prepare('SELECT COUNT(*) as count FROM cron_executions WHERE executed_at >= ?');
    return (stmt.get(todayStart) as { count: number }).count;
  },

  purge(olderThanDays: number): number {
    const db = getDatabase();
    const cutoff = Math.floor(Date.now() / 1000) - (olderThanDays * 86400);
    const stmt = db.prepare('DELETE FROM cron_executions WHERE executed_at < ?');
    return stmt.run(cutoff).changes;
  },
};
