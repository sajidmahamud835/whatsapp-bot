<div align="center">

# 🤖 WhatsApp Bot — Automated Communication Protocol

[![Node.js](https://img.shields.io/badge/Node.js-16+-green?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![WhatsApp-Web.js](https://img.shields.io/badge/Library-whatsapp--web.js-25D366?style=for-the-badge&logo=whatsapp)](https://wwebjs.dev/)
[![Docker](https://img.shields.io/badge/Deploy-Docker-2496ED?style=for-the-badge&logo=docker)](https://www.docker.com/)

**A programmable automation agent acting as a bridge between the WhatsApp network and external REST APIs.**

*Scalable • Event-Driven • Multi-Platform*

[Report Bug](https://github.com/sajidmahamud835/whatsapp-bot/issues) · [Request Feature](https://github.com/sajidmahamud835/whatsapp-bot/issues)

</div>

---

## 🔬 About The Project

**WhatsApp Bot** is an exploration into "Conversational Commerce" and notification automation. By reverse-engineering the WhatsApp Web protocol, this tool allows developers to programmatically interact with the messaging platform without official business API limitations (for research/testing purposes).

The core innovation is the **Webhook Bridge Pattern**, essentially turning a WhatsApp account into a dumb terminal that forwards all events to a sophisticated backend brain (like an AI model or a CRM) and blindly outputs the responses.

### 🎯 Key Implementations
1.  **Session Persistence**: Handling authentication state (QR code scanning) and restoring sessions across server restarts.
2.  **Universal Deployment**: Configured to run on varied environments: stateless serverless functions (Vercel) or stateful containers (Heroku, Linux/aaPanel).
3.  **Media Handling**: encoding and decoding base64 streams to send/receive images and documents programmatically.

---

## ⚙️ REST API Protocol

The bot operates by POSTing incoming message packets to your defined webhook and expecting a JSON response.

**Incoming Payload (Bot -> Your Server):**
```json
{
  "instanceid": "2",
  "body": "Hello",
  "from": "880171329xxxx@c.us"
  // ... metadata
}
```

**Expected Response (Your Server -> Bot):**
```json
{
  "reply": "Automatic Response",
  "replyMedia": "https://example.com/image.jpg"
}
```

---

## ✨ Features

### 🟢 Implemented Capabilities

- [x] **Auto-Reply**: Instant response based on external triggers.
- [x] **Media Support**: Send images/files via URL.
- [x] **Group Management**: Compatible with individual `@c.us` and group `@g.us` JIDs.
- [x] **Instance Management**: Init, Stop, Logout, and QR Scan endpoints.

### 🗓️ Research & Development Plan (Todo)

- [ ] **LLM Integration**: Connect the webhook to OpenAI to create a true "AI Assistant" on WhatsApp.
- [ ] **Multi-Device Support**: Update core library to support the latest WhatsApp Multi-Device (MD) Beta protocol.
- [ ] **Spam Protection**: Rate limiting middleware to prevent abuse.
- [ ] **Analytics**: Dashboard showing message volume and response latency.

---

## 🚀 Deployment Guide

### Option 1: Local Machine
1.  **Clone**: `git clone https://github.com/sajidmahamud835/whatsapp-bot.git`
2.  **Install**: `npm install`
3.  **Run**: `npm start`
4.  **Connect**: Scan QR code at `http://localhost:3000`.

### Option 2: Cloud Deployment (Heroku)
1.  **CLI**: Install Heroku CLI.
2.  **Create**: `heroku create` inside the repo.
3.  **Push**: `git push heroku master`.
4.  **Scale**: `heroku ps:scale web=1`.

### Option 3: VPS (aaPanel/Linux)
1.  Upload files to `/www/wwwroot/bot-folder`.
2.  Set `.env` port (e.g., `PORT=8585`).
3.  Run via Node Project manager or PM2.

*(Detailed guides for Vercel and aaPanel included in legacy docs)*

---

## 🤝 Related Projects

Explore other components of the research portfolio:

1.  **[MarketSync-EA](../MarketSync-EA)** - Use this bot to send trade execution alerts to your phone.
2.  **[InspectHealth](../inspecthealth)** - Send appointment reminders to patients.
3.  **[Banksync](../banksync)** - 2FA authentication delivery via WhatsApp.

---

## 📄 License

Distributed under the **GNU GPL v3.0** License. See `LICENSE` for more information.

---

<div align="center">

**[Sajid Mahamud](https://github.com/sajidmahamud835)**

*Automation Specialist • Backend Engineer*

</div>