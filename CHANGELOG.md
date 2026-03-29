# Changelog

## [4.1.0] - 2026-03-29

### Added — Phase 2: Dual Engine, AI Integration, Cron System

#### 2A: Dual Engine (`src/core/engines/`)
- **`engines/types.ts`** — `WhatsAppEngine` interface, `OfficialEngineConfig`, `EngineSessionConfig`
- **`engines/baileys.ts`** — `BaileysEngine` class extracted from `client-manager.ts`, implements `WhatsAppEngine`
- **`engines/official.ts`** — `OfficialEngine` for WhatsApp Cloud API (Meta): sendText, sendMedia, sendLocation, sendReaction, sendTemplate, markRead, handleWebhook
- **`api/routes/webhook.ts`** — `GET /webhook/whatsapp` (Meta hub verification), `POST /webhook/whatsapp` (parse Meta payload → emit events)
- **`client-manager.ts`** — Updated with `createEngine()` factory, `engines` Map, auto-selects Baileys or Official per session config

#### 2B: AI Integration (`src/core/ai/`)
- **`ai/types.ts`** — `AIProvider`, `AIMessage`, `AIProviderOptions` interfaces
- **`ai/providers/openai.ts`** — OpenAI-compatible provider (works with OpenAI, OpenRouter, Ollama, Together)
- **`ai/providers/anthropic.ts`** — Anthropic Messages API provider
- **`ai/providers/google.ts`** — Google Gemini generateContent API provider
- **`ai/manager.ts`** — `AIManager` singleton: loads providers from config, fallback chain, per-JID conversation history (last 10 messages), `chat()`, `clearHistory()`, `reload()`
- **`client-manager.ts`** — Wires `message.received` event → AI auto-reply when `ai.enabled = true`
- **`api/routes/ai.ts`** — `GET /ai/providers`, `POST /ai/test`, `PUT /ai/prompt`, `PUT /ai/config`, `DELETE /ai/history/:jid`
- **`cli/commands/ai.ts`** — `wa-convo ai providers`, `wa-convo ai test`, `wa-convo ai prompt`, `wa-convo ai enable/disable`

#### 2C: Cron System (`src/core/cron/`)
- **`cron/manager.ts`** — `CronManager` singleton: dynamic `node-cron` import, `addJob()`, `updateJob()`, `deleteJob()`, `runJobNow()`, `listJobs()`, `stopAll()`. Actions: `sendMessage`, `broadcast`, `postStatus`
- **`api/routes/cron.ts`** — `GET /cron`, `POST /cron`, `PUT /cron/:id`, `DELETE /cron/:id`, `POST /cron/:id/run`
- **`cli/commands/cron.ts`** — `wa-convo cron list`, `wa-convo cron add`, `wa-convo cron run`, `wa-convo cron delete`

#### Config / Meta
- `config/config.json` — Added `sessions[]` array, `ai.providers` example entries for all providers
- `package.json` — Added `node-cron@^3.0.3`, `@types/node-cron@^3.0.11`, bumped version to `4.1.0`
- `cli/utils.ts` — Added `apiRequest()` generic helper
- `api/server.ts` — Registers webhook (public), ai, cron routes; initializes cron manager; updated startup log to v4.1.0

---

## [4.0.0] - 2026-03-29

### ⚠️ Breaking Changes
- Entry point moved from `src/index.ts` to `src/api/server.ts`
- Old `src/index.ts` now re-exports from `src/api/server.ts` for backward compatibility
- `src/clientManager.ts` replaced by `src/core/client-manager.ts`
- `src/types.ts` replaced by `src/core/types.ts` (extended with config types)
- `src/middleware/` moved to `src/api/middleware/`
- `src/routes/` moved to `src/api/routes/`
- `src/utils/session.ts` updated to import from new core path

### Added — WA Convo Platform

#### Core Engine (`src/core/`)
- **`config.ts`** — Config manager with `config/config.json`, dot-notation get/set, deep merge with defaults, env var overrides
- **`logger.ts`** — Pino-based structured logger with file output, log rotation, console + file targets, redact phone numbers option
- **`events.ts`** — Typed EventEmitter bus with events: `message.received`, `message.sent`, `client.connected`, `client.disconnected`, `client.qr`, `client.ready`, `client.error`, `group.joined`, `group.left`, `server.started`, `server.stopped`
- **`client-manager.ts`** — Refactored from `clientManager.ts` — integrates with new config, logger, and event bus
- **`types.ts`** — Extended with `AppConfig`, config sub-types, event types

#### API (`src/api/`)
- **`server.ts`** — New Express server entry, imports from `core/`, creates HTTP server for WebSocket attachment
- **`websocket.ts`** — WebSocket server at `/ws` — real-time event broadcasting, subscribe/unsubscribe to event types
- **`routes/config.ts`** — Config CRUD API: `GET /config`, `GET /config/:path`, `PUT /config/:path`, `POST /config/reload`
- Health route updated: response includes `service: "WA Convo"` and `version: "4.0.0"`
- QR page updated with WA Convo branding

