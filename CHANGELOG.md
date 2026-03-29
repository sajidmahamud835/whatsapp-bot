# Changelog

## [3.0.0] - 2026-03-29

### Changed
- **BREAKING:** Migrated from `whatsapp-web.js` (Puppeteer-based) to `@whiskeysockets/baileys` (WebSocket-based)
- RAM usage reduced from ~300–500 MB per client to ~10–50 MB per client
- No longer requires Chrome/Chromium — runs entirely on WebSockets
- Session auth moved from `.wwebjs_auth/` to `.auth/session-{id}/`
- `ClientSession.client` (whatsapp-web.js `Client`) replaced by `ClientSession.sock` (Baileys `WASocket`)
- `phone` and `name` fields now stored directly on `ClientSession` instead of accessed via `client.info`
- QR served as raw string; `/qr` endpoint renders via `api.qrserver.com` (no local base64 encoding needed)
- `sendButtons` gracefully degrades to formatted text (Meta has restricted native button messages)

### Added
- `@hapi/boom` — Baileys error typing
- `pino` — required logger interface for Baileys
- `qrcode-terminal` — QR printed directly in the server terminal on connect
- Auto-reconnect on unexpected disconnects (not on `loggedOut`)
- `logoutSession` helper exported from `clientManager.ts`
- `toJid` helper: auto-appends `@s.whatsapp.net` to bare numbers

### Removed
- `whatsapp-web.js` and all Puppeteer/Chromium dependencies
- `qrcode` (replaced by qrserver.com CDN in the QR HTML page)
- `buildPuppeteerConfig` function
- `MessageMedia`, `Buttons` imports (Baileys uses native buffers)

### Why
- `whatsapp-web.js` maintenance declining since late 2025
- Puppeteer dependency too heavy for low-RAM machines (300–500 MB per instance)
- Baileys is actively maintained, TypeScript-native, and significantly more resource-efficient

---

## [2.0.0] - 2026-03-29

### Changed
- Full TypeScript rewrite (strict mode, ESM)
- Dynamic multi-client architecture — configure via `CLIENT_COUNT` env variable
- Added API key authentication (Bearer token middleware)
- Added per-IP rate limiting
- Added bulk send endpoint (`POST /:id/sendBulk`)
- Added contacts endpoint (`GET /:id/contacts`)
- Added paginated chats & messages endpoints (`GET /:id/chats`, `GET /:id/chats/:chatId/messages`)
- Added health check endpoint (`GET /health`)
- Removed `puppeteer-chromium-resolver` (whatsapp-web.js bundles its own Chromium)
- JSON error responses with proper HTTP status codes throughout

---

## [1.0.1] - Legacy

- Original JavaScript implementation with `whatsapp-web.js`
- Hardcoded 6 client sessions
- Basic send/QR/status endpoints
