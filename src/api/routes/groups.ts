import { Router } from 'express';
import type { Request, Response } from 'express';
import { toJid } from '../../core/client-manager.js';
import { getSessionOrError, requireReady } from '../../utils/session.js';

const router = Router();

// ─── POST /:id/groups/create ──────────────────────────────────────────────────

router.post('/:id/groups/create', async (req: Request, res: Response) => {
  const session = getSessionOrError(req.params.id, res);
  if (!session || !requireReady(session, res)) return;

  const { name, participants } = req.body as { name?: string; participants?: string[] };
  if (!name || !Array.isArray(participants) || participants.length === 0) {
    res.status(400).json({ error: 'Bad Request', message: 'Missing required fields: name, participants (array)' });
    return;
  }

  try {
    const jids = participants.map(toJid);
    const result = await session.sock!.groupCreate(name, jids);
    res.json({ success: true, groupId: result.id, subject: result.subject });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Internal Server Error', message: err instanceof Error ? err.message : String(err) });
  }
});

// ─── POST /:id/groups/join ────────────────────────────────────────────────────

router.post('/:id/groups/join', async (req: Request, res: Response) => {
  const session = getSessionOrError(req.params.id, res);
  if (!session || !requireReady(session, res)) return;

  const { inviteCode } = req.body as { inviteCode?: string };
  if (!inviteCode) {
    res.status(400).json({ error: 'Bad Request', message: 'Missing required field: inviteCode' });
    return;
  }

  try {
    const code = inviteCode.split('/').pop()!.trim();
    const result = await session.sock!.groupAcceptInvite(code);
    res.json({ success: true, groupId: result });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Internal Server Error', message: err instanceof Error ? err.message : String(err) });
  }
});

// ─── GET /:id/groups ──────────────────────────────────────────────────────────

router.get('/:id/groups', async (req: Request, res: Response) => {
  const session = getSessionOrError(req.params.id, res);
  if (!session || !requireReady(session, res)) return;

  try {
    const groups = await session.sock!.groupFetchAllParticipating();
    const data = Object.values(groups).map((g) => ({
      id: g.id,
      subject: g.subject,
      participantCount: g.participants.length,
      owner: g.owner ?? null,
      creation: g.creation ?? null,
      desc: g.desc ?? null,
    }));
    res.json({ success: true, total: data.length, data });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Internal Server Error', message: err instanceof Error ? err.message : String(err) });
  }
});

// ─── GET /:id/groups/:groupId ─────────────────────────────────────────────────

router.get('/:id/groups/:groupId', async (req: Request, res: Response) => {
  const session = getSessionOrError(req.params.id, res);
  if (!session || !requireReady(session, res)) return;

  try {
    const jid = req.params.groupId!.includes('@') ? req.params.groupId! : `${req.params.groupId}@g.us`;
    const metadata = await session.sock!.groupMetadata(jid);
    res.json({ success: true, data: metadata });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Internal Server Error', message: err instanceof Error ? err.message : String(err) });
  }
});

// ─── GET /:id/groups/:groupId/invite ──────────────────────────────────────────

router.get('/:id/groups/:groupId/invite', async (req: Request, res: Response) => {
  const session = getSessionOrError(req.params.id, res);
  if (!session || !requireReady(session, res)) return;

  try {
    const jid = req.params.groupId!.includes('@') ? req.params.groupId! : `${req.params.groupId}@g.us`;
    const code = await session.sock!.groupInviteCode(jid);
    res.json({ success: true, inviteCode: code, inviteLink: `https://chat.whatsapp.com/${code}` });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Internal Server Error', message: err instanceof Error ? err.message : String(err) });
  }
});

// ─── POST /:id/groups/:groupId/revoke-invite ──────────────────────────────────

router.post('/:id/groups/:groupId/revoke-invite', async (req: Request, res: Response) => {
  const session = getSessionOrError(req.params.id, res);
  if (!session || !requireReady(session, res)) return;

  try {
    const jid = req.params.groupId!.includes('@') ? req.params.groupId! : `${req.params.groupId}@g.us`;
    const newCode = await session.sock!.groupRevokeInvite(jid);
    res.json({ success: true, newInviteCode: newCode, newInviteLink: `https://chat.whatsapp.com/${newCode}` });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Internal Server Error', message: err instanceof Error ? err.message : String(err) });
  }
});

// ─── POST /:id/groups/:groupId/add ───────────────────────────────────────────

router.post('/:id/groups/:groupId/add', async (req: Request, res: Response) => {
  const session = getSessionOrError(req.params.id, res);
  if (!session || !requireReady(session, res)) return;

  const { participants } = req.body as { participants?: string[] };
  if (!Array.isArray(participants) || participants.length === 0) {
    res.status(400).json({ error: 'Bad Request', message: 'Missing required field: participants (array)' });
    return;
  }

  try {
    const jid = req.params.groupId!.includes('@') ? req.params.groupId! : `${req.params.groupId}@g.us`;
    const jids = participants.map(toJid);
    const result = await session.sock!.groupParticipantsUpdate(jid, jids, 'add');
    res.json({ success: true, result });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Internal Server Error', message: err instanceof Error ? err.message : String(err) });
  }
});

// ─── POST /:id/groups/:groupId/remove ────────────────────────────────────────

