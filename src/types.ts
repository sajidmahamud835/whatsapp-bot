import type { Client } from 'whatsapp-web.js';

export interface ClientSession {
  id: string;
  client: Client;
  isInitialized: boolean;
  isReady: boolean;
  qrData: string | null;
  disconnected: boolean;
}

export interface SendMessageBody {
  number: string;
  message: string;
}

export interface SendMediaBody {
  number: string;
  mediaUrl: string;
  caption?: string;
}

export interface SendBulkBody {
  numbers: string[];
  message: string;
}

export interface SendButtonsBody {
  number: string;
  body: string;
  buttons: Array<{ id: string; body: string }>;
  title?: string;
  footer?: string;
}

export interface BulkResult {
  number: string;
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface WebhookPayload {
  instanceId: string;
  id: unknown;
  body: string;
  from: string;
  to: string;
  type: string;
  timestamp: number;
  hasMedia: boolean;
  isGroup: boolean;
}

export interface ClientStatus {
  id: string;
  isInitialized: boolean;
  isReady: boolean;
  disconnected: boolean;
  phone?: string | null;
  name?: string | null;
}
