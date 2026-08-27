import fs from 'node:fs';
import path from 'node:path';
import pc from 'picocolors';
import { runSync } from './sync.js';
import { runGenTypes } from './gen-types.js';
import { runHookInstall } from './hook.js';
import { isGitRepository } from '../../core/git/git-utils.js';

export async function runInit(): Promise<number> {
  const cwd = process.cwd();
  console.log(pc.bold(pc.cyan('\n🚀 Initializing EnvGuard for your repository...\n')));

  // 1. Check/create .env if not exists
  const envPath = path.join(cwd, '.env');
  const examplePath = path.join(cwd, '.env.example');

  if (!fs.existsSync(envPath) && !fs.existsSync(examplePath)) {
    console.log(`${pc.blue('ℹ')} Creating initial .env.example template...`);
    fs.writeFileSync(
      examplePath,
      `# Application Environment Configuration\nPORT=3000 # @type port\nNODE_ENV=development\nDATABASE_URL=postgresql://postgres:postgres@localhost:5432/mydb # @type url\n`,
      'utf8'
    );
  }

  // 2. Sync .env.example
  console.log(`${pc.blue('ℹ')} Synchronizing environment variables...`);
  await runSync({ quiet: false });

  // 3. Generate TypeScript declarations if TS project detected
  const isTsProject = fs.existsSync(path.join(cwd, 'tsconfig.json'));
  if (isTsProject) {
    console.log(`${pc.blue('ℹ')} Detected TypeScript project. Generating env.d.ts...`);
    await runGenTypes({ quiet: false });
  }

  // 4. Install Git hook if in Git repo
  if (isGitRepository(cwd)) {
    console.log(`${pc.blue('ℹ')} Setting up Git pre-commit hook...`);
    runHookInstall();
  }

  console.log(`\n${pc.bold(pc.green('✨ EnvGuard initialized successfully!'))}`);
  console.log(`${pc.dim('Run')} ${pc.cyan('npx envguard')} ${pc.dim('anytime to validate your environment health.')}\n`);

  return 0;
}
