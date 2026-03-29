import pino from 'pino';
import { existsSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';
import { config } from './config.js';

// ─── Phone number redaction pattern ──────────────────────────────────────────

const PHONE_PATTERN = /\b\d{7,15}\b/g;

function redactNumbers(value: unknown): unknown {
  if (typeof value === 'string') {
    return value.replace(PHONE_PATTERN, '***');
  }
  return value;
}

// ─── Logger Factory ───────────────────────────────────────────────────────────

let _logger: pino.Logger | null = null;

export function createLogger(name?: string): pino.Logger {
  if (_logger && !name) return _logger;

  const cfg = config.get<{
    level: string;
    dir: string;
    console: boolean;
    file: boolean;
    redactNumbers: boolean;
  }>('logging');

  const level = cfg?.level ?? 'info';
  const logDir = resolve(cfg?.dir ?? './logs');
  const toFile = cfg?.file ?? true;
  const toConsole = cfg?.console ?? true;
  const shouldRedact = cfg?.redactNumbers ?? false;

  // Ensure log directory exists
  if (toFile && !existsSync(logDir)) {
    mkdirSync(logDir, { recursive: true });
  }

  const targets: pino.TransportTargetOptions[] = [];

  if (toConsole) {
    targets.push({
      target: 'pino/file',
      level,
      options: { destination: 1 }, // stdout
    });
  }

  if (toFile) {
    const logFile = join(logDir, 'wa-convo.log');
    targets.push({
      target: 'pino/file',
      level,
      options: {
        destination: logFile,
        mkdir: true,
      },
    });
  }

  const pinoOptions: pino.LoggerOptions = {
    level,
    name: name ?? 'wa-convo',
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level(label) {
        return { level: label };
      },
    },
  };

  // Apply redaction serializers if enabled
  if (shouldRedact) {
    pinoOptions.serializers = {
      msg(value: unknown) {
        return redactNumbers(value);
      },
    };
  }

  let logger: pino.Logger;

  if (targets.length === 0) {
    // No output — silent logger
    logger = pino({ level: 'silent' });
  } else if (targets.length === 1) {
    const transport = pino.transport({ targets: [targets[0]!] });
    logger = pino(pinoOptions, transport);
  } else {
    const transport = pino.transport({ targets });
    logger = pino(pinoOptions, transport);
  }

  if (!name) {
    _logger = logger;
  }

  return logger;
}

/**
 * Get the singleton app logger, initializing if needed.
 */
export function getLogger(): pino.Logger {
  if (!_logger) {
    _logger = createLogger();
  }
  return _logger;
}

/**
 * Create a child logger with a component label.
 */
export function childLogger(component: string): pino.Logger {
  return getLogger().child({ component });
}

/**
 * Silent Baileys logger — Baileys is very noisy by default
 */
export const baileysLogger = pino({ level: 'silent' });

export type { Logger } from 'pino';
