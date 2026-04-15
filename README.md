<div align="center">

# WA Convo

### The Most Complete Open-Source WhatsApp Automation Platform

[![Node.js](https://img.shields.io/badge/Node.js-18+-green?style=flat-square&logo=node.js)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-GPL_3.0-red?style=flat-square)](./LICENSE)
[![Version](https://img.shields.io/badge/version-4.2.0-brightgreen?style=flat-square)](./CHANGELOG.md)
[![GitHub Stars](https://img.shields.io/github/stars/sajidmahamud835/whatsapp-bot?style=flat-square)](https://github.com/sajidmahamud835/whatsapp-bot/stargazers)

**Dashboard + Flow Builder + REST API + AI + CLI — All Free, All Open Source**

[Quick Start](#-quick-start) &bull; [Dashboard](#-dashboard) &bull; [Flow Builder](#-flow-builder) &bull; [API Docs](#-api-reference) &bull; [CLI Docs](#-cli-reference)

**Love this project? [Give it a star](https://github.com/sajidmahamud835/whatsapp-bot/stargazers)** — it helps more people discover it.

</div>

---

## What is WA Convo?

WA Convo is a **free, open-source WhatsApp automation platform** that gives you everything other tools charge hundreds for:

- **Dashboard UI** with dark/light theme — manage everything from your browser
- **Visual Flow Builder** — drag-and-drop chatbot builder with 12 node types
- **70+ REST API endpoints** — send messages, media, polls, reactions, and more
- **AI Auto-Reply** — plug in OpenAI, Claude, Gemini, or Ollama
- **Contact Manager** — tags, segments, bulk import/export
- **Broadcast Campaigns** — send to thousands with delivery tracking
- **Quick Reply Templates** — variable substitution, phone preview
- **Cron Scheduler** — recurring messages and broadcasts
- **Multi-Client** — control up to 6 WhatsApp accounts simultaneously
- **Full CLI** — everything the dashboard can do, from your terminal

---

## Why WA Convo?

| Feature | WA Convo | Others |
|---------|:--------:|:------:|
| Dashboard UI | **Yes (13 pages)** | Rarely |
| Visual chatbot flow builder | **Yes (drag & drop)** | No |
| Multi-client (6 accounts) | **Yes** | Rarely |
| Dual engine (Baileys + Meta API) | **Yes** | No |
| AI auto-reply (5 providers) | **Yes** | No |
| Contact manager with tags | **Yes** | No |
| Broadcast campaigns | **Yes** | No |
| Quick reply templates | **Yes** | No |
| Cron job scheduler | **Yes** | No |
| Multi-webhook with HMAC & retry | **Yes** | No |
| SQLite persistence | **Yes** | No |
| Full CLI tool (30+ commands) | **Yes** | No |
| Security (Zod, Helmet, HMAC) | **Yes** | Rarely |
| WebSocket real-time events | **Yes** | Some |
| 100% free & open source | **Yes** | No |

---

## Quick Start

```bash
git clone https://github.com/sajidmahamud835/whatsapp-bot.git
cd whatsapp-bot
npm install
npm run build
npm run build:dashboard   # Build the dashboard UI
npm start
```

Open **http://localhost:3000/dashboard** to access the dashboard.

### Connect WhatsApp

1. Open the Dashboard → **Clients** page
2. Click **Initialize** on Client 1
3. Scan the QR code with your phone (WhatsApp → Linked Devices → Link a Device)
4. Done — start sending messages!

### Send Your First Message

```bash
curl -X POST http://localhost:3000/1/send \
  -H "Content-Type: application/json" \
  -d '{"number": "YOUR_NUMBER", "message": "Hello from WA Convo!"}'
```

---

## Dashboard

A full-featured web dashboard with **13 pages**, dark/light theme, and real-time data.

| Page | What it does |
|------|-------------|
| **Dashboard** | KPI cards, message volume chart, client status, system metrics |
| **Clients** | Initialize, QR code (inline), logout, session health detection, one-click reset |
| **Messages** | WhatsApp-like chat UI — conversations, message bubbles, avatars, date separators |
| **Contacts** | Table with search, tags, edit, bulk import (CSV), export, bulk delete |
| **Templates** | Card grid, edit, preview (phone mockup), send to contact, variable substitution |
| **Campaigns** | Create, send with confirmation, delivery tracking per recipient |
| **Flow Builder** | Visual drag-and-drop chatbot builder (see below) |
| **Analytics** | Message volume charts, top contacts, period selector, CSV export |
| **Webhooks** | Register, test, delivery log |
| **Cron Jobs** | Create with schedule presets, run now (with confirmation), human-readable schedules |
| **AI Config** | Add/remove providers, model picker, test chat, system prompt editor, sliders |
| **Settings** | Inline config editor for every setting, reload config |

### Build the Dashboard

```bash
npm run build:dashboard   # Builds to dashboard/dist/
npm start                 # Serves dashboard at /dashboard
```

For development with hot reload:

```bash
npm run dev:dashboard     # Vite dev server on port 3001
```

---

## Flow Builder

Build chatbot flows visually — no coding required. Drag nodes, connect them, enable the flow.

### 12 Node Types

| Category | Nodes |
|----------|-------|
| **Triggers** | Message Received (keyword, exact match, starts with, regex) |
| **Actions** | Send Message, Send Media, Send Template, AI Reply |
| **Logic** | Condition (9 operators), Delay, Wait for Reply, End |
| **Data** | Set Variable, Add Tag, HTTP Request |

### How It Works

1. Go to **Flow Builder** in the dashboard
2. Click **New Flow** → give it a name and trigger type
3. Drag nodes from the palette onto the canvas
4. Connect nodes by dragging from output to input handles
5. Click a node to configure it (message text, conditions, variables)
6. **Save** and **Enable** the flow
7. When someone messages your WhatsApp with the trigger keyword, the flow executes automatically

### Built-in Flows (10 ready to use)

| Flow | What it does |
|------|-------------|
| Welcome Bot | Greets anyone who says hi/hello/hey |
| Auto-Reply (Away) | Away message when you're offline |
| AI Support Agent | AI answers questions + tags contact |
| Lead Capture | Multi-step: collects name → email → tags as lead |
| Feedback Collector | 1-5 rating → branches by score → tags accordingly |
| Urgent Router | Detects "urgent"/"emergency" → tags + priority response |
| Unsubscribe Handler | Opt-out with tag and confirmation |
| Re-subscribe Handler | Opt-in when user sends START |
| AI Chatbot | Conversational AI with wait-for-reply |
| Business Hours | Shows hours/location/contact info |

### Export & Import

Export flows as JSON files to share or backup. Import flows from JSON.

---

## Contact Manager

- **CRUD** — add, edit, delete contacts
- **Tags** — create tags, assign to contacts, filter by tag
- **Segments** — query contacts by tag combinations
- **Bulk Import** — paste CSV (phone,name) or upload file
- **CSV Export** — download all contacts
- **Bulk Delete** — checkbox selection + batch delete

---

## Broadcast Campaigns

- **Create** campaigns targeting phone number lists
- **Confirmation dialog** before sending (shows recipient count)
- **Per-recipient tracking** — sent, failed, pending
- **Delivery stats** — see results in the table

---

## Templates

- **Create** with categories (greeting, support, sales, notification)
- **Variable substitution** — `{{name}}`, `{{order_id}}`, `{{date}}`
- **Phone preview** — see how the message looks in a phone mockup
- **Send to contact** — fill variables and send directly
- **Duplicate** — copy templates quickly

### 5 Built-in Templates

Welcome Message, Order Confirmation, Appointment Reminder, Support Ticket, Follow Up

---

## AI Auto-Reply

Plug in any LLM provider. Supports:

| Provider | Config Type | Models |
|----------|-------------|--------|
| **OpenAI** | `openai` | GPT-4o, GPT-4o-mini |
| **Anthropic** | `anthropic` | Claude Sonnet 4.6, Haiku 4.5 |
| **Google** | `google` | Gemini 2.0 Flash, 1.5 Pro |
| **Ollama** | `ollama` | Llama 3.2, Mistral, Gemma |
| **OpenRouter** | `openrouter` | 100+ models |
| **Any OpenAI-compatible** | `openai` + `baseUrl` | Together, Groq, etc. |

Configure via Dashboard → **AI Config** page or CLI.

---

## CLI Reference

Everything the dashboard can do, from your terminal:

```
wa-convo --help
```

### Server & Monitoring
| Command | Description |
|---------|-------------|
| `wa-convo start` | Start the server |
| `wa-convo stop` | Stop the server |
| `wa-convo status` | Server & client status |
| `wa-convo stats` | Server metrics |
| `wa-convo analytics` | Analytics overview |
| `wa-convo logs [--follow]` | View/stream logs |

### Clients
| Command | Description |
|---------|-------------|
| `wa-convo client list` | List all clients |
| `wa-convo client init <id>` | Initialize client |
| `wa-convo client logout <id>` | Logout |
| `wa-convo client reset <id>` | Reset session (fixes encryption) |

### Messaging
| Command | Description |
|---------|-------------|
| `wa-convo send <cid> <number> <msg>` | Send message |
| `wa-convo messages conversations <cid>` | List conversations |
| `wa-convo messages history <cid> <jid>` | View chat history |

### Contacts
| Command | Description |
|---------|-------------|
| `wa-convo managed-contacts list` | List contacts |
| `wa-convo managed-contacts add <phone>` | Add contact |
| `wa-convo managed-contacts import <file>` | Import CSV |
| `wa-convo managed-contacts export <file>` | Export CSV |
| `wa-convo managed-contacts tags` | List tags |

### Templates & Campaigns
| Command | Description |
|---------|-------------|
| `wa-convo templates list` | List templates |
| `wa-convo templates send <name> <cid> <num>` | Send template |
| `wa-convo campaigns list` | List campaigns |
| `wa-convo campaigns create --name --message --numbers` | Create campaign |
| `wa-convo campaigns send <id>` | Send campaign |

### Flows
| Command | Description |
|---------|-------------|
| `wa-convo flows list` | List flows |
| `wa-convo flows enable <id>` | Enable flow |
| `wa-convo flows disable <id>` | Disable flow |
| `wa-convo flows test <id> <msg>` | Test flow |
| `wa-convo flows export <id>` | Export to JSON |
| `wa-convo flows import <file>` | Import from JSON |

### AI, Cron, Webhooks, Config
| Command | Description |
|---------|-------------|
| `wa-convo ai providers / test / enable / disable` | AI management |
| `wa-convo cron list / add / run <id> / delete <id>` | Cron jobs |
| `wa-convo webhooks list / add <url> / test <id>` | Webhooks |
| `wa-convo config get <key> / set <key> <val>` | Configuration |

---

## API Reference

> **70+ endpoints.** All require `Authorization: Bearer YOUR_API_KEY` (if set).

<details>
<summary><b>System</b></summary>

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | API info |
| `GET` | `/health` | Health check |
| `GET` | `/clients` | All clients |
| `GET` | `/stats` | Server metrics |
| `GET/PUT` | `/config/:path` | Config CRUD |
| `POST` | `/config/reload` | Reload config |

</details>

<details>
<summary><b>Client Management</b></summary>

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/:id/status` | Client status + health |
| `POST` | `/:id/init` | Initialize |
| `POST` | `/:id/logout` | Logout |
| `POST` | `/:id/reset` | Reset session |
| `GET` | `/:id/qr` | QR code page |

</details>

<details>
<summary><b>Messaging (15 endpoints)</b></summary>

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/:id/send` | Send text |
| `POST` | `/:id/sendMedia` | Send media |
| `POST` | `/:id/sendBulk` | Bulk send |
| `POST` | `/:id/messages/react` | Reaction |
| `POST` | `/:id/messages/poll` | Poll |
| `POST` | `/:id/messages/edit` | Edit |
| `POST` | `/:id/messages/delete` | Delete |
| `POST` | `/:id/messages/reply` | Reply |
| `POST` | `/:id/messages/forward` | Forward |
| `POST` | `/:id/messages/location` | Location |
| `POST` | `/:id/messages/contact` | vCard |
| `POST` | `/:id/messages/sticker` | Sticker |
| `POST` | `/:id/messages/voice` | Voice note |
| `GET` | `/:id/messages/recent` | Recent messages |
| `GET` | `/:id/messages/conversations` | Conversations |
| `GET` | `/:id/messages/conversation/:jid` | Chat history |

</details>

<details>
<summary><b>Groups (12 endpoints)</b></summary>

Create, join, list, metadata, invite, add/remove participants, promote/demote, update settings.

</details>

<details>
<summary><b>Contacts, Status, Presence, Privacy</b></summary>

Check registration, profile pics, about, business profiles, block/unblock, labels, text/image/video status, presence, disappearing messages, archive, pin, mute.

</details>

<details>
<summary><b>AI, Cron, Webhooks</b></summary>

| Endpoint | Methods |
|----------|---------|
| `/ai/providers` `/ai/test` `/ai/prompt` `/ai/config` | GET, POST, PUT |
| `/cron` `/cron/:id` `/cron/:id/run` | GET, POST, PUT, DELETE |
| `/webhooks` `/webhooks/:id` `/webhooks/:id/test` `/webhooks/:id/deliveries` | GET, POST, PUT, DELETE |

</details>

<details>
<summary><b>Contacts Manager, Templates, Campaigns, Flows, Analytics</b></summary>

| Endpoint | Methods |
|----------|---------|
| `/pro/contacts` `/pro/tags` `/pro/segments/query` | Full CRUD |
| `/pro/templates` `/pro/templates/:id/send` `/pro/templates/:id/preview` | Full CRUD + send |
| `/pro/campaigns` `/pro/campaigns/:id/send` | Full CRUD + send |
| `/pro/flows` `/pro/flows/:id/toggle` `/pro/flows/:id/test` `/pro/flows/import` `/pro/flows/:id/export` | Full CRUD + toggle + test + import/export |
| `/pro/analytics/overview` `/pro/analytics/messages` `/pro/analytics/conversations` `/pro/analytics/ai` `/pro/analytics/export` | GET |

</details>

---

## Configuration

**Config file:** `config/config.json` — edit via dashboard Settings page, CLI, or API.

All settings can be overridden with environment variables. See [.env.example](./.env.example).

---

## Onboarding

First-time users see a **6-step guided tour** that walks through:
1. Connect WhatsApp
2. Send Messages
3. Build Chatbot Flows
4. Enable AI
5. Track Analytics

Skippable and dismissable. Shows once per browser.

---

## Tech Stack

- **Backend:** Node.js + TypeScript + Express
- **Dashboard:** React 19 + Vite + Tailwind CSS + React Query + Recharts + ReactFlow
- **Database:** SQLite (better-sqlite3)
- **WhatsApp:** Baileys (WebSocket) + Meta Cloud API
- **AI:** OpenAI, Anthropic, Google Gemini, Ollama
- **Testing:** Jest + ts-jest + Supertest

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

1. Fork the repo
2. Create your feature branch
3. Run `npm run typecheck && npm test`
4. Submit a Pull Request

---

## Support

- **Report bugs:** [Create an issue](https://github.com/sajidmahamud835/whatsapp-bot/issues/new)
- **Request features:** [Create an issue](https://github.com/sajidmahamud835/whatsapp-bot/issues/new)
- **Questions:** [Discussions](https://github.com/sajidmahamud835/whatsapp-bot/discussions)

---

## License

GNU GPL v3.0 — See [LICENSE](./LICENSE) for details.

---

<div align="center">

**Built by [Sajid Mahamud](https://github.com/sajidmahamud835)**

If WA Convo saved you time, **[give it a star](https://github.com/sajidmahamud835/whatsapp-bot/stargazers)** — it means the world.

</div>
