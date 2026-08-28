import fs from 'node:fs';
import path from 'node:path';
import pc from 'picocolors';
import { decryptEnv } from '../../core/crypto/env-crypto.js';

export interface DecryptCommandOptions {
  key?: string;
  output?: string;
  quiet?: boolean;
}

export async function runDecrypt(
  filePath: string,
  options: DecryptCommandOptions = {}
): Promise<number> {
  const cwd = process.cwd();
  const targetFile = filePath || '.env.enc';
  const resolvedPath = path.resolve(cwd, targetFile);

  if (!fs.existsSync(resolvedPath)) {
    console.error(pc.red(`✖ Encrypted file "${targetFile}" does not exist.`));
    return 1;
  }

  const key = options.key || process.env.ENVGUARD_KEY;
  if (!key) {
    console.error(pc.red(`✖ Decryption key not provided. Set ENVGUARD_KEY environment variable or pass --key.`));
    return 1;
  }

  try {
    const encrypted = fs.readFileSync(resolvedPath, 'utf8');
    const decrypted = decryptEnv(encrypted, key);

    const defaultOut = targetFile.endsWith('.enc') ? targetFile.slice(0, -4) : '.env';
    const outPath = path.resolve(cwd, options.output || defaultOut);

    fs.writeFileSync(outPath, decrypted, 'utf8');

    if (!options.quiet) {
      console.log(pc.bold(pc.green(`\n🔓 Decrypted ${pc.cyan(targetFile)} → ${pc.cyan(path.basename(outPath))}\n`)));
    }
    return 0;
  } catch (err: any) {
    console.error(pc.red(`\n✖ ${err.message}\n`));
    return 1;
  }
}
