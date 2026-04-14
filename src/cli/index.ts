#!/usr/bin/env node
import 'dotenv/config';
import { Command } from 'commander';
import { startCommand } from './commands/start.js';
import { stopCommand } from './commands/stop.js';
import { statusCommand } from './commands/status.js';
import {
  clientListCommand,
  clientInitCommand,
  clientQrCommand,
  clientLogoutCommand,
} from './commands/client.js';
import { sendCommand } from './commands/send.js';
import {
  configGetCommand,
  configSetCommand,
  configEditCommand,
} from './commands/config.js';
import { contactsListCommand, contactsCheckCommand } from './commands/contacts.js';
import { groupsListCommand, groupsCreateCommand } from './commands/groups.js';
import { logsCommand } from './commands/logs.js';
import {
  aiProvidersCommand,
  aiTestCommand,
  aiPromptCommand,
  aiEnableCommand,
} from './commands/ai.js';
import {
  cronListCommand,
  cronRunCommand,
  cronDeleteCommand,
  cronAddCommand,
} from './commands/cron.js';
import {
  webhooksListCommand,
  webhooksAddCommand,
  webhooksRemoveCommand,
  webhooksTestCommand,
} from './commands/webhooks.js';
import { statsCommand } from './commands/stats.js';

// Load config first
import { config } from '../core/config.js';
config.load();

const program = new Command();

program
  .name('wa-convo')
  .description('WA Convo — WhatsApp Automation Platform CLI')
  .version('4.2.0');

// ─── start ────────────────────────────────────────────────────────────────────

program
  .command('start')
  .description('Start the WA Convo API server')
  .option('--headless', 'Run in headless mode (API only)')
  .option('-p, --port <port>', 'Override server port')
  .action(async (options: { headless?: boolean; port?: string }) => {
    await startCommand(options);
  });

// ─── stop ─────────────────────────────────────────────────────────────────────

program
  .command('stop')
  .description('Stop the running server')
  .action(async () => {
    await stopCommand();
  });

// ─── status ───────────────────────────────────────────────────────────────────

program
  .command('status')
  .description('Show server status and connected clients')
  .action(async () => {
    await statusCommand();
  });

// ─── client ───────────────────────────────────────────────────────────────────

const clientCmd = program
  .command('client')
  .description('Manage WhatsApp clients');

clientCmd
  .command('list')
  .description('List all clients and their status')
  .action(async () => {
    await clientListCommand();
  });

clientCmd
  .command('init <id>')
  .description('Initialize a client (starts connection + QR)')
  .action(async (id: string) => {
    await clientInitCommand(id);
  });

clientCmd
  .command('qr <id>')
  .description('Fetch and display QR code for a client')
  .action(async (id: string) => {
    await clientQrCommand(id);
  });

clientCmd
  .command('logout <id>')
  .description('Logout a client from WhatsApp')
  .action(async (id: string) => {
    await clientLogoutCommand(id);
  });

// ─── send ─────────────────────────────────────────────────────────────────────

program
  .command('send <clientId> <number> <message>')
  .description('Send a WhatsApp message')
  .action(async (clientId: string, number: string, message: string) => {
    await sendCommand(clientId, number, message);
  });

// ─── config ───────────────────────────────────────────────────────────────────

const configCmd = program
  .command('config')
  .description('Manage WA Convo configuration');

configCmd
  .command('get <key>')
  .description('Get a config value (dot notation, e.g. server.port)')
  .action((key: string) => {
    configGetCommand(key);
  });

configCmd
  .command('set <key> <value>')
  .description('Set a config value (e.g. server.port 3001)')
  .action((key: string, value: string) => {
    configSetCommand(key, value);
  });

configCmd
  .command('edit')
  .description('Open config file in $EDITOR')
  .action(() => {
    configEditCommand();
  });

// ─── contacts ─────────────────────────────────────────────────────────────────

const contactsCmd = program
  .command('contacts')
  .description('Manage contacts');

contactsCmd
  .command('list <clientId>')
  .description('List contacts for a client')
  .action(async (clientId: string) => {
    await contactsListCommand(clientId);
  });

contactsCmd
  .command('check <clientId> <number>')
  .description('Check if a number is on WhatsApp')
  .action(async (clientId: string, number: string) => {
    await contactsCheckCommand(clientId, number);
  });

// ─── groups ───────────────────────────────────────────────────────────────────

const groupsCmd = program
  .command('groups')
  .description('Manage WhatsApp groups');

