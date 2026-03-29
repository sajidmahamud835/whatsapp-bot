import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { config } from '../core/config.js';
import { getLogger } from '../core/logger.js';
import { eventBus } from '../core/events.js';
import { apiKeyAuth } from './middleware/auth.js';
import { rateLimiter } from './middleware/rate-limit.js';
import { setupWebSocket } from './websocket.js';
import { initializeSessions } from '../core/client-manager.js';

// ─── Routes ───────────────────────────────────────────────────────────────────
import healthRouter from './routes/health.js';
import clientRouter from './routes/client.js';
import messagesRouter from './routes/messages.js';
import groupsRouter from './routes/groups.js';
import contactsRouter from './routes/contacts.js';
import statusRouter from './routes/status.js';
import presenceRouter from './routes/presence.js';
import privacyRouter from './routes/privacy.js';
import configRouter from './routes/config.js';

// ─── Initialize config & logger first ────────────────────────────────────────
config.load();
const log = getLogger();

const app = express();
const httpServer = createServer(app);

const serverCfg = config.get<{ port: number; host: string }>('server');
const port = serverCfg?.port ?? parseInt(process.env['PORT'] ?? '3000', 10);
const host = serverCfg?.host ?? process.env['HOST'] ?? '0.0.0.0';

// ─── Global Middleware ────────────────────────────────────────────────────────

app.use(cors({ origin: process.env['CORS_ORIGIN'] ?? '*', credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(rateLimiter);

// ─── Public Routes ────────────────────────────────────────────────────────────

app.get('/', (_req, res) => {
  res.json({
    name: 'WA Convo',
    description: 'WhatsApp Automation Platform',
    version: '4.0.0',
    engine: 'Baileys (WebSocket)',
    docs: 'https://github.com/sajidmahamud835/whatsapp-bot',
    websocket: `ws://${host}:${port}/ws`,
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
app.use(configRouter);

// ─── 404 Handler ─────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ error: 'Not Found', message: 'Endpoint does not exist' });
});

// ─── Error Handler ────────────────────────────────────────────────────────────

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = err instanceof Error ? err.message : 'Internal Server Error';
  log.error({ err }, 'Express error');
  res.status(500).json({ error: 'Internal Server Error', message });
});

// ─── Bootstrap ────────────────────────────────────────────────────────────────

function start(): void {
  // Initialize WhatsApp client sessions
  initializeSessions();

  // Setup WebSocket
  setupWebSocket(httpServer);

  // Start HTTP server
  httpServer.listen(port, host, () => {
    log.info({ port, host }, '🚀 WA Convo v4.0.0 started');
    log.info('   Health:    http://%s:%d/health', host, port);
    log.info('   Clients:   http://%s:%d/clients', host, port);
    log.info('   WebSocket: ws://%s:%d/ws', host, port);
    log.info('   Config:    http://%s:%d/config', host, port);

    // Also log to console for visibility
    console.log(`\n🟢 WA Convo v4.0.0 — WhatsApp Automation Platform`);
    console.log(`   API:       http://${host}:${port}/`);
    console.log(`   Health:    http://${host}:${port}/health`);
    console.log(`   Clients:   http://${host}:${port}/clients`);
    console.log(`   WebSocket: ws://${host}:${port}/ws`);
    console.log(`   Config:    http://${host}:${port}/config\n`);

    eventBus.emit('server.started', { port, host });
  });
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  log.info('SIGTERM received — shutting down');
  eventBus.emit('server.stopped', {});
  httpServer.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  log.info('SIGINT received — shutting down');
  eventBus.emit('server.stopped', {});
  httpServer.close(() => process.exit(0));
});

start();

export default app;
