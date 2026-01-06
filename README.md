<div align="center">

# 🤖 WhatsApp Bot — Automated Communication Protocol

[![Node.js](https://img.shields.io/badge/Node.js-18+-green?style=for-the-badge&logo=node.js)](https://nodejs.org/)
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

### Prerequisites

- **Node.js**: Version 18.x or higher is recommended.
- **npm**: Version 9.x or higher.
- **Chromium/Chrome**: Required by Puppeteer (handled automatically by `puppeteer-chromium-resolver`).

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd whatsapp-bot
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Environment Variables:
   - Ensure a `.env` file exists in the root directory.
   - Example content:
     ```
     PORT=8585
     POST_API=https://your-api-url.com/webhook.php
     KEY=YOUR_SECRET_KEY
     ```

### Running the Application

#### Development
To run the application in development mode with auto-reload:
```bash
npm run dev
```

#### Production
To start the application:
```bash
npm start
```

### Usage

1. Start the server.
2. The application will initialize 6 WhatsApp clients by default.
3. Access `http://localhost:8585/<client_id>/qr` (e.g., `http://localhost:8585/1/qr`) to view the QR code for authentication.
4. Scan the QR code with your WhatsApp mobile app.
5. Once authenticated, you can use the API endpoints to send messages.

### API Endpoints

- `GET /<client_id>`: Check client status.
- `GET /<client_id>/init`: Initialize the client.
- `GET /<client_id>/qr`: Get QR code for login.
- `GET /<client_id>/logout`: Logout the client.
- `POST /<client_id>/send`: Send a text message.
  - Body: `{ "number": "1234567890@c.us", "message": "Hello" }`
- `POST /<client_id>/sendMedia`: Send a media message.
  - Body: `{ "number": "...", "mediaUrl": "...", "caption": "..." }`

---

## 🧪 Testing

This project uses `jest`, `supertest` and mocks for robust automated testing without physical devices.

### Running Tests

Execute the full test suite with:

```bash
npm test
```

### Test Reports

A detailed HTML report is automatically generated at `test-report.html` after each run. This file includes:
-   **Execution Time**: Performance metrics for each test.
-   **Status**: Visual indicators for passed/failed tests.
-   **Coverage**: (If configured) Code coverage validation.

The testing architecture mocks `whatsapp-web.js` to simulate:
-   Client initialization and authentication.
-   Message transmission via API.
-   Incoming message event handling and auto-replies.

---

## 📜 Changelog

### Project Resurrection (Current)
- **Dependency Updates**:
  - Upgraded `express` to v5.2.1.
  - Upgraded `whatsapp-web.js` to v1.34.2.
  - Upgraded `puppeteer-chromium-resolver` to v24.0.3.
  - Upgraded `nodemon` to v3.1.11.
  - Upgraded `dotenv`, `cors`, `qrcode`, `axios` to latest versions.
  - Removed unused dependencies (`mysql`, `fs`).
- **Code Refactoring**:
  - Modernized `app.js` (replaced `var` with `const`/`let`).
  - Improved route definitions to prevent memory leaks and dynamic route creation issues.
  - Fixed `puppeteer-chromium-resolver` initialization (async/await).
  - Ensured compatibility with latest `whatsapp-web.js` (`LocalAuth`).
- **Security**:
  - Audited and fixed high-severity vulnerabilities in dependencies.

---

## 📄 License

Distributed under the **GNU GPL v3.0** License. See `LICENSE` for more information.

---

<div align="center">

**[Sajid Mahamud](https://github.com/sajidmahamud835)**

*Automation Specialist • Backend Engineer*

[🌐 Visit Portfolio](https://sajidmahamud835.github.io/)

</div>
