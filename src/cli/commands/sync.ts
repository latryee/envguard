import pc from 'picocolors';
import { scanCodebase } from '../../core/scanner/code-scanner.js';
import { syncEnvExample } from '../../core/sync/env-syncer.js';
import { runInteractiveSync } from '../../core/sync/interactive-syncer.js';
import { loadConfig } from '../../core/config/config-loader.js';

export interface SyncCommandOptions {
  env?: string;
  example?: string;
  prune?: boolean;
  interactive?: boolean;
  quiet?: boolean;
}

export async function runSync(options: SyncCommandOptions = {}): Promise<number> {
  const cwd = process.cwd();
  const config = loadConfig(cwd);

  const envPath = options.env || config.envFile;
  const examplePath = options.example || config.exampleFile;

  // Interactive mode
  if (options.interactive) {
    await runInteractiveSync({
      cwd,
      envFile: envPath,
      exampleFile: examplePath
    });
    return 0;
  }

  // Standard sync
  const scanResult = await scanCodebase({ cwd });

  const result = syncEnvExample({
    cwd,
    envPath,
    examplePath,
    prune: options.prune,
    codeKeys: scanResult.uniqueKeys
  });

  if (!options.quiet) {
    if (result.isNewFile) {
      console.log(`${pc.green('✔')} Created new ${pc.bold(examplePath)} with ${result.addedKeys.length} variable(s).`);
    } else {
      if (result.addedKeys.length === 0 && result.prunedKeys.length === 0) {
        console.log(`${pc.green('✔')} ${pc.bold(examplePath)} is already up to date!`);
      } else {
        if (result.addedKeys.length > 0) {
          console.log(`${pc.green('✔')} Added ${result.addedKeys.length} missing variable(s) to ${pc.bold(examplePath)}:`);
          for (const key of result.addedKeys) {
            console.log(`  ${pc.green('+')} ${pc.bold(key)}`);
          }
        }
        if (result.prunedKeys.length > 0) {
          console.log(`${pc.yellow('✔')} Pruned ${result.prunedKeys.length} obsolete variable(s) from ${pc.bold(examplePath)}:`);
          for (const key of result.prunedKeys) {
            console.log(`  ${pc.red('-')} ${key}`);
          }
        }
      }
    }
  }

  return 0;
}
