# Contributing to WA Convo

Thanks for your interest in contributing! Here's how to get started.

## Development Setup

```bash
git clone https://github.com/sajidmahamud835/whatsapp-bot.git
cd whatsapp-bot
npm install
npm run dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Compile TypeScript to dist/ |
| `npm start` | Run production build |
| `npm run typecheck` | Type check without emitting |
| `npm test` | Run tests |

## Project Structure

- `src/core/` — Business logic (client manager, config, events, AI, DB, webhooks, cron)
- `src/api/` — Express routes, middleware, schemas, WebSocket
- `src/cli/` — CLI tool commands
- `src/utils/` — Shared utilities
- `tests/` — Unit and integration tests

## Guidelines

- **TypeScript strict mode** — no `any` unless unavoidable
- **Zod validation** — all POST/PUT routes must validate request bodies
- **No inline styles** — this is a backend project, not a UI
- **Test what you build** — add tests for new features
- **Commit messages** — use conventional commits (`feat:`, `fix:`, `docs:`)

## Pull Request Process

1. Fork and create a feature branch
2. Make your changes
3. Run `npm run typecheck && npm test`
4. Submit a PR with a clear description

## Reporting Bugs

Open an issue at https://github.com/sajidmahamud835/whatsapp-bot/issues with:
- Steps to reproduce
- Expected vs actual behavior
- Node.js version and OS
