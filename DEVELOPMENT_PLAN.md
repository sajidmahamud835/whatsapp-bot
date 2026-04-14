# WA Convo — Development Plan

> **Current:** v4.1.0 (Phase 2) | **Next:** v4.2.0 (Phase 3) | **Target:** v5.0.0 (Production Platform)

---

## Phase 3 — v4.2.0: Dashboard + Webhook System + Security Hardening

**Goal:** Ship the dashboard UI, build a real webhook dispatch system, and close all security gaps before any public-facing deployment.

### 3A: Dashboard UI

The config, types, and CLI already reference a dashboard — this phase builds it.

**Stack:** React + Vite (lightweight, fast builds, TypeScript-native)

| Task | Details |
|------|---------|
| Dashboard server | Serve static build from Express on `dashboard.port` (3001), proxy API calls to main server |
| Auth page | Login with existing API key, store in session/localStorage |
| Client overview | Cards for each client — status, phone, engine type, QR code display, init/logout actions |
| Message composer | Select client, pick contact/group, send text/media/location with live preview |
| Conversation viewer | Real-time incoming messages via WebSocket, grouped by JID, searchable |
| AI config panel | Toggle AI on/off, switch providers, edit system prompt, view conversation history per JID |
| Cron manager | List/create/edit/delete/run cron jobs with visual cron expression builder |
| Config editor | View/edit config.json with validation, env var overrides shown |
| Logs viewer | Stream logs via WebSocket with level/time filters (mirror `wa-convo logs --follow`) |
| Health dashboard | Server uptime, memory usage, connected clients, message throughput counters |

**API additions needed:**
- `GET /stats` — message counts, uptime, memory, active connections
- `GET /:id/messages/recent` — last N messages per client (requires message store, see 3C)
- WebSocket: add `stats.update` event type

### 3B: Webhook Dispatch System

Current state: single `WEBHOOK_URL` env var, one-way push. Target: multi-webhook, event-filtered, signed.

| Task | Details |
|------|---------|
| Webhook registration API | `POST /webhooks` — register URL + events[] + secret + retry config |
| Webhook CRUD | `GET/PUT/DELETE /webhooks/:id` — manage registered webhooks |
| Event-based dispatch | On any event bus emission, fan out to all webhooks subscribed to that event type |
| HMAC signing | Sign payloads with webhook secret (`X-WA-Signature-256` header) so receivers can verify |
| Retry queue | Failed deliveries retry with exponential backoff (1s, 5s, 30s, 5m) up to 5 attempts |
| Delivery log | Store last 100 delivery attempts per webhook (status, response time, error) |
| Webhook test | `POST /webhooks/:id/test` — send a test payload to verify connectivity |
| N8N trigger endpoint | `POST /integrations/n8n/trigger` — formatted for N8N webhook trigger node |
| CLI commands | `wa-convo webhooks list/add/remove/test` |

### 3C: Message Store (Persistence Layer)

In-memory state doesn't survive restarts. Add lightweight persistence.

| Task | Details |
|------|---------|
| Choose storage | SQLite via `better-sqlite3` (zero config, single file, fast) |
| Message table | Store incoming/outgoing messages: id, clientId, jid, body, type, timestamp, fromMe, mediaUrl |
| AI history table | Persist conversation history per JID (replace in-memory Map) |
| Webhook delivery log | Store delivery attempts |
| Cron execution log | Store cron run results (currently only in-memory runCount/lastRun) |
| Migration system | Simple version-based migrations in `db/migrations/` |
| Config option | `database.path` in config.json (default: `./data/wa-convo.db`) |
| Retention policy | Auto-purge messages older than N days (configurable, default 30) |

### 3D: Security Hardening

| Task | Details |
|------|---------|
| Secrets management | Move API keys out of config.json — read from env vars only, never write to disk |
| API key masking | `GET /ai/providers` and `GET /config` must redact all keys/tokens (show last 4 chars only) |
| Input validation | Add `zod` or `joi` schema validation on all route request bodies |
| Body size limits | Per-route limits: 1MB default, 50MB for media endpoints only |
| Rate limiter upgrade | Per-endpoint + per-API-key limits (not just per-IP) |
| HTTPS enforcement | Wire `deployment.ssl` config to actually create HTTPS server when enabled |
| Helmet middleware | Add `helmet` for security headers (CSP, HSTS, X-Frame-Options) |
| Phone redaction default | Change `logging.redactNumbers` default to `true` |
| Meta webhook verification | HMAC signature verification on incoming Meta Cloud API webhooks |
| Dependency audit | Add `npm audit` to CI and pre-build script |

---

## Phase 4 — v4.3.0: Official Engine Parity + Advanced AI

**Goal:** Make the Official (Meta Cloud API) engine a first-class citizen and level up AI capabilities.

### 4A: Official Engine Feature Parity