router.post('/:id/groups/:groupId/remove', async (req: Request, res: Response) => {
  const session = getSessionOrError(req.params.id, res);
  if (!session || !requireReady(session, res)) return;

  const { participants } = req.body as { participants?: string[] };
  if (!Array.isArray(participants) || participants.length === 0) {
    res.status(400).json({ error: 'Bad Request', message: 'Missing required field: participants (array)' });
    return;
  }

  try {
    const jid = req.params.groupId!.includes('@') ? req.params.groupId! : `${req.params.groupId}@g.us`;
    const jids = participants.map(toJid);
    const result = await session.sock!.groupParticipantsUpdate(jid, jids, 'remove');
    res.json({ success: true, result });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Internal Server Error', message: err instanceof Error ? err.message : String(err) });
  }
});

// ─── POST /:id/groups/:groupId/promote ───────────────────────────────────────

router.post('/:id/groups/:groupId/promote', async (req: Request, res: Response) => {
  const session = getSessionOrError(req.params.id, res);
  if (!session || !requireReady(session, res)) return;

  const { participants } = req.body as { participants?: string[] };
  if (!Array.isArray(participants) || participants.length === 0) {
    res.status(400).json({ error: 'Bad Request', message: 'Missing required field: participants (array)' });
    return;
  }

  try {
    const jid = req.params.groupId!.includes('@') ? req.params.groupId! : `${req.params.groupId}@g.us`;
    const jids = participants.map(toJid);
    const result = await session.sock!.groupParticipantsUpdate(jid, jids, 'promote');
    res.json({ success: true, result });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Internal Server Error', message: err instanceof Error ? err.message : String(err) });
  }
});

// ─── POST /:id/groups/:groupId/demote ────────────────────────────────────────

router.post('/:id/groups/:groupId/demote', async (req: Request, res: Response) => {
  const session = getSessionOrError(req.params.id, res);
  if (!session || !requireReady(session, res)) return;

  const { participants } = req.body as { participants?: string[] };
  if (!Array.isArray(participants) || participants.length === 0) {
    res.status(400).json({ error: 'Bad Request', message: 'Missing required field: participants (array)' });
    return;
  }

  try {
    const jid = req.params.groupId!.includes('@') ? req.params.groupId! : `${req.params.groupId}@g.us`;
    const jids = participants.map(toJid);
    const result = await session.sock!.groupParticipantsUpdate(jid, jids, 'demote');
    res.json({ success: true, result });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Internal Server Error', message: err instanceof Error ? err.message : String(err) });
  }
});

// ─── PUT /:id/groups/:groupId — update name/desc/photo ───────────────────────

router.put('/:id/groups/:groupId', async (req: Request, res: Response) => {
  const session = getSessionOrError(req.params.id, res);
  if (!session || !requireReady(session, res)) return;

  const { name, description, photo } = req.body as {
    name?: string;
    description?: string;
    photo?: string;
  };

  if (!name && !description && !photo) {
    res.status(400).json({ error: 'Bad Request', message: 'Provide at least one of: name, description, photo' });
    return;
  }

  const jid = req.params.groupId!.includes('@') ? req.params.groupId! : `${req.params.groupId}@g.us`;
  const errors: string[] = [];

  try {
    if (name) {
      await session.sock!.groupUpdateSubject(jid, name);
    }
  } catch (err: unknown) {
    errors.push(`name: ${err instanceof Error ? err.message : String(err)}`);
  }

  try {
    if (description !== undefined) {
      await session.sock!.groupUpdateDescription(jid, description);
    }
  } catch (err: unknown) {
    errors.push(`description: ${err instanceof Error ? err.message : String(err)}`);
  }

  try {
    if (photo) {
      let buffer: Buffer;
      if (photo.startsWith('http://') || photo.startsWith('https://')) {
        const { default: axios } = await import('axios');
        const resp = await axios.get<ArrayBuffer>(photo, { responseType: 'arraybuffer', timeout: 30_000 });
        buffer = Buffer.from(resp.data);
      } else {
        const b64 = photo.includes(',') ? photo.split(',')[1]! : photo;
        buffer = Buffer.from(b64, 'base64');
      }
      await session.sock!.updateProfilePicture(jid, buffer);
    }
  } catch (err: unknown) {
    errors.push(`photo: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (errors.length === 0) {
    res.json({ success: true });
  } else {
    res.status(207).json({ success: false, errors });
  }
});

// ─── PUT /:id/groups/:groupId/settings ───────────────────────────────────────

router.put('/:id/groups/:groupId/settings', async (req: Request, res: Response) => {
  const session = getSessionOrError(req.params.id, res);
  if (!session || !requireReady(session, res)) return;

  const { announcement, restrict } = req.body as {
    announcement?: boolean;
    restrict?: boolean;
  };

  if (announcement == null && restrict == null) {
    res.status(400).json({ error: 'Bad Request', message: 'Provide at least one of: announcement, restrict' });
    return;
  }

  const jid = req.params.groupId!.includes('@') ? req.params.groupId! : `${req.params.groupId}@g.us`;

  try {
    if (announcement != null) {
      await session.sock!.groupSettingUpdate(jid, announcement ? 'announcement' : 'not_announcement');
    }
    if (restrict != null) {
      await session.sock!.groupSettingUpdate(jid, restrict ? 'locked' : 'unlocked');
    }
    res.json({ success: true });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Internal Server Error', message: err instanceof Error ? err.message : String(err) });
  }
});

export default router;
