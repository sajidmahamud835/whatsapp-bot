import type { WASocket } from '@whiskeysockets/baileys';

export interface ClientSession {
  id: string;
  sock: WASocket | null;
  isInitialized: boolean;
  isReady: boolean;
  qrData: string | null; // raw QR string (not data URL)
  disconnected: boolean;
  phone: string | null;
  name: string | null;
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

// ─── Config Types ─────────────────────────────────────────────────────────────

export interface ServerConfig {
  port: number;
  host: string;
  apiKey: string;
}

export interface DashboardConfig {
  enabled: boolean;
  port: number;
}

export interface ClientsConfig {
  count: number;
  autoInit: string[];
  reconnectInterval: number;
  authDir: string;
}

export interface AIProviderConfig {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
}

export interface AIConfig {
  enabled: boolean;
  defaultProvider: string;
  providers: Record<string, AIProviderConfig>;
  systemPrompt: string;
  maxTokens: number;
  temperature: number;
}

export interface CronJobConfig {
  id: string;
  name: string;
  schedule: string;
  clientId: string;
  action: string;
  params: Record<string, unknown>;
  enabled: boolean;
}

export interface WebhookConfig {
  url: string;
  events?: string[];
  secret?: string;
}

export interface IntegrationsConfig {
  webhooks: WebhookConfig[];
}

export interface LoggingConfig {
  level: string;
  dir: string;
  console: boolean;
  file: boolean;
  maxFiles: number;
  redactNumbers: boolean;
}

export interface SSLConfig {
  enabled: boolean;
  certPath?: string;
  keyPath?: string;
}

export interface DeploymentConfig {
  mode: 'local' | 'vps' | 'cloud';
  publicUrl: string;
  ssl: SSLConfig;
}

export interface AppConfig {
  server: ServerConfig;
  dashboard: DashboardConfig;
  clients: ClientsConfig;
  ai: AIConfig;
  crons: CronJobConfig[];
  integrations: IntegrationsConfig;
  logging: LoggingConfig;
  deployment: DeploymentConfig;
}

// ─── Event Types ──────────────────────────────────────────────────────────────

export type WaConvoEventName =
  | 'message.received'
  | 'message.sent'
  | 'client.connected'
  | 'client.disconnected'
  | 'client.qr'
  | 'client.ready'
  | 'client.error'
  | 'group.joined'
  | 'group.left'
  | 'server.started'
  | 'server.stopped';

export interface MessageReceivedEvent {
  clientId: string;
  from: string;
  body: string;
  timestamp: number;
  isGroup: boolean;
  hasMedia: boolean;
  type: string;
  raw: unknown;
}

export interface ClientQrEvent {
  clientId: string;
  qr: string;
}

export interface ClientStatusEvent {
  clientId: string;
  phone?: string | null;
  name?: string | null;
}
