// ─── WhatsApp Engine Interface ────────────────────────────────────────────────

export interface WhatsAppEngine {
  id: string;
  type: 'baileys' | 'official';
  status: 'disconnected' | 'connecting' | 'connected' | 'qr';
  phone?: string;
  name?: string;

  initialize(): Promise<void>;
  sendText(jid: string, text: string): Promise<any>;
  sendMedia(jid: string, type: string, url: string, caption?: string): Promise<any>;
  sendLocation(jid: string, lat: number, lng: number, name?: string): Promise<any>;
  sendReaction(jid: string, key: any, emoji: string): Promise<any>;
  logout(): Promise<void>;
  destroy(): Promise<void>;
}

export interface OfficialEngineConfig {
  phoneNumberId: string;
  accessToken: string;
  verifyToken?: string;
  apiVersion?: string;
}

export interface EngineSessionConfig {
  id: string;
  engine: 'baileys' | 'official';
  official?: OfficialEngineConfig;
}
