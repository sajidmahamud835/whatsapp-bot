type EventHandler = (data: unknown) => void;

class WebSocketManager {
  private ws: WebSocket | null = null;
  private url: string;
  private listeners = new Map<string, Set<EventHandler>>();
  private reconnectAttempts = 0;
  private maxReconnectDelay = 30000;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  onStatusChange: ((connected: boolean) => void) | null = null;

  constructor(url: string) {
    this.url = url;
  }

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.onStatusChange?.(true);
        // Subscribe to all events
        this.ws?.send(JSON.stringify({ type: 'subscribe', events: ['*'] }));
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'event' && msg.event) {
            const handlers = this.listeners.get(msg.event);
            handlers?.forEach((h) => h(msg.data));
            // Also notify wildcard listeners
            const wildcardHandlers = this.listeners.get('*');
            wildcardHandlers?.forEach((h) => h({ event: msg.event, data: msg.data }));
          }
        } catch {}
      };

      this.ws.onclose = () => {
        this.onStatusChange?.(false);
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.ws?.close();
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), this.maxReconnectDelay);
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
  }

  on(event: string, handler: EventHandler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
    return () => this.listeners.get(event)?.delete(handler);
  }
}

// Singleton — connects to the API's WebSocket
const wsUrl = (import.meta.env.VITE_WS_URL || 'ws://localhost:8585') + '/ws';
export const wsManager = new WebSocketManager(wsUrl);
