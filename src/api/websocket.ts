import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import { eventBus } from '../core/events.js';
import { childLogger } from '../core/logger.js';
import type { WaConvoEventName } from '../core/types.js';

const log = childLogger('websocket');

interface WsClient {
  ws: WebSocket;
  subscriptions: Set<WaConvoEventName | '*'>;
  id: string;
}

const clients = new Map<string, WsClient>();
let clientCounter = 0;

// ─── Message types ────────────────────────────────────────────────────────────

interface WsIncomingMessage {
  type: 'subscribe' | 'unsubscribe' | 'ping';
  events?: Array<WaConvoEventName | '*'>;
}

interface WsOutgoingMessage {
  type: 'event' | 'pong' | 'welcome' | 'error';
  event?: WaConvoEventName;
  data?: unknown;
  message?: string;
  clientId?: string;
}

function send(ws: WebSocket, msg: WsOutgoingMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

function broadcast(event: WaConvoEventName, data: unknown): void {
  for (const client of clients.values()) {
    if (client.subscriptions.has('*') || client.subscriptions.has(event)) {
      send(client.ws, { type: 'event', event, data });
    }
  }
}

// ─── All WA Convo events ──────────────────────────────────────────────────────

const ALL_EVENTS: WaConvoEventName[] = [
  'message.received',
  'message.sent',
  'client.connected',
  'client.disconnected',
  'client.qr',
  'client.ready',
  'client.error',
  'group.joined',
  'group.left',
  'server.started',
  'server.stopped',
];

// Bridge event bus → WebSocket
for (const event of ALL_EVENTS) {
  eventBus.on(event, (data: unknown) => {
    broadcast(event, data);
  });
}

// ─── WebSocket Server setup ───────────────────────────────────────────────────

export function setupWebSocket(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket, req) => {
    const id = String(++clientCounter);
    const client: WsClient = {
      ws,
      subscriptions: new Set(['*']), // Subscribe to all by default
      id,
    };
    clients.set(id, client);

    const ip = req.socket.remoteAddress ?? 'unknown';
    log.info({ clientId: id, ip }, 'WebSocket client connected');

    // Send welcome
    send(ws, {
      type: 'welcome',
      clientId: id,
      message: 'Connected to WA Convo WebSocket. Subscribed to all events by default.',
      data: { events: ALL_EVENTS },
    });

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as WsIncomingMessage;

        if (msg.type === 'ping') {
          send(ws, { type: 'pong' });
          return;
        }

        if (msg.type === 'subscribe' && Array.isArray(msg.events)) {
          // Remove wildcard if subscribing to specific events
          client.subscriptions.delete('*');
          for (const ev of msg.events) {
            client.subscriptions.add(ev);
          }
          send(ws, {
            type: 'event',
            event: 'server.started', // reuse for ack
            data: { subscribed: [...client.subscriptions] },
          });
          return;
        }

        if (msg.type === 'unsubscribe' && Array.isArray(msg.events)) {
          for (const ev of msg.events) {
            client.subscriptions.delete(ev);
          }
          return;
        }
      } catch {
        send(ws, { type: 'error', message: 'Invalid JSON message' });
      }
    });

    ws.on('close', () => {
      clients.delete(id);
      log.info({ clientId: id }, 'WebSocket client disconnected');
    });

    ws.on('error', (err) => {
      log.error({ clientId: id, error: err.message }, 'WebSocket error');
      clients.delete(id);
    });
  });

  log.info('WebSocket server ready at /ws');
  return wss;
}

export { broadcast };
