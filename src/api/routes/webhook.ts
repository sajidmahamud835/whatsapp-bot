import { Router } from 'express';
import type { Request, Response } from 'express';
import { childLogger } from '../../core/logger.js';
import { sessions } from '../../core/client-manager.js';
import { OfficialEngine } from '../../core/engines/official.js';
import { hmacVerify } from '../middleware/hmac-verify.js';

const router = Router();
const log = childLogger('webhook-route');

// ─── GET /webhook/whatsapp — Meta verification ────────────────────────────────

router.get('/webhook/whatsapp', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'] as string;
  const token = req.query['hub.verify_token'] as string;
  const challenge = req.query['hub.challenge'] as string;

  if (mode !== 'subscribe') {
    res.status(400).json({ error: 'Bad Request', message: 'hub.mode must be "subscribe"' });
    return;
  }

  // Find any official engine that has a matching verify token
  let verified = false;
  for (const [, session] of sessions) {
    const engine = (session as any).engine;
    if (engine instanceof OfficialEngine) {
      if (!engine.verifyToken || engine.verifyToken === token) {
        verified = true;
        break;
      }
    }
  }

  // Also check env var as fallback
  if (!verified && process.env['WHATSAPP_VERIFY_TOKEN']) {
    verified = process.env['WHATSAPP_VERIFY_TOKEN'] === token;
  }

  if (verified) {
    log.info('Meta webhook verification successful');
    res.status(200).send(challenge);
  } else {
    log.warn('Meta webhook verification failed — token mismatch');
    res.status(403).json({ error: 'Forbidden', message: 'Verify token mismatch' });
  }
});

// ─── POST /webhook/whatsapp — Incoming Meta events ───────────────────────────

router.post('/webhook/whatsapp', hmacVerify, (req: Request, res: Response) => {
  // Respond 200 immediately (Meta requires fast ACK)
  res.status(200).json({ status: 'ok' });

  const payload = req.body;

  if (payload?.object !== 'whatsapp_business_account') {
    return;
  }

  // Route to matching official engine by phone number ID
  const entries: any[] = payload?.entry ?? [];
  for (const entry of entries) {
    for (const change of (entry?.changes ?? [])) {
      const phoneNumberId = change?.value?.metadata?.phone_number_id as string | undefined;

      if (!phoneNumberId) {
        // Broadcast to all official engines
        for (const [, session] of sessions) {
          const engine = (session as any).engine;
          if (engine instanceof OfficialEngine) {
            engine.handleWebhook(payload);
          }
        }
        break;
      }

      // Find matching engine
      let handled = false;
      for (const [, session] of sessions) {
        const engine = (session as any).engine;
        if (engine instanceof OfficialEngine && engine.phoneNumberId === phoneNumberId) {
          engine.handleWebhook(payload);
          handled = true;
          break;
        }
      }

      if (!handled) {
        log.warn({ phoneNumberId }, 'No official engine found for incoming webhook');
      }
    }
  }
});

export default router;
