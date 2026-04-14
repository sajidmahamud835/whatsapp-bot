import { Router } from 'express';
import type { Request, Response } from 'express';
import { campaignsService } from '../services/campaigns.js';

const router = Router();

// ─── GET /pro/campaigns — list campaigns ─────────────────────────────────────

router.get('/pro/campaigns', (req: Request, res: Response) => {
  const status = req.query['status'] as string | undefined;
  const campaigns = campaignsService.list(status);
  res.json({ campaigns, total: campaigns.length });
});

// ─── POST /pro/campaigns — create campaign ──────────────────────────────────

router.post('/pro/campaigns', (req: Request, res: Response) => {
  const { name, client_id, message, template_id, audience_type, audience_data, scheduled_at } = req.body;

  if (!name || !client_id || !message || !audience_data) {
    res.status(400).json({ error: 'Bad Request', message: 'name, client_id, message, and audience_data are required' });
    return;
  }

  const campaign = campaignsService.create({ name, client_id, message, template_id, audience_type, audience_data, scheduled_at });
  res.status(201).json({ success: true, campaign });
});

// ─── GET /pro/campaigns/:id — campaign detail ────────────────────────────────

router.get('/pro/campaigns/:id', (req: Request, res: Response) => {
  const campaign = campaignsService.get(String(req.params.id));
  if (!campaign) {
    res.status(404).json({ error: 'Not Found', message: 'Campaign not found' });
    return;
  }
  const recipients = campaignsService.getRecipients(campaign.id);
  res.json({ campaign, recipients });
});

// ─── PUT /pro/campaigns/:id — update draft campaign ─────────────────────────

router.put('/pro/campaigns/:id', (req: Request, res: Response) => {
  try {
    const campaign = campaignsService.update(String(req.params.id), req.body);
    res.json({ success: true, campaign });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const status = msg.includes('not found') ? 404 : msg.includes('draft') ? 400 : 500;
    res.status(status).json({ error: 'Error', message: msg });
  }
});

// ─── POST /pro/campaigns/:id/send — execute campaign ────────────────────────

router.post('/pro/campaigns/:id/send', async (req: Request, res: Response) => {
  try {
    const stats = await campaignsService.send(String(req.params.id));
    res.json({ success: true, stats });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const status = msg.includes('not found') ? 404 : msg.includes('not ready') ? 503 : 500;
    res.status(status).json({ error: 'Error', message: msg });
  }
});

// ─── DELETE /pro/campaigns/:id — delete campaign ────────────────────────────

router.delete('/pro/campaigns/:id', (req: Request, res: Response) => {
  try {
    campaignsService.delete(String(req.params.id));
    res.json({ success: true, message: 'Campaign deleted' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(msg.includes('not found') ? 404 : 500).json({ error: 'Error', message: msg });
  }
});

export default router;
