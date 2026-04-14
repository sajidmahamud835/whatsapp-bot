import { Router } from 'express';
import type { Request, Response } from 'express';
import { templatesService } from '../services/templates.js';
import { sessions } from '../../core/client-manager.js';

const router = Router();

function toJid(phone: string): string {
  if (phone.includes('@')) return phone;
  return `${phone.replace(/^\+/, '').replace(/\s/g, '')}@s.whatsapp.net`;
}

// ─── GET /pro/templates — list templates ─────────────────────────────────────

router.get('/pro/templates', (req: Request, res: Response) => {
  const category = req.query['category'] as string | undefined;
  const templates = templatesService.list(category);
  res.json({ templates, total: templates.length });
});

// ─── POST /pro/templates — create template ──────────────────────────────────

router.post('/pro/templates', (req: Request, res: Response) => {
  const { name, body, category } = req.body;

  if (!name || !body) {
    res.status(400).json({ error: 'Bad Request', message: 'name and body are required' });
    return;
  }

  const template = templatesService.create({ name, body, category });
  res.status(201).json({ success: true, template });
});

// ─── GET /pro/templates/:id — get template ───────────────────────────────────

router.get('/pro/templates/:id', (req: Request, res: Response) => {
  const template = templatesService.get(String(req.params.id));
  if (!template) {
    res.status(404).json({ error: 'Not Found', message: 'Template not found' });
    return;
  }
  res.json({ template });
});

// ─── PUT /pro/templates/:id — update template ───────────────────────────────

router.put('/pro/templates/:id', (req: Request, res: Response) => {
  try {
    const template = templatesService.update(String(req.params.id), req.body);
    res.json({ success: true, template });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(msg.includes('not found') ? 404 : 500).json({ error: 'Error', message: msg });
  }
});

// ─── DELETE /pro/templates/:id — delete template ────────────────────────────

router.delete('/pro/templates/:id', (req: Request, res: Response) => {
  try {
    templatesService.delete(String(req.params.id));
    res.json({ success: true, message: 'Template deleted' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(msg.includes('not found') ? 404 : 500).json({ error: 'Error', message: msg });
  }
});

// ─── POST /pro/templates/:id/preview — preview with variables ───────────────

router.post('/pro/templates/:id/preview', (req: Request, res: Response) => {
  const template = templatesService.get(String(req.params.id));
  if (!template) {
    res.status(404).json({ error: 'Not Found', message: 'Template not found' });
    return;
  }

  const variables = (req.body.variables ?? {}) as Record<string, string>;
  const rendered = templatesService.render(template.body, variables);
  res.json({ rendered, variables: template.variables });
});

// ─── POST /pro/templates/:id/send — send template to contact ────────────────

router.post('/pro/templates/:id/send', async (req: Request, res: Response) => {
  const template = templatesService.get(String(req.params.id));
  if (!template) {
    res.status(404).json({ error: 'Not Found', message: 'Template not found' });
    return;
  }

  const { clientId, number, variables } = req.body as {
    clientId?: string;
    number?: string;
    variables?: Record<string, string>;
  };

  if (!clientId || !number) {
    res.status(400).json({ error: 'Bad Request', message: 'clientId and number are required' });
    return;
  }

  const session = sessions.get(clientId);
  if (!session?.isReady || !session.sock) {
    res.status(503).json({ error: 'Service Unavailable', message: `Client ${clientId} is not ready` });
    return;
  }

  const rendered = templatesService.render(template.body, variables ?? {});

  try {
    const jid = toJid(number);
    const result = await session.sock.sendMessage(jid, { text: rendered });
    res.json({ success: true, messageId: result?.key.id ?? '', rendered });
  } catch (err) {
    res.status(500).json({ error: 'Send Error', message: err instanceof Error ? err.message : String(err) });
  }
});

export default router;
