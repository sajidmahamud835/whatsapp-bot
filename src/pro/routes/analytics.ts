import { Router } from 'express';
import type { Request, Response } from 'express';
import { getProDatabase } from '../db/pro-database.js';

const router = Router();

function unixSecondsAgo(days: number): number {
  return Math.floor(Date.now() / 1000) - (days * 86400);
}

function parsePeriod(period: string): number {
  const match = period.match(/^(\d+)d$/);
  return match ? parseInt(match[1]!) : 7;
}

// ─── GET /pro/analytics/overview — dashboard KPIs ────────────────────────────

router.get('/pro/analytics/overview', (_req: Request, res: Response) => {
  const db = getProDatabase();
  const todayStart = unixSecondsAgo(1);
  const weekStart = unixSecondsAgo(7);
  const monthStart = unixSecondsAgo(30);

  const messagesToday = (db.prepare('SELECT COUNT(*) as c FROM messages WHERE timestamp >= ?').get(todayStart) as any).c;
  const messagesWeek = (db.prepare('SELECT COUNT(*) as c FROM messages WHERE timestamp >= ?').get(weekStart) as any).c;
  const messagesMonth = (db.prepare('SELECT COUNT(*) as c FROM messages WHERE timestamp >= ?').get(monthStart) as any).c;
  const activeConversations = (db.prepare('SELECT COUNT(DISTINCT jid) as c FROM messages WHERE timestamp >= ?').get(weekStart) as any).c;
  const aiReplies = (db.prepare('SELECT COUNT(*) as c FROM ai_conversations WHERE role = ? AND created_at >= ?').get('assistant', weekStart) as any).c;
  const totalContacts = (db.prepare('SELECT COUNT(*) as c FROM pro_contacts').get() as any).c;
  const totalCampaigns = (db.prepare('SELECT COUNT(*) as c FROM pro_campaigns').get() as any).c;

  res.json({
    overview: {
      messagesToday,
      messagesThisWeek: messagesWeek,
      messagesThisMonth: messagesMonth,
      activeConversations,
      aiReplies,
      totalContacts,
      totalCampaigns,
    },
  });
});

// ─── GET /pro/analytics/messages — message volume over time ──────────────────

router.get('/pro/analytics/messages', (req: Request, res: Response) => {
  const db = getProDatabase();
  const days = parsePeriod((req.query['period'] as string) || '7d');
  const clientId = req.query['clientId'] as string | undefined;
  const since = unixSecondsAgo(days);

  let query = `
    SELECT
      date(timestamp, 'unixepoch') as date,
      SUM(CASE WHEN from_me = 0 THEN 1 ELSE 0 END) as received,
      SUM(CASE WHEN from_me = 1 THEN 1 ELSE 0 END) as sent
    FROM messages
    WHERE timestamp >= ?
  `;
  const params: unknown[] = [since];

  if (clientId) {
    query += ' AND client_id = ?';
    params.push(clientId);
  }

  query += ' GROUP BY date ORDER BY date';

  const data = db.prepare(query).all(...params);
  res.json({ period: `${days}d`, data });
});

// ─── GET /pro/analytics/conversations — top contacts ─────────────────────────

router.get('/pro/analytics/conversations', (req: Request, res: Response) => {
  const db = getProDatabase();
  const days = parsePeriod((req.query['period'] as string) || '7d');
  const limit = parseInt(req.query['limit'] as string) || 20;
  const since = unixSecondsAgo(days);

  const data = db.prepare(`
    SELECT
      jid,
      COUNT(*) as message_count,
      SUM(CASE WHEN from_me = 0 THEN 1 ELSE 0 END) as received,
      SUM(CASE WHEN from_me = 1 THEN 1 ELSE 0 END) as sent,
      MAX(timestamp) as last_message
    FROM messages
    WHERE timestamp >= ?
    GROUP BY jid
    ORDER BY message_count DESC
    LIMIT ?
  `).all(since, limit);

  res.json({ period: `${days}d`, conversations: data });
});

// ─── GET /pro/analytics/ai — AI performance ─────────────────────────────────

router.get('/pro/analytics/ai', (req: Request, res: Response) => {
  const db = getProDatabase();
  const days = parsePeriod((req.query['period'] as string) || '7d');
  const since = unixSecondsAgo(days);

  const totalReplies = (db.prepare('SELECT COUNT(*) as c FROM ai_conversations WHERE role = ? AND created_at >= ?').get('assistant', since) as any).c;
  const uniqueContacts = (db.prepare('SELECT COUNT(DISTINCT jid) as c FROM ai_conversations WHERE created_at >= ?').get(since) as any).c;
  const totalMessages = (db.prepare('SELECT COUNT(*) as c FROM ai_conversations WHERE created_at >= ?').get(since) as any).c;

  res.json({
    period: `${days}d`,
    ai: {
      totalReplies,
      uniqueContacts,
      totalMessages,
      avgMessagesPerConvo: uniqueContacts > 0 ? Math.round(totalMessages / uniqueContacts) : 0,
    },
  });
});

// ─── GET /pro/analytics/campaigns — campaign performance ─────────────────────

router.get('/pro/analytics/campaigns', (_req: Request, res: Response) => {
  const db = getProDatabase();

  const campaigns = db.prepare(`
    SELECT
      c.id, c.name, c.status, c.created_at, c.completed_at,
      COUNT(r.id) as total_recipients,
      SUM(CASE WHEN r.status = 'sent' THEN 1 ELSE 0 END) as sent,
      SUM(CASE WHEN r.status = 'failed' THEN 1 ELSE 0 END) as failed
    FROM pro_campaigns c
    LEFT JOIN pro_campaign_recipients r ON r.campaign_id = c.id
    GROUP BY c.id
    ORDER BY c.created_at DESC
    LIMIT 20
  `).all();

  res.json({ campaigns });
});

// ─── GET /pro/analytics/export — export data ─────────────────────────────────

router.get('/pro/analytics/export', (req: Request, res: Response) => {
  const db = getProDatabase();
  const type = (req.query['type'] as string) || 'messages';
  const format = (req.query['format'] as string) || 'json';
  const days = parsePeriod((req.query['period'] as string) || '30d');
  const since = unixSecondsAgo(days);

  let data: unknown[];

  switch (type) {
    case 'messages':
      data = db.prepare('SELECT id, client_id, jid, body, type, timestamp, from_me FROM messages WHERE timestamp >= ? ORDER BY timestamp DESC LIMIT 10000').all(since);
      break;
    case 'contacts':
      data = db.prepare('SELECT id, jid, name, phone, email, notes, created_at FROM pro_contacts ORDER BY name').all();
      break;
    case 'campaigns':
      data = db.prepare('SELECT * FROM pro_campaigns ORDER BY created_at DESC').all();
      break;
    default:
      res.status(400).json({ error: 'Bad Request', message: 'type must be: messages, contacts, or campaigns' });
      return;
  }

  if (format === 'csv') {
    if (data.length === 0) {
      res.setHeader('Content-Type', 'text/csv');
      res.send('');
      return;
    }
    const headers = Object.keys(data[0] as Record<string, unknown>);
    const csvRows = [
      headers.join(','),
      ...data.map(row => headers.map(h => {
        const val = (row as Record<string, unknown>)[h];
        const str = String(val ?? '');
        return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
      }).join(',')),
    ];
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${type}-export.csv"`);
    res.send(csvRows.join('\n'));
  } else {
    res.json({ type, period: `${days}d`, count: data.length, data });
  }
});

export default router;
