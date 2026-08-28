import { Command } from 'commander';
import { runCheck } from './commands/check.js';
import { runSync } from './commands/sync.js';
import { runGenTypes } from './commands/gen-types.js';
import { runHookInstall } from './commands/hook.js';
import { runInit } from './commands/init.js';
import { runExport } from './commands/export.js';
import { runPull } from './commands/pull.js';
import { runVsCode } from './commands/vscode.js';
import { runFileDiff } from './commands/diff.js';
import { runFmt } from './commands/fmt.js';
import { runEncrypt } from './commands/encrypt.js';
import { runDecrypt } from './commands/decrypt.js';
import { runCompletion } from './commands/completion.js';

const program = new Command();

program
  .name('envguard')
  .description('Zero-Config Git Secret Leaks, Multi-Language AST Scanner & Environment Guard')
  .version('1.2.0');

// Default / Check command
program
  .command('check', { isDefault: true })
  .description('Scan project code and validate .env against .env.example (default action)')
  .option('-e, --env <path>', 'Path to actual .env file (default: .env)')
  .option('-x, --example <path>', 'Path to .env.example template (default: .env.example)')
  .option('-s, --strict', 'Exit with error code 1 even on warnings')
  .option('--staged', 'Only scan Git staged files')
  .option('-P, --paranoid', 'Show all secret findings including medium-confidence heuristics')
  .option('--scan-history', 'Scan past Git commit diffs for hardcoded secret leaks')
  .option('-w, --workspaces', 'Scan all packages in a monorepo workspace')
  .option('-f, --format <format>', 'Output format: terminal, json, github, sarif, pr-comment, summary', 'terminal')
  .option('-q, --quiet', 'Suppress unnecessary terminal output')
  .option('-v, --verbose', 'Show detailed debug and reference locations')
  .option('--no-banner', 'Hide ASCII banner')
  .action(async (options) => {
    try {
      const exitCode = await runCheck(options);
      process.exit(exitCode);
    } catch (err: any) {
      console.error(`\n✖ Fatal error: ${err?.message || err}\n`);
      process.exit(1);
    }
  });

// Diff / Compare command
program
  .command('diff')
  .alias('compare')
  .description('Compare differences and drift between two environment files')
  .argument('<fileA>', 'Base environment file (e.g. .env.staging)')
  .argument('<fileB>', 'Comparison environment file (e.g. .env.production)')
  .option('-u, --unmask', 'Show raw unmasked values (caution: reveals secrets)')
  .option('-q, --quiet', 'Suppress output')
  .action(async (fileA, fileB, options) => {
    try {
      const exitCode = await runFileDiff(fileA, fileB, options);
      process.exit(exitCode);
    } catch (err: any) {
      console.error(`\n✖ Fatal error: ${err?.message || err}\n`);
      process.exit(1);
    }
  });

// Fmt / Format command
program
  .command('fmt')
  .alias('format')
  .description('Auto-format, normalize quotes, and organize .env and .env.example files')
  .argument('[files...]', 'Target environment files to format (default: .env, .env.example)')
  .option('-s, --sort <mode>', 'Sort mode: alphabetical, prefix')
  .option('--quote-style <style>', 'Quote style: as-needed, always-double, always-single', 'as-needed')
  .option('-c, --check', 'Check if files are formatted without writing changes')
  .option('-q, --quiet', 'Suppress output')
  .action(async (files, options) => {
    try {
      const exitCode = await runFmt(files, options);
      process.exit(exitCode);
    } catch (err: any) {
      console.error(`\n✖ Fatal error: ${err?.message || err}\n`);
      process.exit(1);
    }
  });

// Encrypt command
program
  .command('encrypt')
  .description('Encrypt environment file using zero-cloud AES-256-GCM')
  .argument('[file]', 'Environment file to encrypt (default: .env)', '.env')
  .option('-k, --key <key>', 'Encryption key (or ENVGUARD_KEY env variable)')
  .option('-o, --output <path>', 'Output encrypted file path (default: <file>.enc)')
  .option('-q, --quiet', 'Suppress output')
  .action(async (file, options) => {
    try {
      const exitCode = await runEncrypt(file, options);
      process.exit(exitCode);
    } catch (err: any) {
      console.error(`\n✖ Fatal error: ${err?.message || err}\n`);
      process.exit(1);
    }
  });

// Decrypt command
program
  .command('decrypt')
  .description('Decrypt AES-256-GCM encrypted environment file')
  .argument('[file]', 'Encrypted file to decrypt (default: .env.enc)', '.env.enc')
  .option('-k, --key <key>', 'Decryption key (or ENVGUARD_KEY env variable)')
  .option('-o, --output <path>', 'Output decrypted file path (default: .env)')
  .option('-q, --quiet', 'Suppress output')
  .action(async (file, options) => {
    try {
      const exitCode = await runDecrypt(file, options);
      process.exit(exitCode);
    } catch (err: any) {
      console.error(`\n✖ Fatal error: ${err?.message || err}\n`);
      process.exit(1);
    }
  });

