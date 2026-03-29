<div align="center">

# 🟢 WA Convo

### WhatsApp Automation Platform

[![Node.js](https://img.shields.io/badge/Node.js-18+-green?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Baileys](https://img.shields.io/badge/Engine-Baileys-25D366?style=for-the-badge&logo=whatsapp)](https://github.com/WhiskeySockets/Baileys)
[![Version](https://img.shields.io/badge/version-4.0.0-brightgreen?style=for-the-badge)](./CHANGELOG.md)

**A full-stack WhatsApp automation platform — REST API + WebSocket + CLI + Config system.**

*Multi-Client • Webhook-Driven • Event-Based • API-First • No Puppeteer*

[Report Bug](https://github.com/sajidmahamud835/whatsapp-bot/issues) · [Request Feature](https://github.com/sajidmahamud835/whatsapp-bot/issues)

</div>

---

## ✨ v4.0 — WA Convo Platform

- 🏗️ **Monorepo-lite structure** — `core/`, `api/`, `cli/`, `utils/`
- ⚙️ **Config system** — JSON config with dot-notation get/set/edit via CLI & API
- 📋 **Structured logging** — Pino-based JSON logs to file + console with log levels
- 🔌 **Event system** — Node EventEmitter for webhooks and future N8N integration
- 🌐 **WebSocket server** — real-time event streaming (QR, status, messages)
- 🖥️ **CLI tool** — `wa-convo` command with full client/config/logs management
- 🛣️ **Config API** — CRUD config via REST endpoints

---

## 🚀 Quick Start

### Install & Build

```bash
npm install
npm run build
```

### Configure

```bash
cp .env.example .env
# Or use the CLI:
wa-convo config edit
```

### Start

```bash
# Production
npm start

# Development (hot reload)
npm run dev

# Via CLI
wa-convo start
```

### Connect a WhatsApp client

```bash
# Initialize client 1
wa-convo client init 1

# Open QR in browser
wa-convo client qr 1
# Or scan from terminal output directly
```

---

## 🖥️ CLI Reference

```bash
wa-convo --help
```

| Command | Description |
|---|---|
| `wa-convo start` | Start the API server |
| `wa-convo start --headless` | Start without dashboard |
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
| `wa-convo contacts check <id> <num>` | Check if on WhatsApp |
| `wa-convo groups list <id>` | List groups |
| `wa-convo logs` | View logs |
| `wa-convo logs --follow` | Stream logs |
| `wa-convo logs --level error` | Filter by level |
| `wa-convo logs --since 1h` | Show last 1 hour |

---

## ⚙️ Configuration

Config file: `config/config.json`

```json
{
  "server": { "port": 3000, "host": "127.0.0.1", "apiKey": "" },
  "clients": { "count": 6, "autoInit": [], "reconnectInterval": 5000 },
  "logging": { "level": "info", "dir": "./logs", "redactNumbers": false },
  "integrations": { "webhooks": [] }
}
```

**Via CLI:**
```bash
wa-convo config set server.port 3001
wa-convo config get clients.count
wa-convo config edit   # opens in $EDITOR
```

**Via API:**
```bash
GET  /config              # full config (redacted)
GET  /config/server.port  # specific value
PUT  /config/server.port  # set value { "value": 3001 }
POST /config/reload       # reload from disk
```

---

## 🌐 WebSocket

Connect to `ws://localhost:3000/ws` for real-time events.

**Events:** `message.received`, `client.qr`, `client.connected`, `client.disconnected`, `client.ready`, `group.joined`, `server.started`

**Subscribe to specific events:**
```json
{ "type": "subscribe", "events": ["message.received", "client.qr"] }
```

**Ping/pong:**
```json
{ "type": "ping" }
```

---

## 📡 API Reference

> All endpoints require `Authorization: Bearer YOUR_API_KEY` (if API_KEY is set)

### System

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | API info |
| `GET` | `/health` | Health + client summary |
| `GET` | `/clients` | List all clients |
| `GET` | `/config` | Get full config (redacted) |
| `GET` | `/config/:path` | Get config value (dot notation) |
| `PUT` | `/config/:path` | Set config value |
| `POST` | `/config/reload` | Reload config from disk |

### Client Management

| Method | Path | Description |
|---|---|---|
| `GET` | `/:id` | Client info / status |
| `GET` | `/:id/status` | Detailed status JSON |
| `POST` | `/:id/init` | Initialize and start client |
| `GET` | `/:id/qr` | QR code page (HTML, auto-refreshes) |
| `POST` | `/:id/logout` | Logout from WhatsApp |
| `POST` | `/:id/exit` | Stop and destroy client |

### Messaging

| Method | Path | Body | Description |
|---|---|---|---|
| `POST` | `/:id/send` | `{ number, message }` | Send text message |
| `POST` | `/:id/sendMedia` | `{ number, mediaUrl, caption? }` | Send media from URL |
| `POST` | `/:id/sendBulk` | `{ numbers[], message }` | Send to multiple recipients |
| `POST` | `/:id/sendButtons` | `{ number, body, buttons[], footer? }` | Send button message* |

### Advanced Messages

| Method | Path | Body | Description |
|---|---|---|---|
| `POST` | `/:id/messages/react` | `{ key, emoji }` | Send reaction |
| `POST` | `/:id/messages/poll` | `{ number, title, options[] }` | Create poll |
| `POST` | `/:id/messages/viewonce` | `{ number, media, mediaType? }` | View-once media |
| `POST` | `/:id/messages/edit` | `{ key, newText }` | Edit message |
| `POST` | `/:id/messages/delete` | `{ key }` | Delete for everyone |
| `POST` | `/:id/messages/reply` | `{ key, text }` | Reply/quote |
| `POST` | `/:id/messages/forward` | `{ key, to }` | Forward message |
| `POST` | `/:id/messages/location` | `{ number, latitude, longitude }` | Send location |
| `POST` | `/:id/messages/contact` | `{ number, name, contactNumber }` | Send vCard |
| `POST` | `/:id/messages/sticker` | `{ number, sticker }` | Send sticker |
| `POST` | `/:id/messages/voice` | `{ number, audio }` | Send voice note |
| `POST` | `/:id/messages/read` | `{ keys[] }` | Mark as read |

### Groups

| Method | Path | Description |
|---|---|---|
| `POST` | `/:id/groups/create` | Create group |
| `POST` | `/:id/groups/join` | Join via invite |
| `GET` | `/:id/groups` | List all groups |
| `GET` | `/:id/groups/:groupId` | Group metadata |
| `GET` | `/:id/groups/:groupId/invite` | Get invite link |
| `POST` | `/:id/groups/:groupId/revoke-invite` | Revoke invite |
| `POST` | `/:id/groups/:groupId/add` | Add participants |
| `POST` | `/:id/groups/:groupId/remove` | Remove participants |
| `POST` | `/:id/groups/:groupId/promote` | Make admin |
| `POST` | `/:id/groups/:groupId/demote` | Revoke admin |
| `PUT` | `/:id/groups/:groupId` | Update name/desc/photo |
| `PUT` | `/:id/groups/:groupId/settings` | Set announcement/restrict |

### Contacts

| Method | Path | Description |
|---|---|---|
| `POST` | `/:id/contacts/check` | Check if numbers are on WhatsApp |
| `GET` | `/:id/contacts/:jid/profile-pic` | Get profile picture URL |
| `GET` | `/:id/contacts/:jid/about` | Get about/status text |
| `GET` | `/:id/contacts/:jid/business` | Get business profile |
| `POST` | `/:id/contacts/block` | Block a contact |
| `POST` | `/:id/contacts/unblock` | Unblock a contact |
| `GET` | `/:id/labels` | List labels |
| `POST` | `/:id/labels` | Create label |
| `POST` | `/:id/labels/:labelId/assign` | Assign label |

### Status / Stories

| Method | Path | Description |
|---|---|---|
| `POST` | `/:id/status/text` | Post text status |
| `POST` | `/:id/status/image` | Post image status |
| `POST` | `/:id/status/video` | Post video status |

### Presence

| Method | Path | Description |
|---|---|---|
| `POST` | `/:id/presence/update` | Set presence |
| `POST` | `/:id/presence/subscribe` | Subscribe to contact presence |

### Privacy / Chat

| Method | Path | Description |
|---|---|---|
| `POST` | `/:id/chats/:jid/disappearing` | Set disappearing messages |
| `POST` | `/:id/chats/:jid/archive` | Archive chat |
| `POST` | `/:id/chats/:jid/unarchive` | Unarchive chat |
| `POST` | `/:id/chats/:jid/pin` | Pin chat |
| `POST` | `/:id/chats/:jid/unpin` | Unpin chat |
| `POST` | `/:id/chats/:jid/mute` | Mute chat |
| `POST` | `/:id/chats/:jid/unmute` | Unmute chat |

---

## 🔗 Webhook Bridge

Set `WEBHOOK_URL` in `.env`. On every incoming message:

```json
{
  "instanceId": "1",
  "id": { "remoteJid": "...", "fromMe": false, "id": "..." },
  "body": "Hello!",
  "from": "8801XXXXXXXXX@s.whatsapp.net",
  "to": "8801XXXXXXXXX@s.whatsapp.net",
  "type": "conversation",
  "timestamp": 1700000000,
  "hasMedia": false,
  "isGroup": false
}
```

Respond with:
```json
{ "reply": "Hi there!" }
```

---

## 📦 Project Structure

```
src/
├── core/           # Core engine
│   ├── client-manager.ts
│   ├── config.ts
│   ├── events.ts
│   ├── logger.ts
│   └── types.ts
├── api/            # REST API + WebSocket
│   ├── server.ts
│   ├── websocket.ts
│   ├── middleware/
│   └── routes/
├── cli/            # CLI tool (wa-convo)
│   ├── index.ts
│   ├── commands/
│   └── utils.ts
└── utils/
    ├── session.ts
    └── jid.ts
```

---

## 🔄 Migration from v3

All v3 API endpoints are 100% backward-compatible. New features:

| Feature | v3 | v4 |
|---|---|---|
| Entry point | `src/index.ts` | `src/api/server.ts` |
| Config | `.env` only | `config/config.json` + `.env` |
| Logging | console.log | Pino structured JSON |
| Events | none | EventEmitter bus |
| WebSocket | none | `/ws` endpoint |
| CLI | none | `wa-convo` command |
| Config API | none | `GET/PUT /config/*` |

---

## 📄 License

GNU GPL v3.0 — See `LICENSE` for details.

---

<div align="center">

**[Sajid Mahamud](https://github.com/sajidmahamud835)** · TypeScript Engineer · Automation Specialist

[🌐 Portfolio](https://sajidmahamud835.github.io/) · [📦 GitHub](https://github.com/sajidmahamud835/whatsapp-bot)

</div>
