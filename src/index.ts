import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { apiKeyAuth } from './middleware/auth.js';
import { rateLimiter } from './middleware/rateLimit.js';
import healthRouter from './routes/health.js';
import clientRouter from './routes/client.js';
import messagesRouter from './routes/messages.js';
import groupsRouter from './routes/groups.js';
import contactsRouter from './routes/contacts.js';
import statusRouter from './routes/status.js';
import presenceRouter from './routes/presence.js';
import privacyRouter from './routes/privacy.js';
import { initializeSessions } from './clientManager.js';

const app = express();
const port = parseInt(process.env.PORT ?? '3000', 10);

// ─── Global Middleware ────────────────────────────────────────────────────────

app.use(cors({ origin: process.env.CORS_ORIGIN ?? '*', credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(rateLimiter);

// ─── Public Routes ────────────────────────────────────────────────────────────

app.get('/', (_req, res) => {
  res.json({
    name: 'WhatsApp Bot API',
    version: '3.1.0',
    engine: 'Baileys (WebSocket)',
    docs: 'https://github.com/sajidmahamud835/whatsapp-bot',
  });
});

// ─── Protected Routes ─────────────────────────────────────────────────────────

app.use(apiKeyAuth);
app.use(healthRouter);
app.use(clientRouter);
app.use(messagesRouter);
app.use(groupsRouter);
app.use(contactsRouter);
app.use(statusRouter);
app.use(presenceRouter);
app.use(privacyRouter);

// ─── 404 Handler ─────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ error: 'Not Found', message: 'Endpoint does not exist' });
});

// ─── Error Handler ────────────────────────────────────────────────────────────

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = err instanceof Error ? err.message : 'Internal Server Error';
  console.error('[Express Error]', err);
  res.status(500).json({ error: 'Internal Server Error', message });
});

// ─── Bootstrap ────────────────────────────────────────────────────────────────

function start(): void {
  initializeSessions();

  app.listen(port, () => {
    console.log(`🚀 WhatsApp Bot API v3.1.0 (Baileys) running on port ${port}`);
    console.log(`   Health:   http://localhost:${port}/health`);
    console.log(`   Clients:  http://localhost:${port}/clients`);
    console.log(`   Messages: http://localhost:${port}/:id/messages/*`);
    console.log(`   Groups:   http://localhost:${port}/:id/groups/*`);
    console.log(`   Contacts: http://localhost:${port}/:id/contacts/*`);
    console.log(`   Status:   http://localhost:${port}/:id/status/*`);
    console.log(`   Presence: http://localhost:${port}/:id/presence/*`);
    console.log(`   Privacy:  http://localhost:${port}/:id/chats/*`);
  });
}

start();

export default app;