// Sync / Fix command
program
  .command('sync')
  .alias('fix')
  .description('Synchronize .env.example with missing variables and safe placeholders')
  .option('-e, --env <path>', 'Path to actual .env file (default: .env)')
  .option('-x, --example <path>', 'Path to .env.example template (default: .env.example)')
  .option('-i, --interactive', 'Run interactive prompt wizard for missing variables')
  .option('-p, --prune', 'Remove stale/unused variables from .env.example')
  .option('-q, --quiet', 'Suppress output')
  .action(async (options) => {
    try {
      const exitCode = await runSync(options);
      process.exit(exitCode);
    } catch (err: any) {
      console.error(`\n✖ Fatal error: ${err?.message || err}\n`);
      process.exit(1);
    }
  });

// Export command
program
  .command('export')
  .description('Export environment variables to Kubernetes Secret, Docker Compose, Terraform, Helm, or JSON')
  .option('-e, --env <path>', 'Path to .env file (default: .env)')
  .option('-f, --format <format>', 'Target format: k8s-secret, docker-compose, terraform, helm, json, json-schema', 'json')
  .option('-o, --output <path>', 'Output file path (default: stdout)')
  .option('--name <name>', 'Secret / Service name identifier')
  .option('--namespace <ns>', 'Kubernetes namespace (default: default)')
  .option('-q, --quiet', 'Suppress logs')
  .action(async (options) => {
    try {
      const exitCode = await runExport(options);
      process.exit(exitCode);
    } catch (err: any) {
      console.error(`\n✖ Fatal error: ${err?.message || err}\n`);
      process.exit(1);
    }
  });

// Pull command
program
  .command('pull')
  .description('Pull environment secrets from Cloud Secret Managers (Doppler, Infisical, AWS, 1Password, Vault)')
  .requiredOption('-p, --provider <provider>', 'Provider: doppler, infisical, 1password, aws, vault')
  .option('--project <project>', 'Project name / identifier')
  .option('--config <config>', 'Environment config name (e.g. dev, stg, prd)')
  .option('--vault-secret-id <id>', 'Vault Secret ID / ARN')
  .option('-o, --output <path>', 'Output file path (default: .env)')
  .option('-q, --quiet', 'Suppress output')
  .action(async (options) => {
    try {
      const exitCode = await runPull(options as any);
      process.exit(exitCode);
    } catch (err: any) {
      console.error(`\n✖ Fatal error: ${err?.message || err}\n`);
      process.exit(1);
    }
  });

// VS Code command
program
  .command('vscode')
  .description('Configure VS Code file nesting, schema mapping, and syntax associations')
  .option('-x, --example <path>', 'Path to .env.example template', '.env.example')
  .option('-q, --quiet', 'Suppress output')
  .action(async (options) => {
    try {
      const exitCode = await runVsCode(options);
      process.exit(exitCode);
    } catch (err: any) {
      console.error(`\n✖ Fatal error: ${err?.message || err}\n`);
      process.exit(1);
    }
  });

// Completion command
program
  .command('completion')
  .description('Generate shell autocompletion script (bash, zsh, fish, powershell)')
  .option('--shell <shell>', 'Target shell: bash, zsh, fish, powershell', 'bash')
  .action((options) => {
    try {
      const exitCode = runCompletion(options);
      process.exit(exitCode);
    } catch (err: any) {
      console.error(`\n✖ Fatal error: ${err?.message || err}\n`);
      process.exit(1);
    }
  });

// Gen-types command
program
  .command('gen-types')
  .alias('types')
  .description('Generate TypeScript ambient declarations (env.d.ts) for process.env')
  .option('-e, --env <path>', 'Path to .env file')
  .option('-x, --example <path>', 'Path to .env.example file')
  .option('-o, --output <path>', 'Output path for d.ts file (default: env.d.ts)')
  .option('-q, --quiet', 'Suppress output')
  .action(async (options) => {
    try {
      const exitCode = await runGenTypes(options);
      process.exit(exitCode);
    } catch (err: any) {
      console.error(`\n✖ Fatal error: ${err?.message || err}\n`);
      process.exit(1);
    }
  });

// Git Hook command
program
  .command('hook')
  .description('Manage Git pre-commit hooks')
  .argument('[action]', 'Action: install', 'install')
  .action((action) => {
    try {
      if (action === 'install') {
        const exitCode = runHookInstall();
        process.exit(exitCode);
      } else {
        console.error(`Unknown hook action: ${action}. Use "install".`);
        process.exit(1);
      }
    } catch (err: any) {
      console.error(`\n✖ Fatal error: ${err?.message || err}\n`);
      process.exit(1);
    }
  });

// Init command
program
  .command('init')
  .description('One-click onboarding: setup template, sync, generate types, and install git hook')
  .action(async () => {
    try {
      const exitCode = await runInit();
      process.exit(exitCode);
    } catch (err: any) {
      console.error(`\n✖ Fatal error: ${err?.message || err}\n`);
      process.exit(1);
    }
  });

program.parse(process.argv);
