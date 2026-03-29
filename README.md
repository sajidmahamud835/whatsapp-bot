<div align="center">

# 🤖 WhatsApp Bot — Multi-Client REST API

[![Node.js](https://img.shields.io/badge/Node.js-18+-green?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Baileys](https://img.shields.io/badge/Library-Baileys-25D366?style=for-the-badge&logo=whatsapp)](https://github.com/WhiskeySockets/Baileys)

**A programmable, TypeScript-first automation bridge between the WhatsApp network and external REST APIs.**

*Scalable • Multi-Client • Webhook-Driven • API-Key Protected • No Puppeteer*

[Report Bug](https://github.com/sajidmahamud835/whatsapp-bot/issues) · [Request Feature](https://github.com/sajidmahamud835/whatsapp-bot/issues)

</div>

---

## ✨ v3 Highlights

- ✅ **Baileys (WebSocket-based)** — no Chrome/Chromium required
- ✅ **~10–50 MB RAM per client** — down from ~300–500 MB with Puppeteer
- ✅ **Full TypeScript** — strict mode, proper types throughout
- ✅ **Dynamic client count** — configure via `CLIENT_COUNT` env
- ✅ **API key authentication** — Bearer token middleware
- ✅ **Rate limiting** — configurable per-IP throttle
- ✅ **Webhook bridge** — forward incoming messages, receive reply commands
- ✅ **Paginated endpoints** — chats & messages support `?page=&limit=`
- ✅ **Health check** — `GET /health` for monitoring
- ✅ **Auto-reconnect** — reconnects automatically on connection drops

---

## 🚀 Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env with your settings
```

### 3. Run

**Development (with hot reload):**
```bash
npm run dev
```

**Production:**
```bash
npm run build
npm start
```

### 4. Initialize a WhatsApp client
```bash
# Start client 1
curl -X POST http://localhost:3000/1/init \
  -H "Authorization: Bearer YOUR_API_KEY"

# Scan the QR code (terminal or browser)
open http://localhost:3000/1/qr
```

The QR code also prints directly in the server terminal.

---

## ⚙️ Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | HTTP server port |
| `API_KEY` | *(empty)* | Bearer token for API auth. Leave empty to disable (dev only) |
| `CLIENT_COUNT` | `6` | Number of WhatsApp client slots |
| `WEBHOOK_URL` | *(empty)* | URL to POST incoming messages to |
| `CORS_ORIGIN` | `*` | Allowed CORS origins |
| `RATE_LIMIT_MAX` | `60` | Max requests per IP per minute |

---

## 🔐 Authentication

All endpoints (except `GET /`) require an `Authorization` header:

```
Authorization: Bearer YOUR_API_KEY
```

Set `API_KEY` in your `.env` to enable. Omit it to run without auth (development only).

---

## 📡 API Reference

### System

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | API info |
| `GET` | `/health` | Overall health + client summary |
| `GET` | `/clients` | List all clients and their status |

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
| `POST` | `/:id/sendButtons` | `{ number, body, buttons[], title?, footer? }` | Send button message* |

> *Note: WhatsApp has restricted native button messages. `sendButtons` gracefully falls back to formatted text.

### Data

| Method | Path | Query | Description |
|---|---|---|---|
| `GET` | `/:id/contacts` | — | List contacts |
| `GET` | `/:id/chats` | `?page=1&limit=20` | Paginated chat list |
| `GET` | `/:id/chats/:chatId/messages` | `?page=1&limit=20` | Paginated messages |

---

## 🔗 Webhook Bridge

Set `WEBHOOK_URL` in `.env`. On every incoming message, the bot POSTs:

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

Your server can respond with:
```json
{
  "reply": "Hi there!",
  "replyMedia": "base64_encoded_image_string"
}
```

---

## 📦 Number Format

Baileys uses JID format:

| Type | Format | Example |
|---|---|---|
| Individual | `<countrycode><number>@s.whatsapp.net` | `8801XXXXXXXXX@s.whatsapp.net` |
| Group | `<groupid>@g.us` | `1234567890-1234567890@g.us` |

**You can also pass bare numbers** (e.g. `8801XXXXXXXXX`) — the API will auto-convert them.

> ⚠️ v2 used `@c.us` suffix. Baileys uses `@s.whatsapp.net` for individuals.

---

## 🔄 Migrating from v2

| Change | v2 | v3 |
|---|---|---|
| Library | `whatsapp-web.js` | `@whiskeysockets/baileys` |
| Auth folder | `.wwebjs_auth/` | `.auth/session-{id}/` |
| JID format | `number@c.us` | `number@s.whatsapp.net` |
| RAM per client | ~300–500 MB | ~10–50 MB |
| Chrome required | ✅ Yes | ❌ No |
| API endpoints | unchanged | identical |

**API endpoints are 100% backward-compatible.** Just update number formats and `npm install`.

---

## 🧪 Testing

```bash
npm test
```

---

## 📄 License

Distributed under the **GNU GPL v3.0** License. See `LICENSE` for more information.

---

<div align="center">

**[Sajid Mahamud](https://github.com/sajidmahamud835)**

*TypeScript Engineer • Automation Specialist*

[🌐 Portfolio](https://sajidmahamud835.github.io/)

</div>
