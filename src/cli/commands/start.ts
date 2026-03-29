import { spawn } from 'child_process';
import { resolve, dirname } from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { warn, color } from '../utils.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface StartOptions {
  headless?: boolean;
  port?: string;
}

export async function startCommand(options: StartOptions): Promise<void> {
  console.log(`\n${color.bold('WA Convo')} — WhatsApp Automation Platform`);
  console.log(color.dim('Starting server...\n'));

  const serverPath = resolve(__dirname, '..', '..', '..', 'dist', 'api', 'server.js');
  const tsPath = resolve(__dirname, '..', '..', 'api', 'server.ts');

  const env = { ...process.env };
  if (options.port) {
    env['PORT'] = options.port;
  }
  if (options.headless) {
    warn('Running in headless mode (API only, no dashboard)');
    env['HEADLESS'] = 'true';
  }

  // Try compiled dist first, fall back to ts-node
  const useCompiled = existsSync(serverPath);

  let proc;
  if (useCompiled) {
    proc = spawn('node', [serverPath], {
      env,
      stdio: 'inherit',
      shell: true,
    });
  } else {
    // Try ts-node-dev for dev mode
    proc = spawn('npx', ['ts-node-dev', '--respawn', '--transpile-only', '--esm', tsPath], {
      env,
      stdio: 'inherit',
      shell: true,
    });
  }

  proc.on('error', (err) => {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  });

  proc.on('exit', (code) => {
    if (code !== 0) {
      console.error(`Server exited with code ${code}`);
      process.exit(code ?? 1);
    }
  });

  // Forward signals
  process.on('SIGINT', () => proc.kill('SIGINT'));
  process.on('SIGTERM', () => proc.kill('SIGTERM'));

}
