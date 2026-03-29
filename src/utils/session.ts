import type { Response } from 'express';
import { sessions } from '../clientManager.js';

export type Session = NonNullable<ReturnType<typeof sessions.get>>;

export function getSessionOrError(id: string, res: Response): Session | null {
  const session = sessions.get(id);
  if (!session) {
    res.status(404).json({ error: 'Not Found', message: `Client ${id} does not exist` });
    return null;
  }
  return session;
}

export function requireReady(session: Session | null | undefined, res: Response): session is Session {
  if (!session) return false;
  if (!session.isReady || !session.sock) {
    res.status(503).json({
      error: 'Service Unavailable',
      message: `Client ${session.id} is not ready. Initialize and scan QR first.`,
    });
    return false;
  }
  return true;
}
