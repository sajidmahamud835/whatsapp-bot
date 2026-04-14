import express from 'express';
import request from 'supertest';

// We test auth middleware in isolation — no need for the full server

jest.mock('../../src/core/config.js', () => {
  const apiKey = 'test-secret-key';
  return {
    config: {
      get: (path: string) => {
        if (path === 'server.apiKey') return apiKey;
        return undefined;
      },
      load: () => {},
    },
  };
});

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

let apiKeyAuth: any;

beforeAll(async () => {
  const mod = await import('../../src/api/middleware/auth.js');
  apiKeyAuth = mod.apiKeyAuth;
});

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(apiKeyAuth);
  app.get('/test', (_req, res) => res.json({ ok: true }));
  return app;
}

describe('API Key Auth Middleware', () => {
  test('returns 401 when no Authorization header is provided', async () => {
    const app = createApp();
    const res = await request(app).get('/test');
    expect(res.status).toBe(401);
  });

  test('returns 403 when invalid token is provided', async () => {
    const app = createApp();
    const res = await request(app)
      .get('/test')
      .set('Authorization', 'Bearer wrong-key');
    expect(res.status).toBe(403);
  });

  test('passes through with valid Bearer token', async () => {
    const app = createApp();
    const res = await request(app)
      .get('/test')
      .set('Authorization', 'Bearer test-secret-key');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
