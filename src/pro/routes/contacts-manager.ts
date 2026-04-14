import { Router } from 'express';
import type { Request, Response } from 'express';
import { contactsService } from '../services/contacts.js';

const router = Router();

// ─── GET /pro/contacts — list managed contacts ──────────────────────────────

router.get('/pro/contacts', (req: Request, res: Response) => {
  const tag = req.query['tag'] as string | undefined;
  const search = req.query['search'] as string | undefined;
  const limit = parseInt(req.query['limit'] as string) || 50;
  const offset = parseInt(req.query['offset'] as string) || 0;

  const result = contactsService.list({ tag, search, limit, offset });
  res.json(result);
});

// ─── POST /pro/contacts — create contact ────────────────────────────────────

router.post('/pro/contacts', (req: Request, res: Response) => {
  const { phone, name, email, notes, tags, custom_fields } = req.body;

  if (!phone) {
    res.status(400).json({ error: 'Bad Request', message: 'phone is required' });
    return;
  }

  try {
    const contact = contactsService.create({ phone, name, email, notes, tags, custom_fields });
    res.status(201).json({ success: true, contact });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('UNIQUE')) {
      res.status(409).json({ error: 'Conflict', message: 'Contact with this phone already exists' });
    } else {
      res.status(500).json({ error: 'Internal Server Error', message: msg });
    }
  }
});

// ─── POST /pro/contacts/import — bulk import ────────────────────────────────

router.post('/pro/contacts/import', (req: Request, res: Response) => {
  const { contacts } = req.body as { contacts?: Array<{ phone: string; name?: string; tags?: string[] }> };

  if (!Array.isArray(contacts) || contacts.length === 0) {
    res.status(400).json({ error: 'Bad Request', message: 'contacts array is required' });
    return;
  }

  const result = contactsService.importBulk(contacts);
  res.json({ success: true, ...result });
});

// ─── GET /pro/contacts/:id — get contact detail ─────────────────────────────

router.get('/pro/contacts/:id', (req: Request, res: Response) => {
  const contact = contactsService.get(String(req.params.id));
  if (!contact) {
    res.status(404).json({ error: 'Not Found', message: 'Contact not found' });
    return;
  }
  res.json({ contact });
});

// ─── PUT /pro/contacts/:id — update contact ─────────────────────────────────

router.put('/pro/contacts/:id', (req: Request, res: Response) => {
  try {
    const contact = contactsService.update(String(req.params.id), req.body);
    res.json({ success: true, contact });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('not found')) {
      res.status(404).json({ error: 'Not Found', message: msg });
    } else {
      res.status(500).json({ error: 'Internal Server Error', message: msg });
    }
  }
});

// ─── DELETE /pro/contacts/:id — remove contact ──────────────────────────────

router.delete('/pro/contacts/:id', (req: Request, res: Response) => {
  try {
    contactsService.delete(String(req.params.id));
    res.json({ success: true, message: 'Contact deleted' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(msg.includes('not found') ? 404 : 500).json({ error: msg.includes('not found') ? 'Not Found' : 'Error', message: msg });
  }
});

// ─── Tags ────────────────────────────────────────────────────────────────────

router.get('/pro/tags', (_req: Request, res: Response) => {
  res.json({ tags: contactsService.listTags() });
});

router.post('/pro/tags', (req: Request, res: Response) => {
  const { name, color } = req.body;
  if (!name) {
    res.status(400).json({ error: 'Bad Request', message: 'name is required' });
    return;
  }
  try {
    const tag = contactsService.createTag(name, color);
    res.status(201).json({ success: true, tag });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(msg.includes('UNIQUE') ? 409 : 500).json({ error: 'Error', message: msg });
  }
});

router.delete('/pro/tags/:id', (req: Request, res: Response) => {
  contactsService.deleteTag(String(req.params.id));
  res.json({ success: true, message: 'Tag deleted' });
});

// ─── Segments ────────────────────────────────────────────────────────────────

router.post('/pro/segments/query', (req: Request, res: Response) => {
  const { tagIds } = req.body as { tagIds?: string[] };
  if (!Array.isArray(tagIds) || tagIds.length === 0) {
    res.status(400).json({ error: 'Bad Request', message: 'tagIds array is required' });
    return;
  }
  const result = contactsService.getSegment(tagIds);
  res.json(result);
});

export default router;
