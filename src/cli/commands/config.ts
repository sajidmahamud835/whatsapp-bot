import { spawn } from 'child_process';
import { config } from '../../core/config.js';
import { success, error, printJson, color, info } from '../utils.js';

export function configGetCommand(key: string): void {
  config.load();
  const value = config.get(key);
  if (value === undefined) {
    error(`Config key '${key}' not found`);
    process.exit(1);
  }
  if (typeof value === 'object') {
    printJson(value);
  } else {
    console.log(String(value));
  }
}

export function configSetCommand(key: string, value: string): void {
  config.load();

  // Parse value: try JSON first, then string
  let parsed: unknown = value;
  try {
    parsed = JSON.parse(value);
  } catch {
    // Keep as string
  }

  config.set(key, parsed);
  success(`Set ${color.cyan(key)} = ${JSON.stringify(parsed)}`);
}

export function configEditCommand(): void {
  config.load();
  const editor = process.env['EDITOR'] ?? process.env['VISUAL'] ?? (process.platform === 'win32' ? 'notepad' : 'nano');
  const configPath = config.getConfigPath();

  info(`Opening ${configPath} in ${editor}...`);

  const proc = spawn(editor, [configPath], {
    stdio: 'inherit',
    shell: true,
  });

  proc.on('error', (err) => {
    error(`Failed to open editor: ${err.message}`);
    info(`Config file: ${configPath}`);
    process.exit(1);
  });

  proc.on('exit', (code) => {
    if (code === 0) {
      success('Config saved');
    } else {
      error(`Editor exited with code ${code}`);
    }
  });
}
