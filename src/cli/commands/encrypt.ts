import fs from 'node:fs';
import path from 'node:path';
import pc from 'picocolors';
import { encryptEnv, generateEncryptionKey } from '../../core/crypto/env-crypto.js';

export interface EncryptCommandOptions {
  key?: string;
  output?: string;
  quiet?: boolean;
}

export async function runEncrypt(
  filePath: string,
  options: EncryptCommandOptions = {}
): Promise<number> {
  const cwd = process.cwd();
  const targetFile = filePath || '.env';
  const resolvedPath = path.resolve(cwd, targetFile);

  if (!fs.existsSync(resolvedPath)) {
    console.error(pc.red(`✖ File "${targetFile}" does not exist.`));
    return 1;
  }

  const raw = fs.readFileSync(resolvedPath, 'utf8');
  let key = options.key || process.env.ENVGUARD_KEY;
  let generatedNewKey = false;

  if (!key) {
    key = generateEncryptionKey();
    generatedNewKey = true;
  }

  const encrypted = encryptEnv(raw, key);
  const outPath = path.resolve(cwd, options.output || `${targetFile}.enc`);

  fs.writeFileSync(outPath, encrypted, 'utf8');

  if (!options.quiet) {
    console.log(pc.bold(pc.green(`\n🔒 Encrypted ${pc.cyan(targetFile)} → ${pc.cyan(path.basename(outPath))}`)));
    if (generatedNewKey) {
      console.log(pc.yellow(`\n🔑 Generated Encryption Key:`));
      console.log(pc.bold(pc.magenta(`   ${key}`)));
      console.log(pc.dim(`\n⚠️  Keep this key safe! Store it in your CI/CD secrets as ENVGUARD_KEY.`));
      console.log(pc.dim(`   You can now safely commit ${path.basename(outPath)} to Git.\n`));
    }
  }

  return 0;
}
