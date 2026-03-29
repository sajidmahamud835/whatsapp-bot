import chalk from 'chalk';
import { apiRequest } from '../utils.js';

export async function aiProvidersCommand(): Promise<void> {
  try {
    const data = await apiRequest<any>('/ai/providers');
    console.log(chalk.cyan('\n🤖 AI Configuration\n'));
    console.log(chalk.gray('Enabled:          ') + (data.enabled ? chalk.green('yes') : chalk.red('no')));
    console.log(chalk.gray('Default Provider: ') + chalk.white(data.defaultProvider || '(none)'));
    console.log(chalk.gray('System Prompt:    ') + chalk.white(data.systemPrompt || '(not set)'));
    console.log(chalk.gray('Max Tokens:       ') + chalk.white(String(data.maxTokens)));
    console.log(chalk.gray('Temperature:      ') + chalk.white(String(data.temperature)));

    if (data.providers?.length > 0) {
      console.log(chalk.gray('\nAvailable Providers:'));
      for (const p of data.providers) {
        console.log(chalk.white(`  • ${p}`));
      }
    } else {
      console.log(chalk.yellow('\nNo providers configured.'));
      console.log(chalk.gray('Add providers to config/config.json under ai.providers'));
    }
    console.log();
  } catch (err: unknown) {
    console.error(chalk.red('✗ Failed to fetch AI providers:'), err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

export async function aiTestCommand(message: string, provider?: string): Promise<void> {
  try {
    console.log(chalk.gray(`Sending test message${provider ? ` via ${provider}` : ''}...`));

    const body: Record<string, string> = { message };
    if (provider) body.provider = provider;

    const data = await apiRequest<any>('/ai/test', 'POST', body);
    console.log(chalk.cyan('\n🤖 AI Response:\n'));
    console.log(chalk.white(data.response));
    console.log();
  } catch (err: unknown) {
    console.error(chalk.red('✗ AI test failed:'), err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

export async function aiPromptCommand(prompt: string): Promise<void> {
  try {
    await apiRequest<any>('/ai/prompt', 'PUT', { prompt });
    console.log(chalk.green('✓ System prompt updated'));
  } catch (err: unknown) {
    console.error(chalk.red('✗ Failed to update prompt:'), err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

export async function aiEnableCommand(enabled: boolean): Promise<void> {
  try {
    await apiRequest<any>('/ai/config', 'PUT', { enabled });
    console.log(chalk.green(`✓ AI ${enabled ? 'enabled' : 'disabled'}`));
  } catch (err: unknown) {
    console.error(chalk.red('✗ Failed:'), err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}
