import { Router } from 'express';
import type { Request, Response } from 'express';
import { sessions } from '../clientManager.js';
import type { ClientStatus } from '../types.js';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  const clients: ClientStatus[] = [];
  for (const [id, session] of sessions) {
    clients.push({
      id,
      isInitialized: session.isInitialized,
      isReady: session.isReady,
      disconnected: session.disconnected,
      phone: session.isReady && session.client.info ? session.client.info.wid?.user ?? null : null,
      name: session.isReady && session.client.info ? session.client.info.pushname ?? null : null,
    });
  }

  const readyCount = clients.filter((c) => c.isReady).length;
  res.json({
    status: 'ok',
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
  for (const [id, session] of sessions) {
    result.push({
      id,
      isInitialized: session.isInitialized,
      isReady: session.isReady,
      disconnected: session.disconnected,
      phone: session.isReady && session.client.info ? session.client.info.wid?.user ?? null : null,
      name: session.isReady && session.client.info ? session.client.info.pushname ?? null : null,
    });
  }
  res.json(result);
});

export default router;
