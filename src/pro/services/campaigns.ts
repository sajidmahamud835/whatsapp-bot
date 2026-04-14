import { randomUUID } from 'crypto';
import { getProDatabase } from '../db/pro-database.js';
import { sessions } from '../../core/client-manager.js';
import { contactsService } from './contacts.js';
import { templatesService } from './templates.js';

export type CampaignStatus = 'draft' | 'sending' | 'paused' | 'completed' | 'failed';
export type AudienceType = 'numbers' | 'tags' | 'all';

export interface Campaign {
  id: string;
  name: string;
  client_id: string;
  message: string;
  template_id: string | null;
  status: CampaignStatus;
  audience_type: AudienceType;
  audience_data: string[];
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  stats?: CampaignStats;
}

export interface CampaignStats {
  total: number;
  sent: number;
  failed: number;
  pending: number;
}

function toJid(phone: string): string {
  if (phone.includes('@')) return phone;
  return `${phone.replace(/^\+/, '').replace(/\s/g, '')}@s.whatsapp.net`;
}

export const campaignsService = {
  list(status?: string): Campaign[] {
    const db = getProDatabase();
    let stmt;
    if (status) {
      stmt = db.prepare('SELECT * FROM pro_campaigns WHERE status = ? ORDER BY created_at DESC');
      return (stmt.all(status) as any[]).map(r => this._enrichCampaign(r));
    }
    stmt = db.prepare('SELECT * FROM pro_campaigns ORDER BY created_at DESC');
    return (stmt.all() as any[]).map(r => this._enrichCampaign(r));
  },

  get(id: string): Campaign | null {
    const db = getProDatabase();
    const row = db.prepare('SELECT * FROM pro_campaigns WHERE id = ?').get(id) as any;
    return row ? this._enrichCampaign(row) : null;
  },

  create(data: {
    name: string;
    client_id: string;
    message: string;
    template_id?: string;
    audience_type?: AudienceType;
    audience_data: string[];
    scheduled_at?: string;
  }): Campaign {
    const db = getProDatabase();
    const id = randomUUID();

    db.prepare(`
      INSERT INTO pro_campaigns (id, name, client_id, message, template_id, audience_type, audience_data, scheduled_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, data.name, data.client_id, data.message,
      data.template_id ?? null,
      data.audience_type ?? 'numbers',
      JSON.stringify(data.audience_data),
      data.scheduled_at ?? null,
    );

    return this.get(id)!;
  },

  update(id: string, data: Partial<{ name: string; message: string; audience_data: string[]; scheduled_at: string }>): Campaign {
    const db = getProDatabase();
    const existing = db.prepare('SELECT id, status FROM pro_campaigns WHERE id = ?').get(id) as any;
    if (!existing) throw new Error(`Campaign ${id} not found`);
    if (existing.status !== 'draft') throw new Error('Can only edit draft campaigns');

    const sets: string[] = ["updated_at = datetime('now')"];
    const params: unknown[] = [];

    if (data.name !== undefined) { sets.push('name = ?'); params.push(data.name); }
    if (data.message !== undefined) { sets.push('message = ?'); params.push(data.message); }
    if (data.audience_data !== undefined) { sets.push('audience_data = ?'); params.push(JSON.stringify(data.audience_data)); }
    if (data.scheduled_at !== undefined) { sets.push('scheduled_at = ?'); params.push(data.scheduled_at); }

    params.push(id);
    db.prepare(`UPDATE pro_campaigns SET ${sets.join(', ')} WHERE id = ?`).run(...params);
    return this.get(id)!;
  },

  delete(id: string): void {
    const db = getProDatabase();
    const result = db.prepare('DELETE FROM pro_campaigns WHERE id = ?').run(id);
    if (result.changes === 0) throw new Error(`Campaign ${id} not found`);
  },

  /**
   * Execute a campaign — resolves audience, sends messages, tracks delivery.
   */
  async send(id: string): Promise<CampaignStats> {
    const db = getProDatabase();
    const campaign = this.get(id);
    if (!campaign) throw new Error(`Campaign ${id} not found`);
    if (campaign.status === 'sending') throw new Error('Campaign is already sending');
    if (campaign.status === 'completed') throw new Error('Campaign already completed');

    const session = sessions.get(campaign.client_id);
    if (!session?.isReady || !session.sock) {
      throw new Error(`Client ${campaign.client_id} is not ready`);
    }

    // Resolve audience to JIDs
    let jids: string[];
    if (campaign.audience_type === 'tags') {
      const segment = contactsService.getSegment(campaign.audience_data);
      jids = segment.contacts.map(c => c.jid);
    } else {
      jids = campaign.audience_data.map(toJid);
    }

    if (jids.length === 0) throw new Error('No recipients found');

    // Mark as sending
    db.prepare("UPDATE pro_campaigns SET status = 'sending', started_at = datetime('now'), updated_at = datetime('now') WHERE id = ?").run(id);

    // Clear old recipients and insert new ones
    db.prepare('DELETE FROM pro_campaign_recipients WHERE campaign_id = ?').run(id);
    const insertRecipient = db.prepare(`
      INSERT INTO pro_campaign_recipients (campaign_id, jid, status) VALUES (?, ?, 'pending')
    `);
    for (const jid of jids) insertRecipient.run(id, jid);

    // Resolve message (template rendering if applicable)
    let messageText = campaign.message;
    if (campaign.template_id) {
      const template = templatesService.get(campaign.template_id);
      if (template) messageText = template.body;
    }

    // Send to each recipient
    let sent = 0;
    let failed = 0;
    const updateRecipient = db.prepare(`
      UPDATE pro_campaign_recipients SET status = ?, message_id = ?, sent_at = datetime('now'), error = ?
      WHERE campaign_id = ? AND jid = ?
    `);

    for (const jid of jids) {
      try {
        const result = await session.sock.sendMessage(jid, { text: messageText });
        updateRecipient.run('sent', result?.key.id ?? null, null, id, jid);
        sent++;
        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 500));
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        updateRecipient.run('failed', null, errMsg, id, jid);
        failed++;
      }
    }

    // Mark completed
    db.prepare("UPDATE pro_campaigns SET status = 'completed', completed_at = datetime('now'), updated_at = datetime('now') WHERE id = ?").run(id);

    return { total: jids.length, sent, failed, pending: 0 };
  },

  getRecipients(campaignId: string): Array<{ jid: string; status: string; message_id: string | null; sent_at: string | null; error: string | null }> {
    const db = getProDatabase();
    return db.prepare('SELECT jid, status, message_id, sent_at, error FROM pro_campaign_recipients WHERE campaign_id = ? ORDER BY id').all(campaignId) as any[];
  },

  _enrichCampaign(row: any): Campaign {
    const db = getProDatabase();
    const statsRow = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
      FROM pro_campaign_recipients WHERE campaign_id = ?
    `).get(row.id) as any;

    return {
      id: row.id,
      name: row.name,
      client_id: row.client_id,
      message: row.message,
      template_id: row.template_id,
      status: row.status,
      audience_type: row.audience_type,
      audience_data: JSON.parse(row.audience_data || '[]'),
      scheduled_at: row.scheduled_at,
      started_at: row.started_at,
      completed_at: row.completed_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
      stats: statsRow?.total > 0 ? {
        total: statsRow.total,
        sent: statsRow.sent,
        failed: statsRow.failed,
        pending: statsRow.pending,
      } : undefined,
    };
  },
};
