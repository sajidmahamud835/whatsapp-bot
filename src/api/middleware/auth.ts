import type { Request, Response, NextFunction } from 'express';
import { config } from '../../core/config.js';

export function apiKeyAuth(req: Request, res: Response, next: NextFunction): void {
  // Check config first, then env var (legacy)
  const apiKey = config.get<string>('server.apiKey') || process.env['API_KEY'];

  // If no API_KEY is configured, skip auth (backward-compat dev mode)
  if (!apiKey) {
    next();
    return;
  }

  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized', message: 'Missing Bearer token' });
    return;
  }

  const token = authHeader.slice(7);
  if (token !== apiKey) {
    res.status(403).json({ error: 'Forbidden', message: 'Invalid API key' });
    return;
  }

  next();
}
