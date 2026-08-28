import fs from 'node:fs';
import path from 'node:path';
import pc from 'picocolors';
import { pullFromVault, VaultProvider } from '../../core/vault/providers.js';

export interface PullCommandOptions {
  provider: VaultProvider;
  project?: string;
  config?: string;
  vaultSecretId?: string;
  output?: string;
  quiet?: boolean;
  execFn?: (cmd: string) => string;
}

export async function runPull(options: PullCommandOptions): Promise<number> {
  const cwd = process.cwd();
  const outPath = path.resolve(cwd, options.output || '.env');

  try {
    if (!options.quiet) {
      console.log(pc.cyan(`ℹ Pulling environment variables from ${options.provider}...`));
    }

    const result = pullFromVault({
      provider: options.provider,
      project: options.project,
      config: options.config,
      vaultSecretId: options.vaultSecretId,
      cwd,
      execFn: options.execFn
    });

    fs.writeFileSync(outPath, result.envRaw, 'utf8');

    if (!options.quiet) {
      console.log(
        pc.green(
          `✔ Successfully synced ${result.variablesCount} variable(s) from ${options.provider} into ${path.basename(outPath)}.`
        )
      );
    }
    return 0;
  } catch (err: any) {
    console.error(pc.red(`✖ ${err.message}`));
    return 1;
  }
}