The Official engine currently only supports: sendText, sendMedia, sendLocation, sendReaction, sendTemplate, markRead. Baileys supports 40+ operations.

| Priority | Feature | Notes |
|----------|---------|-------|
| High | Group management | List groups, metadata, add/remove participants via Graph API |
| High | Contact operations | Check WhatsApp registration, profile pics, business profiles |
| High | Message replies/quotes | Context parameter in Cloud API messages |
| High | Message editing/deletion | Supported in Cloud API v18+ |
| Medium | Status/Stories | Post text/image/video status via Cloud API |
| Medium | View-once media | Cloud API supports view-once flag |
| Medium | Polls | Cloud API interactive messages |
| Medium | Stickers/voice notes | Media type handling for sticker and audio/ptt |
| Low | Presence updates | Limited in Cloud API — typing indicators only |
| Low | Labels | Business API label management |
| Low | Disappearing messages | Chat settings via Cloud API |

**Architecture:**
- Abstract shared route logic so handlers work with either engine
- Engine capability detection: `engine.supports('groups')` → graceful degradation or error
- Feature matrix endpoint: `GET /:id/capabilities` — returns what the active engine supports

### 4B: Advanced AI Features

| Task | Details |
|------|---------|
| RAG support | Upload documents (PDF, TXT) per client — AI references them in responses |
| Function calling | AI can trigger WhatsApp actions (send message, create group) via tool use |
| Per-contact AI profiles | Different system prompts per JID or JID pattern (e.g., groups get different persona) |
| AI conversation summary | Summarize long conversations on demand (`POST /ai/summarize/:jid`) |
| Usage tracking | Track token usage per provider, per JID — expose via `GET /ai/usage` |
| Cost estimation | Estimate monthly AI costs based on usage patterns |
| Media understanding | Pass images/documents to multimodal AI providers for analysis |
| Streaming responses | Stream AI responses to WhatsApp (send typing indicator, then chunked reply) |
| Prompt templates | Named prompt templates switchable per client/group (`GET/POST /ai/templates`) |

### 4C: Contact & Conversation Management

| Task | Details |
|------|---------|
| Contact database | Store contacts with labels, notes, tags (synced from WhatsApp) |
| Conversation threads | Group messages into threads, track open/closed state |
| Quick replies | Saved response templates, insertable via API or dashboard |
| Contact segments | Tag-based segments for targeted broadcasts |
| Blocklist management | Centralized block/allow list across all clients |

---

## Phase 5 — v5.0.0: Production Platform

**Goal:** Production-grade deployment, multi-user access, and ecosystem integrations.

### 5A: Multi-User & Permissions

| Task | Details |
|------|---------|
| User accounts | JWT-based auth with user registration, login, password reset |
| Role-based access | Roles: admin (full access), operator (send/manage), viewer (read-only) |
| Per-client permissions | Assign users to specific clients — operator on client 1, viewer on client 2 |
| Audit log | Log all API actions with user, timestamp, IP, action, target |
| API key scoping | Scoped API keys: read-only, send-only, full-access, per-client |
| Session management | JWT refresh tokens, session timeout, concurrent session limits |

### 5B: Deployment & Infrastructure

| Task | Details |
|------|---------|
| Docker support | `Dockerfile` + `docker-compose.yml` with SQLite volume mount |
| Docker multi-arch | Build for linux/amd64 + linux/arm64 (Raspberry Pi support) |
| Health checks | Deep health: check DB connectivity, engine status, AI provider reachability |
| Graceful shutdown | Drain active requests, close WebSocket connections, stop cron jobs, flush logs |
| Clustering | PM2 ecosystem config for multi-process deployment |
| Reverse proxy guide | Nginx/Caddy config examples with SSL termination |
| Environment profiles | `config/config.production.json`, `config/config.development.json` |
| Backup/restore | CLI commands: `wa-convo backup` (export DB + config + auth), `wa-convo restore` |

### 5C: Ecosystem Integrations

| Integration | Details |
|-------------|---------|
| N8N | Native N8N node package (`n8n-nodes-wa-convo`) — trigger + action nodes |
| Zapier | Zapier app with triggers (message received, client connected) and actions (send message, send media) |
| Make (Integromat) | HTTP module templates with webhook triggers |
| Telegram bridge | Forward messages between WhatsApp and Telegram groups |
| Email bridge | Forward WhatsApp messages to email, reply via email |
| CRM connectors | HubSpot, Salesforce — sync contacts, log conversations |
| Google Sheets | Log messages to Google Sheets (append row per message) |
| Slack notifications | Forward important messages/alerts to Slack channels |

### 5D: Monitoring & Observability

| Task | Details |
|------|---------|
| Prometheus metrics | `/metrics` endpoint — message count, error rate, latency, active sessions |
| Grafana dashboard | Pre-built dashboard JSON for common metrics |
| Alert rules | Configurable alerts: client disconnected, high error rate, AI provider down |
| Structured error tracking | Sentry integration for unhandled exceptions |
| Request tracing | Correlation IDs across API → engine → webhook → AI calls |

