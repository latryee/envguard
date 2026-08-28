import fs from 'node:fs';
import path from 'node:path';
import pc from 'picocolors';
import { compareEnvFiles } from '../../core/diff/file-differ.js';

export interface DiffCommandOptions {
  unmask?: boolean;
  quiet?: boolean;
}

export async function runFileDiff(
  fileA: string,
  fileB: string,
  options: DiffCommandOptions = {}
): Promise<number> {
  const cwd = process.cwd();
  const pathA = path.resolve(cwd, fileA);
  const pathB = path.resolve(cwd, fileB);

  if (!fs.existsSync(pathA)) {
    console.error(pc.red(`✖ Base file "${fileA}" does not exist.`));
    return 1;
  }
  if (!fs.existsSync(pathB)) {
    console.error(pc.red(`✖ Comparison file "${fileB}" does not exist.`));
    return 1;
  }

  const contentA = fs.readFileSync(pathA, 'utf8');
  const contentB = fs.readFileSync(pathB, 'utf8');

  const diff = compareEnvFiles(contentA, contentB, path.basename(fileA), path.basename(fileB));

  if (!options.quiet) {
    console.log(pc.bold(`\n📊 Environment Diff: ${pc.cyan(diff.fileA)} ↔ ${pc.cyan(diff.fileB)}\n`));

    if (!diff.hasDifferences) {
      console.log(pc.green(`✔ Files are identical! No drift found (${diff.identical.length} matching variables).`));
      return 0;
    }

    // Removed in B
    if (diff.removed.length > 0) {
      console.log(pc.red(`[-] Unique to ${diff.fileA} (Missing in ${diff.fileB}) [${diff.removed.length}]:`));
      for (const item of diff.removed) {
        const val = options.unmask ? item.valueA : item.maskedValueA;
        console.log(`  ${pc.red('-')} ${pc.bold(item.key)} = ${pc.dim(val || '')}`);
      }
      console.log('');
    }

    // Added in B
    if (diff.added.length > 0) {
      console.log(pc.green(`[+] Unique to ${diff.fileB} (New) [${diff.added.length}]:`));
      for (const item of diff.added) {
        const val = options.unmask ? item.valueB : item.maskedValueB;
        console.log(`  ${pc.green('+')} ${pc.bold(item.key)} = ${pc.dim(val || '')}`);
      }
      console.log('');
    }

    // Changed values
    if (diff.changed.length > 0) {
      console.log(pc.yellow(`[~] Value Differences [${diff.changed.length}]:`));
      for (const item of diff.changed) {
        const valA = options.unmask ? item.valueA : item.maskedValueA;
        const valB = options.unmask ? item.valueB : item.maskedValueB;
        console.log(`  ${pc.yellow('~')} ${pc.bold(item.key)}:`);
        console.log(`      ${pc.dim(diff.fileA + ':')} ${valA}`);
        console.log(`      ${pc.dim(diff.fileB + ':')} ${valB}`);
      }
      console.log('');
    }

    console.log(pc.dim(`Identical variables: ${diff.identical.length}`));
  }

  return diff.hasDifferences ? 1 : 0;
}
