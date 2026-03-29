import { EventEmitter } from 'events';
import type {
  WaConvoEventName,
  MessageReceivedEvent,
  ClientQrEvent,
  ClientStatusEvent,
} from './types.js';

// ─── Typed event map ──────────────────────────────────────────────────────────

interface WaConvoEvents {
  'message.received': [event: MessageReceivedEvent];
  'message.sent': [event: { clientId: string; to: string; messageId: string }];
  'client.connected': [event: ClientStatusEvent];
  'client.disconnected': [event: ClientStatusEvent];
  'client.qr': [event: ClientQrEvent];
  'client.ready': [event: ClientStatusEvent];
  'client.error': [event: { clientId: string; error: string }];
  'group.joined': [event: { clientId: string; groupId: string; subject: string }];
  'group.left': [event: { clientId: string; groupId: string }];
  'server.started': [event: { port: number; host: string }];
  'server.stopped': [event: Record<string, never>];
}

// ─── WaConvo Event Bus ────────────────────────────────────────────────────────

class WaConvoEventBus extends EventEmitter {
  /**
   * Emit a typed WA Convo event.
   */
  emit<K extends WaConvoEventName>(
    event: K,
    ...args: WaConvoEvents[K]
  ): boolean {
    return super.emit(event, ...args);
  }

  /**
   * Listen to a typed WA Convo event.
   */
  on<K extends WaConvoEventName>(
    event: K,
    listener: (...args: WaConvoEvents[K]) => void,
  ): this {
    return super.on(event, listener as (...args: unknown[]) => void);
  }

  /**
   * Listen once to a typed WA Convo event.
   */
  once<K extends WaConvoEventName>(
    event: K,
    listener: (...args: WaConvoEvents[K]) => void,
  ): this {
    return super.once(event, listener as (...args: unknown[]) => void);
  }

  /**
   * Remove a listener for a typed WA Convo event.
   */
  off<K extends WaConvoEventName>(
    event: K,
    listener: (...args: WaConvoEvents[K]) => void,
  ): this {
    return super.off(event, listener as (...args: unknown[]) => void);
  }
}

// Singleton event bus
export const eventBus = new WaConvoEventBus();

// Allow many listeners (webhooks can add many)
eventBus.setMaxListeners(100);

export type { WaConvoEvents, WaConvoEventName };
