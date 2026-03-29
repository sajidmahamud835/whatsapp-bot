import { Router } from 'express';
import type { Request, Response } from 'express';
import { sessions } from '../../core/client-manager.js';
import type { ClientStatus } from '../../core/types.js';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  const clients: ClientStatus[] = [];
  for (const [, session] of sessions) {
    clients.push({
      id: session.id,
      isInitialized: session.isInitialized,
      isReady: session.isReady,
      disconnected: session.disconnected,
      phone: session.phone ?? null,
      name: session.name ?? null,
    });
  }

  const readyCount = clients.filter((c) => c.isReady).length;
  res.json({
    status: 'ok',
    service: 'WA Convo',
    version: '4.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    clients: {
      total: clients.length,
      ready: readyCount,
      disconnected: clients.filter((c) => c.disconnected).length,
    },
  });
});

router.get('/clients', (_req: Request, res: Response) => {
  const result: ClientStatus[] = [];
  for (const [, session] of sessions) {
    result.push({
      id: session.id,
      isInitialized: session.isInitialized,
      isReady: session.isReady,
      disconnected: session.disconnected,
      phone: session.phone ?? null,
      name: session.name ?? null,
    });
  }
  res.json(result);
});

export default router;
