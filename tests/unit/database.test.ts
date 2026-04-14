import Database from 'better-sqlite3';
import { messageStore } from '../../src/core/db/message-store.js';
import { aiHistoryStore } from '../../src/core/db/ai-history-store.js';
import { cronLogStore } from '../../src/core/db/cron-log-store.js';
import { webhookLogStore } from '../../src/core/db/webhook-log-store.js';

// We test the store modules by mocking getDatabase to return an in-memory DB
// Since the stores call getDatabase() on each operation, we mock the module

let testDb: Database.Database;

jest.mock('../../src/core/db/database.js', () => ({
  getDatabase: () => testDb,
  closeDatabase: () => testDb?.close(),
}));

jest.mock('../../src/core/config.js', () => ({
  config: {
    get: () => undefined,
    load: () => {},
  },
}));

jest.mock('../../src/core/logger.js', () => ({
  childLogger: () => ({
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
  }),
  getLogger: () => ({
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
  }),
}));

beforeAll(() => {
  testDb = new Database(':memory:');
  testDb.pragma('journal_mode = WAL');

  // Create tables manually (same as migration 001)
  testDb.exec(`
    CREATE TABLE messages (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      jid TEXT NOT NULL,
      body TEXT,
      type TEXT NOT NULL DEFAULT 'unknown',
      timestamp INTEGER NOT NULL,
      from_me INTEGER NOT NULL DEFAULT 0,
      has_media INTEGER NOT NULL DEFAULT 0,
      media_url TEXT,
      raw TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  testDb.exec(`
    CREATE TABLE ai_conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      jid TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )
  `);
  testDb.exec(`
    CREATE TABLE webhook_deliveries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      webhook_id TEXT NOT NULL,
      event TEXT NOT NULL,
      status_code INTEGER,
      response_time_ms INTEGER,
      error TEXT,
      payload TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )
  `);
  testDb.exec(`
    CREATE TABLE cron_executions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id TEXT NOT NULL,
      action TEXT NOT NULL,
      success INTEGER NOT NULL DEFAULT 1,
      error TEXT,
      executed_at INTEGER NOT NULL DEFAULT (unixepoch())
    )
  `);
});

afterAll(() => {
  testDb.close();
});

describe('messageStore', () => {
  test('insert and retrieve a message', () => {
    messageStore.insert({
      id: 'msg-1',
      client_id: '1',
      jid: '5551234@s.whatsapp.net',
      body: 'Hello world',
      type: 'conversation',
      timestamp: Math.floor(Date.now() / 1000),
      from_me: false,
      has_media: false,
    });

    const messages = messageStore.getByJid('1', '5551234@s.whatsapp.net');
    expect(messages).toHaveLength(1);
    expect(messages[0]!.body).toBe('Hello world');
    expect(messages[0]!.from_me).toBe(false);
  });

  test('totalCount returns correct count', () => {
    expect(messageStore.totalCount()).toBeGreaterThanOrEqual(1);
  });

  test('duplicate insert is ignored (OR IGNORE)', () => {
    messageStore.insert({
      id: 'msg-1',
      client_id: '1',
      jid: '5551234@s.whatsapp.net',
      body: 'Duplicate',
      type: 'conversation',
      timestamp: Math.floor(Date.now() / 1000),
      from_me: false,
      has_media: false,
    });

    const messages = messageStore.getByJid('1', '5551234@s.whatsapp.net');
    expect(messages).toHaveLength(1);
    expect(messages[0]!.body).toBe('Hello world'); // Original, not duplicate
  });

  test('getRecent returns messages', () => {
    const recent = messageStore.getRecent('1', 10);
    expect(recent.length).toBeGreaterThanOrEqual(1);
  });
});

describe('aiHistoryStore', () => {
  const testJid = 'ai-test@s.whatsapp.net';

  beforeEach(() => {
    aiHistoryStore.clearHistory(testJid);
  });

  test('append and retrieve history in order', () => {
    aiHistoryStore.appendMessage(testJid, 'user', 'Hello');
    aiHistoryStore.appendMessage(testJid, 'assistant', 'Hi there!');

    const history = aiHistoryStore.getHistory(testJid, 10);
    expect(history).toHaveLength(2);
    // Ordered by autoincrement ID (chronological via reverse of DESC)
    expect(history[0]!.content).toBe('Hello');
    expect(history[1]!.content).toBe('Hi there!');
  });

  test('clearHistory removes all entries for JID', () => {
    aiHistoryStore.clearHistory(testJid);
    const history = aiHistoryStore.getHistory(testJid, 10);
    expect(history).toHaveLength(0);
  });

  test('conversationCount returns distinct JIDs', () => {
    aiHistoryStore.appendMessage('jid1@s.whatsapp.net', 'user', 'test');
    aiHistoryStore.appendMessage('jid2@s.whatsapp.net', 'user', 'test');
    expect(aiHistoryStore.conversationCount()).toBeGreaterThanOrEqual(2);
  });
});

describe('cronLogStore', () => {
  test('log and retrieve execution', () => {
    cronLogStore.log({
      job_id: 'job-1',
      action: 'sendMessage',
      success: true,
      error: null,
    });

    const logs = cronLogStore.getByJobId('job-1', 10);
    expect(logs).toHaveLength(1);
    expect(logs[0]!.success).toBe(true);
  });

  test('countTodayExecutions works', () => {
    expect(cronLogStore.countTodayExecutions()).toBeGreaterThanOrEqual(1);
  });
});

describe('webhookLogStore', () => {
  test('log and retrieve delivery', () => {
    webhookLogStore.log({
      webhook_id: 'wh-1',
      event: 'message.received',
      status_code: 200,
      response_time_ms: 150,
      error: null,
    });

    const deliveries = webhookLogStore.getByWebhookId('wh-1', 10);
    expect(deliveries).toHaveLength(1);
    expect((deliveries[0] as any).status_code).toBe(200);
  });

  test('countSince works', () => {
    const count = webhookLogStore.countSince(0);
    expect(count).toBeGreaterThanOrEqual(1);
  });
});
