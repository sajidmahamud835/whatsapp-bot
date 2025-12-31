# WhatsApp Bot Project

This project is a WhatsApp bot built using Node.js, Express, and `whatsapp-web.js`. It allows for automated messaging and interactions via WhatsApp Web.

## Prerequisites

- **Node.js**: Version 18.x or higher is recommended.
- **npm**: Version 9.x or higher.
- **Chromium/Chrome**: Required by Puppeteer (handled automatically by `puppeteer-chromium-resolver`).

## Installation

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

## Running the Application

### Development
To run the application in development mode with auto-reload:
```bash
npm run dev
```

### Production
To start the application:
```bash
npm start
```

## Usage

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

## Changelog

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
