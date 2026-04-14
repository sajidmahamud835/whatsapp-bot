import { createHmac, timingSafeEqual } from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { config } from '../../core/config.js';

/**
 * Verifies Meta webhook HMAC signature (X-Hub-Signature-256).
 * Skips verification if no app secret is configured.
 */
export function hmacVerify(req: Request, res: Response, next: NextFunction): void {
  const appSecret = config.get<string>('integrations.meta.appSecret') ?? process.env['META_APP_SECRET'] ?? '';

  if (!appSecret) {
    // No secret configured — skip verification
    next();
    return;
  }

  const signature = req.headers['x-hub-signature-256'] as string | undefined;
  if (!signature) {
    res.status(401).json({ error: 'Missing X-Hub-Signature-256 header' });
    return;
  }

  const body = JSON.stringify(req.body);
  const expected = 'sha256=' + createHmac('sha256', appSecret).update(body).digest('hex');

  try {
    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);

    if (sigBuffer.length !== expectedBuffer.length || !timingSafeEqual(sigBuffer, expectedBuffer)) {
      res.status(403).json({ error: 'Invalid signature' });
      return;
    }
  } catch {
    res.status(403).json({ error: 'Invalid signature' });
    return;
  }

  next();
}
