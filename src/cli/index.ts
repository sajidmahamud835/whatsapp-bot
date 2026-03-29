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

// Load config first
import { config } from '../core/config.js';
config.load();

const program = new Command();

program
  .name('wa-convo')
  .description('WA Convo — WhatsApp Automation Platform CLI')
  .version('4.0.0');

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