---

## Phase 6 — v5.1.0: Scale & Monetization

**Goal:** Support high-volume deployments and optional commercial features.

### 6A: Scale

| Task | Details |
|------|---------|
| Redis adapter | Replace in-memory rate limiter, session state, and pub/sub with Redis |
| Message queue | Bull/BullMQ for reliable message delivery, broadcast queuing, webhook dispatch |
| Horizontal scaling | Multiple server instances sharing Redis + DB, sticky sessions for WebSocket |
| Client sharding | Distribute clients across worker processes or server instances |
| CDN for media | Upload media to S3/R2 before sending — reduce memory pressure |

### 6B: Advanced Messaging

| Task | Details |
|------|---------|
| Message scheduling | Schedule individual messages for future delivery (not just cron) |
| Broadcast campaigns | Campaign manager: create, schedule, track delivery/read rates |
| Auto-responder rules | Rule engine: if message contains X → reply Y (without AI, pattern-based) |
| Chatbot flows | Visual flow builder for multi-step conversation bots |
| Template messages | WhatsApp Business template message management (create, submit for approval, send) |

### 6C: Analytics

| Task | Details |
|------|---------|
| Message analytics | Messages sent/received per client, per day, per contact |
| Response time tracking | Average time to first reply (human or AI) |
| AI performance | Track AI response quality (user feedback thumbs up/down) |
| Broadcast analytics | Delivery rate, read rate, reply rate per campaign |
| Export | CSV/JSON export of all analytics data |

---

## Testing Strategy (Applies to All Phases)

| Layer | Tool | Coverage Target |
|-------|------|-----------------|
| Unit tests | Jest | Core managers (AI, Cron, Config, ClientManager) — 80%+ |
| API integration | Jest + Supertest | All route handlers — happy path + error cases |
| Engine mocks | Jest | Mock Baileys/Official engines for deterministic testing |
| E2E | Playwright (dashboard) | Dashboard golden paths — login, send message, manage cron |
| Load testing | k6 or Artillery | API throughput under concurrent connections |
| Security | npm audit + Snyk | Zero critical/high vulnerabilities |
| CI pipeline | GitHub Actions | Lint → typecheck → test → build on every PR |

**Immediate testing priorities (before Phase 3):**
1. Unit tests for `AIManager`, `CronManager`, `ConfigManager`
2. Integration tests for all message routes with mocked Baileys socket
3. Auth middleware tests (valid key, invalid key, no key, rate limiting)
4. WebSocket connection and event subscription tests

---

## Tech Debt & Cleanup (Ongoing)

| Item | Priority | Notes |
|------|----------|-------|
| Remove `as any` casts in routes | High | Replace with proper typed request handlers using zod |
| Consistent error responses | High | Standardize `{success, error, data}` shape across all routes |
| Express 5 migration | Medium | Currently on Express 4 — migrate when stable |
| ESLint + Prettier | Medium | Add linting with auto-fix on save |
| OpenAPI spec | Medium | Generate from route definitions for Swagger UI |
| Modular route handlers | Low | Extract business logic from route files into service layer |
| Monorepo split | Low | Consider splitting into `@wa-convo/core`, `@wa-convo/api`, `@wa-convo/cli`, `@wa-convo/dashboard` when complexity warrants it |

---

## Release Cadence

| Version | Phase | Focus | Estimated Scope |
|---------|-------|-------|-----------------|
| **v4.2.0** | Phase 3 | Dashboard + Webhooks + Security + SQLite | Large |
| **v4.3.0** | Phase 4 | Official Engine Parity + Advanced AI | Medium |
| **v5.0.0** | Phase 5 | Multi-user + Docker + Integrations | Large |
| **v5.1.0** | Phase 6 | Scale + Campaigns + Analytics | Large |

---

## Priority Matrix

**Do First (High Impact, Achievable Now):**
- Security hardening (3D) — blocks any public deployment
- Input validation with zod (3D) — prevents bugs and exploits
- SQLite message store (3C) — unblocks dashboard and analytics
- CI pipeline with tests (Testing Strategy) — prevents regressions

**Do Next (High Impact, More Effort):**
- Dashboard UI (3A) — biggest UX improvement
- Webhook dispatch system (3B) — enables all integrations
- Official engine parity (4A) — makes dual-engine actually useful

**Do Later (Strategic Value):**
- N8N/Zapier integrations (5C) — ecosystem growth
- Multi-user auth (5A) — needed for team use
- Docker (5B) — needed for easy deployment

**Do Eventually (Nice to Have):**
- Chatbot flow builder (6B) — complex, niche audience
- Analytics (6C) — valuable but not blocking
- Monorepo split (Tech Debt) — only if complexity demands it