#### CLI (`src/cli/`)
- **`wa-convo` CLI tool** using `commander`
- Commands: `start`, `stop`, `status`, `client list|init|qr|logout`, `send`, `config get|set|edit`, `contacts list|check`, `groups list|create`, `logs`
- Log streaming with `--follow`, level filter (`--level error`), time filter (`--since 1h`)
- Table-formatted output with ASCII box borders
- Color output using ANSI codes

#### Utils (`src/utils/`)
- **`jid.ts`** — JID formatting helpers: `toJid`, `toGroupJid`, `jidToNumber`, `isGroupJid`, `isBroadcastJid`

#### Config (`config/config.json`)
- Default config file created with all settings documented

#### Updated Files
- **`package.json`** — name: `wa-convo`, version: `4.0.0`, added `commander`, `chalk`, `ws`, `@types/ws` deps, `bin` field, updated scripts
- **`.env.example`** — Updated with all new env vars including AI, dashboard, deployment sections
- **`README.md`** — Rebranded as WA Convo, added CLI reference, config docs, WebSocket docs, project structure

### Changed
- All 61 existing API endpoints preserved and working
- Startup log now shows WA Convo branding
- Baileys browser field updated to `['WA Convo', 'Chrome', '4.0.0']`
- Server now uses `http.createServer()` for WebSocket support

### Internal
- Added `ws` as dependency (WebSocket server)
- Config reads from `config/config.json` with env var overrides for backward compatibility
- Event bus integrated into client-manager for QR, connect, disconnect events

---

## [3.1.0] - 2026-03-29

### Added — Complete Baileys Feature Set

#### Messages (`POST /:id/messages/*`)
- `react` — send reaction emoji to a message (`key` + `emoji`)
- `poll` — create a poll (`title`, `options[]`, `singleSelect?`)
- `viewonce` — send view-once image/video (`media` URL/base64, `mediaType`, `caption?`)
- `edit` — edit a sent message (`key` + `newText`)
- `delete` — delete message for everyone (`key`)
- `reply` — reply/quote a specific message (`key` + `text`)
- `forward` — forward a message to another chat (`key` + `to`)
- `location` — send location pin (`latitude`, `longitude`, `name?`)
- `contact` — send vCard (`name`, `number`, `contactNumber`)
- `sticker` — send sticker from URL or base64
- `voice` — send voice note with `ptt: true` (URL or base64)
- `read` — mark messages as read (`keys[]`)

#### Groups (`/:id/groups/*`)
- `POST /:id/groups/create` — create a group
- `POST /:id/groups/join` — join via invite code/link
- `GET /:id/groups` — list all groups with participant counts
- `GET /:id/groups/:groupId` — get full group metadata
- `GET /:id/groups/:groupId/invite` — get invite link
- `POST /:id/groups/:groupId/revoke-invite` — revoke invite link
- `POST /:id/groups/:groupId/add` — add participants
- `POST /:id/groups/:groupId/remove` — remove participants
- `POST /:id/groups/:groupId/promote` — make participants admin
- `POST /:id/groups/:groupId/demote` — revoke admin
- `PUT /:id/groups/:groupId` — update name / description / photo
- `PUT /:id/groups/:groupId/settings` — set announcement/restrict mode

#### Contacts (`/:id/contacts/*`)
- `POST /:id/contacts/check` — check if numbers are on WhatsApp (`onWhatsApp`)
- `GET /:id/contacts/:jid/profile-pic` — get profile picture URL
- `GET /:id/contacts/:jid/about` — get about/status text
- `GET /:id/contacts/:jid/business` — get business profile
- `POST /:id/contacts/block` — block a contact
- `POST /:id/contacts/unblock` — unblock a contact

#### Labels (`/:id/labels/*`)
- `GET /:id/labels` — list all labels
- `POST /:id/labels` — create a label
- `POST /:id/labels/:labelId/assign` — assign label to a chat

#### Status / Stories (`/:id/status/*`)
- `POST /:id/status/text` — post text status with `backgroundColor` and `font`
- `POST /:id/status/image` — post image status (URL or base64, optional `caption`)
- `POST /:id/status/video` — post video status (URL or base64, optional `caption`)

#### Presence (`/:id/presence/*`)
- `POST /:id/presence/update` — set online/offline/composing/recording/paused for a chat
- `POST /:id/presence/subscribe` — subscribe to contact's presence events

#### Privacy / Chat (`/:id/chats/:jid/*`)
- `POST /:id/chats/:jid/disappearing` — enable/disable disappearing messages (expiration in seconds)
- `POST /:id/chats/:jid/archive` — archive a chat
- `POST /:id/chats/:jid/unarchive` — unarchive a chat
- `POST /:id/chats/:jid/pin` — pin a chat
- `POST /:id/chats/:jid/unpin` — unpin a chat
- `POST /:id/chats/:jid/mute` — mute chat (`duration` in ms, -1 = forever)
- `POST /:id/chats/:jid/unmute` — unmute a chat

### Changed
- `express.json` limit raised from `10mb` to `50mb` (to accommodate base64 media payloads)
- Startup log now lists all route namespaces

### Internal
- Added `src/utils/session.ts` — shared `getSessionOrError` / `requireReady` helpers (DRY)
- New route files: `messages.ts`, `groups.ts`, `contacts.ts`, `status.ts`, `presence.ts`, `privacy.ts`

---

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
