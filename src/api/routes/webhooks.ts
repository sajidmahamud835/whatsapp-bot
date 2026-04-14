import { Router } from 'express';
import type { Request, Response } from 'express';
import { webhookManager } from '../../core/webhooks/manager.js';
import { webhookLogStore } from '../../core/db/webhook-log-store.js';
import { validate } from '../middleware/validate.js';
import { createWebhookSchema, updateWebhookSchema } from '../schemas/webhooks.js';

const router = Router();

// ─── GET /webhooks — list all ────────────────────────────────────────────────

router.get('/webhooks', (_req: Request, res: Response) => {
  const webhooks = webhookManager.list();
  res.json({ webhooks, total: webhooks.length });
});

// ─── POST /webhooks — register new webhook ──────────────────────────────────

router.post('/webhooks', validate(createWebhookSchema), (req: Request, res: Response) => {
  const { url, events, secret, enabled } = req.body as {
    url: string;
    events?: string[];
    secret?: string;
    enabled?: boolean;
  };

  const webhook = webhookManager.register({ url, events, secret, enabled });
  res.status(201).json({ success: true, webhook });
});

// ─── GET /webhooks/:id — get single webhook ─────────────────────────────────

router.get('/webhooks/:id', (req: Request, res: Response) => {
  const webhook = webhookManager.get(req.params.id as string);
  if (!webhook) {
    res.status(404).json({ error: 'Not Found', message: `Webhook ${req.params.id} not found` });
    return;
  }

  const deliveries = webhookLogStore.getByWebhookId(webhook.id, 10);
  res.json({ webhook, recentDeliveries: deliveries });
});

// ─── PUT /webhooks/:id — update webhook ──────────────────────────────────────

router.put('/webhooks/:id', validate(updateWebhookSchema), (req: Request, res: Response) => {
  try {
    const webhook = webhookManager.update(req.params.id as string, req.body);
    res.json({ success: true, webhook });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('not found')) {
      res.status(404).json({ error: 'Not Found', message: msg });
    } else {
      res.status(500).json({ error: 'Internal Server Error', message: msg });
    }
  }
});

// ─── DELETE /webhooks/:id — delete webhook ───────────────────────────────────

router.delete('/webhooks/:id', (req: Request, res: Response) => {
  try {
    webhookManager.delete(req.params.id as string);
    res.json({ success: true, message: `Webhook ${req.params.id} deleted` });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('not found')) {
      res.status(404).json({ error: 'Not Found', message: msg });
    } else {
      res.status(500).json({ error: 'Internal Server Error', message: msg });
    }
  }
});

// ─── POST /webhooks/:id/test — send test payload ────────────────────────────

router.post('/webhooks/:id/test', async (req: Request, res: Response) => {
  try {
    const result = await webhookManager.test(req.params.id as string);
    res.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('not found')) {
      res.status(404).json({ error: 'Not Found', message: msg });
    } else {
      res.status(500).json({ error: 'Internal Server Error', message: msg });
    }
  }
});

// ─── GET /webhooks/:id/deliveries — delivery log ────────────────────────────

router.get('/webhooks/:id/deliveries', (req: Request, res: Response) => {
  const webhook = webhookManager.get(req.params.id as string);
  if (!webhook) {
    res.status(404).json({ error: 'Not Found', message: `Webhook ${req.params.id} not found` });
    return;
  }

  const limit = parseInt(req.query['limit'] as string) || 50;
  const deliveries = webhookLogStore.getByWebhookId(webhook.id, limit);
  res.json({ deliveries, total: deliveries.length });
});

export default router;
