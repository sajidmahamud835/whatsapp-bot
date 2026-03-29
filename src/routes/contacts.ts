import { Router } from 'express';
import type { Request, Response } from 'express';
import { toJid } from '../clientManager.js';
import { getSessionOrError, requireReady } from '../utils/session.js';

const router = Router();

// ─── POST /:id/contacts/check — check if numbers are on WhatsApp ──────────────

router.post('/:id/contacts/check', async (req: Request, res: Response) => {
  const session = getSessionOrError(req.params.id, res);
  if (!session || !requireReady(session, res)) return;

  const { numbers } = req.body as { numbers?: string[] };
  if (!Array.isArray(numbers) || numbers.length === 0) {
    res.status(400).json({ error: 'Bad Request', message: 'Missing required field: numbers (array)' });
    return;
  }

  try {
    const results = await session.sock!.onWhatsApp(...numbers);
    res.json({
      success: true,
      data: results.map((r) => ({
        jid: r.jid,
        exists: r.exists,
        number: r.jid.split('@')[0] ?? '',
      })),
    });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Internal Server Error', message: err instanceof Error ? err.message : String(err) });
  }
});

// ─── GET /:id/contacts/:jid/profile-pic ───────────────────────────────────────

router.get('/:id/contacts/:jid/profile-pic', async (req: Request, res: Response) => {
  const session = getSessionOrError(req.params.id, res);
  if (!session || !requireReady(session, res)) return;

  try {
    const jid = toJid(req.params.jid);
    const url = await session.sock!.profilePictureUrl(jid, 'image');
    res.json({ success: true, jid, profilePictureUrl: url ?? null });
  } catch (err: unknown) {
    // 404-style errors are common (no profile pic set or privacy restricted)
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('404') || msg.toLowerCase().includes('not found')) {
      res.json({ success: true, jid: toJid(req.params.jid), profilePictureUrl: null });
    } else {
      res.status(500).json({ error: 'Internal Server Error', message: msg });
    }
  }
});

// ─── GET /:id/contacts/:jid/about ─────────────────────────────────────────────

router.get('/:id/contacts/:jid/about', async (req: Request, res: Response) => {
  const session = getSessionOrError(req.params.id, res);
  if (!session || !requireReady(session, res)) return;

  try {
    const jid = toJid(req.params.jid);
    const status = await session.sock!.fetchStatus(jid);
    res.json({
      success: true,
      jid,
      about: status?.status ?? null,
      setAt: status?.setAt ?? null,
    });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Internal Server Error', message: err instanceof Error ? err.message : String(err) });
  }
});

// ─── GET /:id/contacts/:jid/business ──────────────────────────────────────────

router.get('/:id/contacts/:jid/business', async (req: Request, res: Response) => {
  const session = getSessionOrError(req.params.id, res);
  if (!session || !requireReady(session, res)) return;

  try {
    const jid = toJid(req.params.jid);
    const profile = await session.sock!.getBusinessProfile(jid);
    res.json({ success: true, jid, businessProfile: profile ?? null });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Internal Server Error', message: err instanceof Error ? err.message : String(err) });
  }
});

// ─── POST /:id/contacts/block ─────────────────────────────────────────────────

router.post('/:id/contacts/block', async (req: Request, res: Response) => {
  const session = getSessionOrError(req.params.id, res);
  if (!session || !requireReady(session, res)) return;

  const { number } = req.body as { number?: string };
  if (!number) {
    res.status(400).json({ error: 'Bad Request', message: 'Missing required field: number' });
    return;
  }

  try {
    const jid = toJid(number);
    await session.sock!.updateBlockStatus(jid, 'block');
    res.json({ success: true, jid, blocked: true });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Internal Server Error', message: err instanceof Error ? err.message : String(err) });
  }
});

// ─── POST /:id/contacts/unblock ───────────────────────────────────────────────

router.post('/:id/contacts/unblock', async (req: Request, res: Response) => {
  const session = getSessionOrError(req.params.id, res);
  if (!session || !requireReady(session, res)) return;

  const { number } = req.body as { number?: string };
  if (!number) {
    res.status(400).json({ error: 'Bad Request', message: 'Missing required field: number' });
    return;
  }

  try {
    const jid = toJid(number);
    await session.sock!.updateBlockStatus(jid, 'unblock');
    res.json({ success: true, jid, blocked: false });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Internal Server Error', message: err instanceof Error ? err.message : String(err) });
  }
});

// ─── GET /:id/labels ──────────────────────────────────────────────────────────

router.get('/:id/labels', async (req: Request, res: Response) => {
  const session = getSessionOrError(req.params.id, res);
  if (!session || !requireReady(session, res)) return;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sock = session.sock! as any;
    if (typeof sock.getLabels !== 'function') {
      res.status(501).json({ error: 'Not Implemented', message: 'Labels not supported by this Baileys build' });
      return;
    }
    const labels = await sock.getLabels();
    res.json({ success: true, data: labels });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Internal Server Error', message: err instanceof Error ? err.message : String(err) });
  }
});

// ─── POST /:id/labels — create label ─────────────────────────────────────────

router.post('/:id/labels', async (req: Request, res: Response) => {
  const session = getSessionOrError(req.params.id, res);
  if (!session || !requireReady(session, res)) return;

  const { name, color } = req.body as { name?: string; color?: number };
  if (!name) {
    res.status(400).json({ error: 'Bad Request', message: 'Missing required field: name' });
    return;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sock = session.sock! as any;
    if (typeof sock.addLabel !== 'function') {
      res.status(501).json({ error: 'Not Implemented', message: 'Labels not supported by this Baileys build' });
      return;
    }
    await sock.addLabel(name, { color: color ?? 0, name });
    res.json({ success: true, name });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Internal Server Error', message: err instanceof Error ? err.message : String(err) });
  }
});

// ─── POST /:id/labels/:labelId/assign ────────────────────────────────────────

router.post('/:id/labels/:labelId/assign', async (req: Request, res: Response) => {
  const session = getSessionOrError(req.params.id, res);
  if (!session || !requireReady(session, res)) return;

  const { jid: chatJid, type } = req.body as { jid?: string; type?: 'add' | 'remove' };
  if (!chatJid) {
    res.status(400).json({ error: 'Bad Request', message: 'Missing required field: jid' });
    return;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sock = session.sock! as any;
    const action = type === 'remove' ? 'remove' : 'add';
    if (action === 'remove' && typeof sock.removeChatLabel === 'function') {
      await sock.removeChatLabel(chatJid, req.params.labelId);
    } else if (typeof sock.addChatLabel === 'function') {
      await sock.addChatLabel(chatJid, req.params.labelId);
    } else {
      res.status(501).json({ error: 'Not Implemented', message: 'Label assignment not supported by this Baileys build' });
      return;
    }
    res.json({ success: true, labelId: req.params.labelId, jid: chatJid, action });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Internal Server Error', message: err instanceof Error ? err.message : String(err) });
  }
});

export default router;
