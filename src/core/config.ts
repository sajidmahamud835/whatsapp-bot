import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { AppConfig } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_DIR = join(__dirname, '..', '..', 'config');
const CONFIG_PATH = join(CONFIG_DIR, 'config.json');

// ─── Default Configuration ────────────────────────────────────────────────────

const DEFAULT_CONFIG: AppConfig = {
  server: {
    port: 3000,
    host: '127.0.0.1',
    apiKey: '',
  },
  dashboard: {
    enabled: false,
    port: 3001,
  },
  clients: {
    count: 6,
    autoInit: [],
    reconnectInterval: 5000,
    authDir: '.auth',
  },
  ai: {
    enabled: false,
    defaultProvider: '',
    providers: {},
    systemPrompt: '',
    maxTokens: 500,
    temperature: 0.7,
  },
  crons: [],
  integrations: {
    webhooks: [],
  },
  logging: {
    level: 'info',
    dir: './logs',
    console: true,
    file: true,
    maxFiles: 30,
    redactNumbers: false,
  },
  deployment: {
    mode: 'local',
    publicUrl: '',
    ssl: {
      enabled: false,
    },
  },
};

// ─── Deep merge helper ────────────────────────────────────────────────────────

function deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
  const result = { ...target };
  for (const key of Object.keys(source) as Array<keyof T>) {
    const sourceVal = source[key];
    const targetVal = target[key];
    if (
      sourceVal !== null &&
      typeof sourceVal === 'object' &&
      !Array.isArray(sourceVal) &&
      targetVal !== null &&
      typeof targetVal === 'object' &&
      !Array.isArray(targetVal)
    ) {
      result[key] = deepMerge(
        targetVal as Record<string, unknown>,
        sourceVal as Record<string, unknown>,
      ) as T[keyof T];
    } else if (sourceVal !== undefined) {
      result[key] = sourceVal as T[keyof T];
    }
  }
  return result;
}

// ─── Config Manager ───────────────────────────────────────────────────────────

class ConfigManager {
  private config: AppConfig;
  private loaded = false;

  constructor() {
    this.config = structuredClone(DEFAULT_CONFIG);
  }

  load(): void {
    if (!existsSync(CONFIG_DIR)) {
      mkdirSync(CONFIG_DIR, { recursive: true });
    }

    if (!existsSync(CONFIG_PATH)) {
      // Create default config file
      this.config = structuredClone(DEFAULT_CONFIG);
      this.save();
      this.loaded = true;
      return;
    }

    try {
      const raw = readFileSync(CONFIG_PATH, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<AppConfig>;
      this.config = deepMerge(DEFAULT_CONFIG as unknown as Record<string, unknown>, parsed as unknown as Record<string, unknown>) as unknown as AppConfig;
      this.loaded = true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[WA Convo Config] Failed to parse config.json: ${msg}. Using defaults.`);
      this.config = structuredClone(DEFAULT_CONFIG);
      this.loaded = true;
    }

    // Override with env vars
    this.applyEnvOverrides();
  }

  reload(): void {
    this.loaded = false;
    this.load();
  }

  save(): void {
    if (!existsSync(CONFIG_DIR)) {
      mkdirSync(CONFIG_DIR, { recursive: true });
    }
    writeFileSync(CONFIG_PATH, JSON.stringify(this.config, null, 2), 'utf-8');
  }

  getAll(): AppConfig {
    if (!this.loaded) this.load();
    return structuredClone(this.config);
  }

  /**
   * Get config value by dot-notation path (e.g. "server.port")
   */
  get<T = unknown>(path: string): T {
    if (!this.loaded) this.load();
    const parts = path.split('.');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let current: any = this.config;
    for (const part of parts) {
      if (current == null || typeof current !== 'object') return undefined as T;
      current = current[part];
    }
    return current as T;
  }

  /**
   * Set config value by dot-notation path (e.g. "server.port", 3001)
   * Automatically saves to disk.
   */
  set(path: string, value: unknown): void {
    if (!this.loaded) this.load();
    const parts = path.split('.');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let current: any = this.config;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]!;
      if (current[part] == null || typeof current[part] !== 'object') {
        current[part] = {};
      }
      current = current[part];
    }
    const lastKey = parts[parts.length - 1]!;
    current[lastKey] = value;
    this.save();
  }

  getConfigPath(): string {
    return CONFIG_PATH;
  }

  private applyEnvOverrides(): void {
    // Legacy env var support
    if (process.env['PORT']) {
      this.config.server.port = parseInt(process.env['PORT'], 10);
    }
    if (process.env['API_KEY']) {
      this.config.server.apiKey = process.env['API_KEY'];
    }
    if (process.env['CLIENT_COUNT']) {
      this.config.clients.count = parseInt(process.env['CLIENT_COUNT'], 10);
    }
    if (process.env['LOG_LEVEL']) {
      this.config.logging.level = process.env['LOG_LEVEL'];
    }
  }
}

// Singleton
export const config = new ConfigManager();

export { DEFAULT_CONFIG, CONFIG_PATH };
export type { AppConfig };
