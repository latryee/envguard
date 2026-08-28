import fs from 'node:fs';
import path from 'node:path';
import pc from 'picocolors';
import { formatEnv } from '../../core/formatter/env-formatter.js';

export interface FmtCommandOptions {
  sort?: 'alphabetical' | 'prefix';
  quoteStyle?: 'as-needed' | 'always-double' | 'always-single';
  check?: boolean;
  quiet?: boolean;
}

export async function runFmt(
  files: string[],
  options: FmtCommandOptions = {}
): Promise<number> {
  const cwd = process.cwd();
  const targetFiles = files.length > 0 ? files : ['.env', '.env.example'];

  let anyChanged = false;
  let formattedCount = 0;

  for (const file of targetFiles) {
    const filePath = path.resolve(cwd, file);
    if (!fs.existsSync(filePath)) {
      continue;
    }

    const original = fs.readFileSync(filePath, 'utf8');
    const formatted = formatEnv(original, {
      sort: options.sort,
      quoteStyle: options.quoteStyle
    });

    if (original !== formatted) {
      anyChanged = true;
      if (options.check) {
        if (!options.quiet) {
          console.log(`${pc.red('✖')} ${pc.bold(file)} is not formatted.`);
        }
      } else {
        fs.writeFileSync(filePath, formatted, 'utf8');
        formattedCount++;
        if (!options.quiet) {
          console.log(`${pc.green('✔')} Formatted ${pc.bold(file)}`);
        }
      }
    } else {
      if (!options.quiet && options.check) {
        console.log(`${pc.green('✔')} ${pc.bold(file)} is already well-formatted.`);
      }
    }
  }

  if (options.check) {
    if (anyChanged) {
      if (!options.quiet) {
        console.log(pc.yellow(`\nRun "npx envguard fmt" to fix formatting issues.`));
      }
      return 1;
    }
    return 0;
  }

  if (formattedCount === 0 && !options.quiet) {
    console.log(pc.green(`✔ All environment files are already properly formatted!`));
  }

  return 0;
}
