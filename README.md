<div align="center">

# WA Convo

### The Most Complete Open-Source WhatsApp Automation Platform

[![Node.js](https://img.shields.io/badge/Node.js-18+-green?style=flat-square&logo=node.js)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-GPL_3.0-red?style=flat-square)](./LICENSE)
[![Version](https://img.shields.io/badge/version-4.2.0-brightgreen?style=flat-square)](./CHANGELOG.md)

**REST API + WebSocket + CLI + AI Auto-Reply + Webhooks + Cron + SQLite**

Multi-Client &bull; Dual Engine &bull; 70+ Endpoints &bull; Persistent Storage &bull; Production-Ready

[Quick Start](#-quick-start) &bull; [API Reference](#-api-reference) &bull; [CLI Reference](#%EF%B8%8F-cli-reference) &bull; [Configuration](#-configuration) &bull; [Report Bug](https://github.com/sajidmahamud835/whatsapp-bot/issues)

</div>

---

## Why WA Convo?

Most WhatsApp bots on GitHub give you a basic send/receive API. **WA Convo gives you everything:**

| Feature | WA Convo | Others |
|---------|:--------:|:------:|
| Multi-client (up to 6 accounts) | Yes | Rarely |
| Dual engine (Baileys + Official Meta API) | Yes | No |
| AI auto-reply (OpenAI, Claude, Gemini, Ollama) | Yes | No |
| Cron job scheduler | Yes | No |
| Multi-webhook with HMAC signing & retry | Yes | No |
| SQLite persistence (messages, AI history) | Yes | No |
| Input validation (Zod) | Yes | No |
| Security hardening (Helmet, rate limit, HMAC) | Yes | Rarely |
| WebSocket real-time events | Yes | Some |
| Full CLI tool | Yes | No |
| Stats & monitoring endpoint | Yes | No |
| TypeScript with strict mode | Yes | Some |

---

## Features

### Dual Engine
- **Baileys** (default) — Free, WebSocket-based, no Meta approval needed
- **Official Cloud API** — Meta's WhatsApp Business API for production deployments

### 70+ REST API Endpoints
Messages, media, polls, reactions, voice notes, stickers, locations, contacts, groups, labels, status/stories, presence, privacy settings, chat management — all via REST.

### AI Auto-Reply
Plug in any LLM. Supports **OpenAI**, **Anthropic Claude**, **Google Gemini**, **Ollama**, and any OpenAI-compatible API (OpenRouter, Together, etc). Per-conversation context with persistent history.

### Advanced Webhook System
Register multiple webhooks with event filtering, HMAC payload signing, and exponential backoff retry (1s > 5s > 30s > 5min). Full delivery log.

### Cron Job Scheduler
Schedule recurring messages, broadcasts, and status updates with cron expressions. Full CRUD API and CLI.

### SQLite Persistence
Messages, AI conversation history, webhook delivery logs, and cron execution logs all stored in SQLite. Automatic retention purge (configurable).

### Security
- Zod schema validation on every endpoint
- Helmet security headers
- Per-route body size limits (1MB default, 50MB for media)
- HMAC signature verification for Meta webhooks
- API key authentication with Bearer tokens
- Phone number redaction in logs (enabled by default)
- SSL/TLS support

### Real-Time WebSocket
Connect to `ws://localhost:3000/ws` for live events: messages, QR codes, connection status, group activity.

### Full CLI Tool
```bash
wa-convo start              # Start the server
wa-convo client init 1      # Initialize client
wa-convo send 1 880... Hi   # Send a message
wa-convo ai test "Hello"    # Test AI
wa-convo cron list           # List cron jobs
wa-convo logs --follow       # Stream logs
```

### Stats & Monitoring
```
GET /stats
```
Returns uptime, memory, client counts, message volume (24h), AI stats, cron stats, webhook delivery stats. Ready for Grafana or any monitoring tool.

---

## Quick Start

### Prerequisites
- Node.js 18+
- npm

### Install & Run

```bash
git clone https://github.com/sajidmahamud835/whatsapp-bot.git
cd whatsapp-bot
npm install
npm run build
npm start
```

### Connect WhatsApp

```bash
# Initialize client 1
curl -X POST http://localhost:3000/1/init

# Open QR in browser
open http://localhost:3000/1/qr

# Scan with your phone — done!
```

### Send Your First Message

```bash
curl -X POST http://localhost:3000/1/send \
  -H "Content-Type: application/json" \
  -d '{"number": "8801XXXXXXXXX", "message": "Hello from WA Convo!"}'
```

### Enable AI Auto-Reply

Edit `config/config.json`:
```json
{
  "ai": {
    "enabled": true,
    "defaultProvider": "openai",
    "providers": {
      "openai": {
        "type": "openai",
        "apiKey": "sk-...",
        "model": "gpt-4o-mini"
      }
    }
  }
}
```

---

## Configuration

**Config file:** `config/config.json`

```json
{
  "server": { "port": 3000, "host": "127.0.0.1", "apiKey": "" },
  "clients": { "count": 6, "reconnectInterval": 5000 },
  "database": { "path": "./data/wa-convo.db", "retentionDays": 30 },
  "ai": { "enabled": false, "defaultProvider": "", "systemPrompt": "...", "providers": {} },
  "crons": [],
  "integrations": { "webhooks": [] },
  "logging": { "level": "info", "redactNumbers": true },
  "deployment": { "ssl": { "enabled": false } }
}
```

All settings can be overridden with environment variables. See [.env.example](./.env.example).

**Via CLI:**
```bash
wa-convo config set server.port 3001
wa-convo config set ai.enabled true
wa-convo config edit   # opens in $EDITOR
```

**Via API:**
```bash
GET  /config              # full config (sensitive fields redacted)
PUT  /config/server.port  # set value { "value": 3001 }
POST /config/reload       # reload from disk
```

---

## CLI Reference

```
wa-convo --help
```

| Command | Description |
|---------|-------------|
| `wa-convo start` | Start the API server |
| `wa-convo stop` | Stop the server |
| `wa-convo status` | Show server & client status |
| `wa-convo client list` | List all clients |
| `wa-convo client init <id>` | Initialize a client |
| `wa-convo client qr <id>` | Show QR code |
| `wa-convo client logout <id>` | Logout a client |
| `wa-convo send <id> <number> <msg>` | Send a message |
| `wa-convo config get <key>` | Get config value |
| `wa-convo config set <key> <val>` | Set config value |
| `wa-convo config edit` | Edit config in $EDITOR |
| `wa-convo contacts list <id>` | List contacts |
| `wa-convo groups list <id>` | List groups |
| `wa-convo ai providers` | Show AI providers |
| `wa-convo ai test "Hello"` | Test AI response |
| `wa-convo ai enable / disable` | Toggle AI auto-reply |
| `wa-convo cron list` | List cron jobs |
| `wa-convo cron add` | Create cron job |
| `wa-convo cron run <id>` | Run job now |
| `wa-convo logs` | View logs |
| `wa-convo logs --follow` | Stream logs live |
| `wa-convo logs --level error` | Filter by level |

---

## API Reference

> All protected endpoints require `Authorization: Bearer YOUR_API_KEY` (if API_KEY is set).

### System

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | API info + version |
| `GET` | `/health` | Health check + client summary |
| `GET` | `/clients` | List all clients |
| `GET` | `/stats` | Server metrics & monitoring |
| `GET` | `/config` | Full config (redacted) |
| `PUT` | `/config/:path` | Set config value |
| `POST` | `/config/reload` | Reload config from disk |

### Client Management

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/:id` | Client status |
| `POST` | `/:id/init` | Initialize client |
| `GET` | `/:id/qr` | QR code page |
| `POST` | `/:id/logout` | Logout |
| `POST` | `/:id/exit` | Stop & destroy client |

### Messaging

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/:id/send` | Send text `{number, message}` |
| `POST` | `/:id/sendMedia` | Send media from URL `{number, mediaUrl, caption?}` |
| `POST` | `/:id/sendBulk` | Bulk send `{numbers[], message}` |
| `POST` | `/:id/messages/react` | Send reaction `{key, emoji}` |
| `POST` | `/:id/messages/poll` | Create poll `{number, title, options[]}` |
| `POST` | `/:id/messages/viewonce` | View-once media |
| `POST` | `/:id/messages/edit` | Edit message `{key, newText}` |
| `POST` | `/:id/messages/delete` | Delete for everyone `{key}` |
| `POST` | `/:id/messages/reply` | Reply/quote `{key, text}` |
| `POST` | `/:id/messages/forward` | Forward `{key, to}` |
| `POST` | `/:id/messages/location` | Send location `{number, latitude, longitude}` |
| `POST` | `/:id/messages/contact` | Send vCard `{number, name, contactNumber}` |
| `POST` | `/:id/messages/sticker` | Send sticker |
| `POST` | `/:id/messages/voice` | Send voice note |
| `POST` | `/:id/messages/read` | Mark as read `{keys[]}` |

### Groups

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/:id/groups/create` | Create group |
| `POST` | `/:id/groups/join` | Join via invite |
| `GET` | `/:id/groups` | List all groups |
| `GET` | `/:id/groups/:gid` | Group metadata |
| `GET` | `/:id/groups/:gid/invite` | Get invite link |
| `POST` | `/:id/groups/:gid/revoke-invite` | Revoke invite |
| `POST` | `/:id/groups/:gid/add` | Add participants |
| `POST` | `/:id/groups/:gid/remove` | Remove participants |
| `POST` | `/:id/groups/:gid/promote` | Make admin |
| `POST` | `/:id/groups/:gid/demote` | Revoke admin |
| `PUT` | `/:id/groups/:gid` | Update name/desc/photo |
| `PUT` | `/:id/groups/:gid/settings` | Set announce/restrict |

### Contacts & Labels

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/:id/contacts/check` | Check WhatsApp registration |
| `GET` | `/:id/contacts/:jid/profile-pic` | Profile picture URL |
| `GET` | `/:id/contacts/:jid/about` | About/status text |
| `GET` | `/:id/contacts/:jid/business` | Business profile |
| `POST` | `/:id/contacts/block` | Block contact |
| `POST` | `/:id/contacts/unblock` | Unblock contact |
| `GET` | `/:id/labels` | List labels |
| `POST` | `/:id/labels` | Create label |

### Status / Stories

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/:id/status/text` | Post text status |
| `POST` | `/:id/status/image` | Post image status |
| `POST` | `/:id/status/video` | Post video status |

### Presence & Privacy

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/:id/presence/update` | Set online/composing/recording |
| `POST` | `/:id/chats/:jid/disappearing` | Disappearing messages |
| `POST` | `/:id/chats/:jid/archive` | Archive chat |
| `POST` | `/:id/chats/:jid/pin` | Pin chat |
| `POST` | `/:id/chats/:jid/mute` | Mute chat |

### AI

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/ai/providers` | List providers & config |
| `POST` | `/ai/test` | Test AI `{message, provider?}` |
| `PUT` | `/ai/prompt` | Update system prompt `{prompt}` |
| `PUT` | `/ai/config` | Update AI settings |
| `DELETE` | `/ai/history/:jid` | Clear conversation history |

### Cron Jobs

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/cron` | List all jobs |
| `POST` | `/cron` | Create job `{name, schedule, clientId, action, params}` |
| `PUT` | `/cron/:id` | Update job |
| `DELETE` | `/cron/:id` | Delete job |
| `POST` | `/cron/:id/run` | Run job now |

### Webhooks

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/webhooks` | List registered webhooks |
| `POST` | `/webhooks` | Register `{url, events?, secret?, enabled?}` |
| `GET` | `/webhooks/:id` | Get webhook + recent deliveries |
| `PUT` | `/webhooks/:id` | Update webhook |
| `DELETE` | `/webhooks/:id` | Delete webhook |
| `POST` | `/webhooks/:id/test` | Send test payload |
| `GET` | `/webhooks/:id/deliveries` | Delivery log |

### Meta Webhook (public, no auth)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/webhook/whatsapp` | Meta hub verification |
| `POST` | `/webhook/whatsapp` | Incoming Meta events |

---

## WebSocket

Connect to `ws://localhost:3000/ws` for real-time events.

**Events:** `message.received`, `message.sent`, `client.connected`, `client.disconnected`, `client.qr`, `client.ready`, `client.error`, `group.joined`, `group.left`, `server.started`, `server.stopped`

```json
// Subscribe to specific events
{ "type": "subscribe", "events": ["message.received", "client.qr"] }

// Ping
{ "type": "ping" }
```

---

## Webhook System

Register webhooks to receive events via HTTP POST:

```bash
# Register a webhook
curl -X POST http://localhost:3000/webhooks \
  -H "Authorization: Bearer YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-server.com/webhook",
    "events": ["message.received"],
    "secret": "your-hmac-secret"
  }'
```

Payloads are signed with `X-WA-Signature-256` header. Failed deliveries retry with exponential backoff.

---

## Project Structure

```
src/
├── core/                    # Core business logic
│   ├── client-manager.ts    # Multi-client session management
│   ├── config.ts            # JSON config with dot-notation access
│   ├── events.ts            # Typed event bus
│   ├── logger.ts            # Pino structured logging
│   ├── stats.ts             # Server metrics collector
│   ├── types.ts             # TypeScript interfaces
│   ├── ai/                  # AI auto-reply
│   │   ├── manager.ts       # Provider management & conversation context
│   │   └── providers/       # OpenAI, Anthropic, Google
│   ├── db/                  # SQLite persistence
│   │   ├── database.ts      # Connection & migrations
│   │   ├── message-store.ts # Message persistence
│   │   ├── ai-history-store.ts
│   │   ├── webhook-log-store.ts
│   │   └── cron-log-store.ts
│   ├── engines/             # WhatsApp engine abstraction
│   │   ├── baileys.ts       # Baileys WebSocket engine
│   │   └── official.ts      # Meta Cloud API engine
│   ├── cron/                # Cron job scheduler
│   └── webhooks/            # Multi-webhook dispatch system
├── api/                     # REST API & WebSocket
│   ├── server.ts            # Express entry point
│   ├── websocket.ts         # WebSocket event streaming
│   ├── middleware/           # Auth, rate limit, validation, HMAC
│   ├── schemas/             # Zod request validation schemas
│   └── routes/              # 14 route modules
├── cli/                     # CLI tool (wa-convo)
│   ├── index.ts             # Commander setup
│   └── commands/            # CLI command handlers
└── utils/                   # JID formatting, session helpers
```

---

## AI Providers

| Provider | Config Type | Notes |
|----------|-------------|-------|
| OpenAI | `openai` | GPT-4o, GPT-4o-mini, etc. |
| OpenRouter | `openrouter` | Access 100+ models via one API |
| Anthropic | `anthropic` | Claude 3 Haiku, Sonnet, Opus |
| Google Gemini | `google` | Gemini 1.5 Flash, Pro |
| Ollama | `ollama` | Run local models (Llama, Mistral) |
| Any OpenAI-compatible | `openai` + `baseUrl` | Together, Groq, etc. |

---

## Cron Job Actions

| Action | Params | Description |
|--------|--------|-------------|
| `sendMessage` | `{to, message}` | Send to one number |
| `broadcast` | `{numbers[], message}` | Send to multiple numbers |
| `postStatus` | `{text}` | Post WhatsApp status/story |

Schedule format: [cron expressions](https://crontab.guru) (e.g., `0 9 * * *` = every day at 9am)

---

## Contributing

1. Fork the repo
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

GNU GPL v3.0 — See [LICENSE](./LICENSE) for details.

---

<div align="center">

**Built by [Sajid Mahamud](https://github.com/sajidmahamud835)**

If this project helped you, please give it a star!

</div>