groupsCmd
  .command('list <clientId>')
  .description('List all groups for a client')
  .action(async (clientId: string) => {
    await groupsListCommand(clientId);
  });

groupsCmd
  .command('create <clientId> <name> [participants...]')
  .description('Create a new group')
  .action(async (clientId: string, name: string, participants: string[]) => {
    await groupsCreateCommand(clientId, name, participants);
  });

// ─── ai ───────────────────────────────────────────────────────────────────────

const aiCmd = program
  .command('ai')
  .description('Manage AI auto-reply integration');

aiCmd
  .command('providers')
  .description('Show configured AI providers and settings')
  .action(async () => {
    await aiProvidersCommand();
  });

aiCmd
  .command('test <message>')
  .description('Send a test message to the AI')
  .option('-p, --provider <name>', 'Use specific provider')
  .action(async (message: string, options: { provider?: string }) => {
    await aiTestCommand(message, options.provider);
  });

aiCmd
  .command('prompt <prompt>')
  .description('Update the AI system prompt')
  .action(async (prompt: string) => {
    await aiPromptCommand(prompt);
  });

aiCmd
  .command('enable')
  .description('Enable AI auto-reply')
  .action(async () => {
    await aiEnableCommand(true);
  });

aiCmd
  .command('disable')
  .description('Disable AI auto-reply')
  .action(async () => {
    await aiEnableCommand(false);
  });

// ─── cron ─────────────────────────────────────────────────────────────────────

const cronCmd = program
  .command('cron')
  .description('Manage scheduled cron jobs');

cronCmd
  .command('list')
  .description('List all cron jobs')
  .action(async () => {
    await cronListCommand();
  });

cronCmd
  .command('add')
  .description('Create a new cron job (interactive)')
  .option('--name <name>', 'Job name')
  .option('--schedule <schedule>', 'Cron schedule (e.g. "0 9 * * *")')
  .option('--client <clientId>', 'Client ID')
  .option('--action <action>', 'Action (sendMessage|broadcast|postStatus)')
  .option('--params <json>', 'JSON params for the action')
  .action(async (options: { name?: string; schedule?: string; client?: string; action?: string; params?: string }) => {
    await cronAddCommand({
      name: options.name,
      schedule: options.schedule,
      clientId: options.client,
      action: options.action,
      params: options.params,
    });
  });

cronCmd
  .command('run <id>')
  .description('Run a cron job immediately')
  .action(async (id: string) => {
    await cronRunCommand(id);
  });

cronCmd
  .command('delete <id>')
  .description('Delete a cron job')
  .action(async (id: string) => {
    await cronDeleteCommand(id);
  });

// ─── webhooks ────────────────────────────────────────────────────────────────

const webhooksCmd = program
  .command('webhooks')
  .description('Manage webhook registrations');

webhooksCmd
  .command('list')
  .description('List all registered webhooks')
  .action(async () => {
    await webhooksListCommand();
  });

webhooksCmd
  .command('add <url>')
  .description('Register a new webhook')
  .option('-e, --events <events>', 'Comma-separated events (default: *)')
  .option('-s, --secret <secret>', 'HMAC signing secret')
  .action(async (url: string, options: { events?: string; secret?: string }) => {
    await webhooksAddCommand(url, options);
  });

webhooksCmd
  .command('remove <id>')
  .description('Remove a registered webhook')
  .action(async (id: string) => {
    await webhooksRemoveCommand(id);
  });

webhooksCmd
  .command('test <id>')
  .description('Send a test payload to a webhook')
  .action(async (id: string) => {
    await webhooksTestCommand(id);
  });

// ─── stats ───────────────────────────────────────────────────────────────────

program
  .command('stats')
  .description('Show server stats and metrics')
  .action(async () => {
    await statsCommand();
  });

// ─── logs ─────────────────────────────────────────────────────────────────────

program
  .command('logs')
  .description('View and stream server logs')
  .option('--level <level>', 'Filter by log level (trace|debug|info|warn|error)', 'info')
  .option('--since <duration>', 'Show logs since (e.g. 1h, 30m, 7d)')
  .option('--follow', 'Stream logs in real-time')
  .option('-n, --lines <n>', 'Number of lines to show', '50')
  .action(async (options: { level?: string; since?: string; follow?: boolean; lines?: string }) => {
    await logsCommand(options);
  });

// ─── Parse ────────────────────────────────────────────────────────────────────

program.parse(process.argv);

// Show help if no command
if (process.argv.length < 3) {
  program.help();
}
