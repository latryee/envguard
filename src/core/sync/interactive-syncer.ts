import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import pc from 'picocolors';
import { parseEnv, serializeEnv } from '../parser/env-parser.js';
import { generateSafePlaceholder } from './masker.js';
import { promptSelect, promptQuestion } from '../../cli/ui/prompt.js';
import { scanCodebase } from '../scanner/code-scanner.js';
import { computeEnvDiff } from '../diff/env-differ.js';
import { EnvVariable } from '../parser/types.js';

export interface InteractiveSyncOptions {
  cwd?: string;
  envFile?: string;
  exampleFile?: string;
  rlInstance?: readline.Interface;
}

export interface InteractiveSyncResult {
  addedToExample: string[];
  addedToEnv: string[];
  skipped: string[];
}

/**
 * Runs an interactive CLI wizard to sync missing variables into .env and .env.example
 */
export async function runInteractiveSync(
  options: InteractiveSyncOptions = {}
): Promise<InteractiveSyncResult> {
  const cwd = options.cwd ?? process.cwd();
  const envPath = path.resolve(cwd, options.envFile ?? '.env');
  const examplePath = path.resolve(cwd, options.exampleFile ?? '.env.example');

  const rl = options.rlInstance ?? readline.createInterface({ input, output });
  const shouldClose = !options.rlInstance;

  const result: InteractiveSyncResult = {
    addedToExample: [],
    addedToEnv: [],
    skipped: []
  };

  try {
    const envRaw = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
    const exampleRaw = fs.existsSync(examplePath) ? fs.readFileSync(examplePath, 'utf8') : '';

    const envAst = parseEnv(envRaw);
    const exampleAst = parseEnv(exampleRaw);

    const scanResult = await scanCodebase({ cwd });
    const diff = computeEnvDiff({
      envAst,
      exampleAst,
      codeKeys: scanResult.uniqueKeys,
      codeReferences: scanResult.keyLocations
    });

    const missingInExample = diff.missingInExample;
    const missingInEnv = diff.missingInEnv;

    console.log(pc.bold(`\n🧙 EnvGuard Interactive Sync Wizard`));
    console.log(pc.dim(`Reviewing environment drift and missing variables...\n`));

    // 1. Process variables missing in .env.example
    if (missingInExample.length > 0) {
      console.log(pc.cyan(`\n📋 Variables missing from .env.example (${missingInExample.length}):`));

      for (const item of missingInExample) {
        const key = item.key;
        const currentEnvVal = envAst.variables.get(key)?.value;
        const generated = generateSafePlaceholder(key, currentEnvVal);

        console.log(pc.bold(`\nVariable: ${pc.yellow(key)}`));
        if (generated.inferredType) {
          console.log(pc.dim(`  Inferred Type: ${generated.inferredType}`));
        }

        const choice = await promptSelect(
          `How should "${key}" be added to .env.example?`,
          [
            {
              label: `Use safe placeholder (${pc.green(generated.value)})`,
              value: 'placeholder',
              description: 'Auto-masked safe example'
            },
            {
              label: 'Enter custom example value',
              value: 'custom',
              description: 'Type your own template value'
            },
            {
              label: 'Mark as optional (@optional)',
              value: 'optional',
              description: 'Add placeholder with @optional tag'
            },
            {
              label: 'Skip this variable',
              value: 'skip',
              description: 'Do not add to .env.example'
            }
          ],
          0,
          rl
        );

        if (choice === 'skip') {
          result.skipped.push(key);
          continue;
        }

        let finalValue = generated.value;
        let finalType = generated.inferredType;
        let isOptional = false;

        if (choice === 'custom') {
          finalValue = await promptQuestion(`Enter example value for ${key}`, generated.value, rl);
        } else if (choice === 'optional') {
          isOptional = true;
        }

        const newVar: EnvVariable = {
          type: 'variable',
          key,
          value: finalValue,
          raw: `${key}=${finalValue}`,
          line: exampleAst.entries.length + 1,
          annotations: {
            type: finalType,
            required: !isOptional
          }
        };

        exampleAst.entries.push(newVar);
        exampleAst.variables.set(key, newVar);
        result.addedToExample.push(key);
      }
    }

    // 2. Process variables missing in .env (if .env is being maintained)
    if (missingInEnv.length > 0 && fs.existsSync(envPath)) {
      console.log(pc.cyan(`\n📋 Variables missing from .env (${missingInEnv.length}):`));

      for (const item of missingInEnv) {
        const key = item.key;
        const exampleVar = exampleAst.variables.get(key);
        const placeholder = exampleVar?.value || generateSafePlaceholder(key).value;

        console.log(pc.bold(`\nVariable: ${pc.red(key)} (Required in codebase)`));

        const choice = await promptSelect(
          `How should "${key}" be populated in your local .env?`,
          [
            {
              label: `Enter local secret/value now`,
              value: 'custom',
              description: 'Set your local environment value'
            },
            {
              label: `Use template placeholder (${pc.dim(placeholder)})`,
              value: 'placeholder',
              description: 'Populate with placeholder for later editing'
            },
            {
              label: 'Skip for now',
              value: 'skip',
              description: 'Do not add to .env'
            }
          ],
          0,
          rl
        );

        if (choice === 'skip') {
          result.skipped.push(key);
          continue;
        }

        let localVal = placeholder;
        if (choice === 'custom') {
          localVal = await promptQuestion(`Enter local value for ${key}`, '', rl);
        }

        const newVar: EnvVariable = {
          type: 'variable',
          key,
          value: localVal,
          raw: `${key}=${localVal}`,
          line: envAst.entries.length + 1,
          annotations: {}
        };

        envAst.entries.push(newVar);
        envAst.variables.set(key, newVar);
        result.addedToEnv.push(key);
      }
    }

    // Save updated files
    if (result.addedToExample.length > 0) {
      fs.writeFileSync(examplePath, serializeEnv(exampleAst), 'utf8');
      console.log(pc.green(`\n✔ Saved ${result.addedToExample.length} updated variable(s) to ${path.basename(examplePath)}`));
    }

    if (result.addedToEnv.length > 0 && fs.existsSync(envPath)) {
      fs.writeFileSync(envPath, serializeEnv(envAst), 'utf8');
      console.log(pc.green(`✔ Saved ${result.addedToEnv.length} updated variable(s) to ${path.basename(envPath)}`));
    }

    if (result.addedToExample.length === 0 && result.addedToEnv.length === 0) {
      console.log(pc.green(`\n✔ Everything is already in sync! No changes needed.`));
    }

    return result;
  } finally {
    if (shouldClose) {
      rl.close();
    }
  }
}
