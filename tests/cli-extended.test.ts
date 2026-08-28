import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';
import { runCheck } from '../src/cli/commands/check.js';
import { runSync } from '../src/cli/commands/sync.js';
import { runGenTypes } from '../src/cli/commands/gen-types.js';
import { runHookInstall } from '../src/cli/commands/hook.js';
import { findWorkspaces } from '../src/core/monorepo/workspaces.js';
import { installPreCommitHook } from '../src/core/git/hooks.js';

describe('Extended CLI Commands & Workspaces Coverage', () => {
  it('runs check with --workspaces in monorepo environment', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envguard-cli-ws-'));
    const oldCwd = process.cwd();
    try {
      // Root package.json
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'root', workspaces: ['packages/*'] }, null, 2)
      );

      // Package A
      const pkgADir = path.join(tempDir, 'packages', 'pkg-a');
      fs.mkdirSync(pkgADir, { recursive: true });
      fs.writeFileSync(path.join(pkgADir, 'package.json'), JSON.stringify({ name: 'pkg-a' }));
      fs.writeFileSync(path.join(pkgADir, '.env'), 'PORT=3000\n');
      fs.writeFileSync(path.join(pkgADir, '.env.example'), '# @type port\nPORT=3000\n');

      process.chdir(tempDir);

      const exitCode = await runCheck({ workspaces: true, quiet: true, format: 'json' });
      expect(exitCode).toBe(0);

      const exitCodeSarif = await runCheck({ workspaces: true, quiet: true, format: 'sarif' });
      expect(exitCodeSarif).toBe(0);

      const exitCodeGithub = await runCheck({ workspaces: true, quiet: true, format: 'github' });
      expect(exitCodeGithub).toBe(0);

      const exitCodeTerminal = await runCheck({ workspaces: true, quiet: false, format: 'terminal' });
      expect(exitCodeTerminal).toBe(0);
    } finally {
      process.chdir(oldCwd);
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('runs check with --scan-history in git repository', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envguard-cli-hist-'));
    const oldCwd = process.cwd();
    try {
      execSync('git init', { cwd: tempDir, stdio: 'pipe' });
      execSync('git config user.name "Test"', { cwd: tempDir, stdio: 'pipe' });
      execSync('git config user.email "test@test.com"', { cwd: tempDir, stdio: 'pipe' });

      fs.writeFileSync(path.join(tempDir, 'app.ts'), 'const x = 1;\n');
      execSync('git add app.ts', { cwd: tempDir, stdio: 'pipe' });
      execSync('git commit -m "initial"', { cwd: tempDir, stdio: 'pipe' });

      process.chdir(tempDir);
      const exitCode = await runCheck({ scanHistory: true, quiet: true, format: 'sarif' });
      expect(exitCode).toBe(0);
    } finally {
      process.chdir(oldCwd);
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('runs sync with --prune option', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envguard-cli-sync-prune-'));
    const oldCwd = process.cwd();
    try {
      fs.writeFileSync(path.join(tempDir, '.env'), 'ACTIVE_VAR=hello\n');
      fs.writeFileSync(path.join(tempDir, '.env.example'), 'ACTIVE_VAR=hello\nOBSOLETE_VAR=old\n');

      process.chdir(tempDir);
      const exitCode = await runSync({ prune: true, quiet: false });
      expect(exitCode).toBe(0);

      const updated = fs.readFileSync(path.join(tempDir, '.env.example'), 'utf8');
      expect(updated).not.toContain('OBSOLETE_VAR');
    } finally {
      process.chdir(oldCwd);
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('runs gen-types CLI command', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envguard-cli-gentypes-'));
    const oldCwd = process.cwd();
    try {
      fs.writeFileSync(path.join(tempDir, '.env'), 'PORT=3000\nNODE_ENV=production\n');
      fs.writeFileSync(path.join(tempDir, '.env.example'), '# @type port\nPORT=3000\n');

      process.chdir(tempDir);
      const exitCode = await runGenTypes({ quiet: false, output: 'env.d.ts' });
      expect(exitCode).toBe(0);
      expect(fs.existsSync(path.join(tempDir, 'env.d.ts'))).toBe(true);
    } finally {
      process.chdir(oldCwd);
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('handles pnpm-workspace.yaml in findWorkspaces', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envguard-pnpm-ws-'));
    try {
      fs.writeFileSync(
        path.join(tempDir, 'pnpm-workspace.yaml'),
        `packages:\n  - 'apps/*'\n  - 'libs/*'\n`
      );

      const appDir = path.join(tempDir, 'apps', 'web');
      fs.mkdirSync(appDir, { recursive: true });
      fs.writeFileSync(path.join(appDir, 'package.json'), JSON.stringify({ name: 'pnpm-web' }));

      const workspaces = await findWorkspaces(tempDir);
      expect(workspaces.length).toBe(1);
      expect(workspaces[0].name).toBe('pnpm-web');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('handles fallback packages discovery when no workspace field exists', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envguard-fallback-ws-'));
    try {
      const pkgDir = path.join(tempDir, 'packages', 'subpkg');
      fs.mkdirSync(pkgDir, { recursive: true });
      fs.writeFileSync(path.join(pkgDir, 'package.json'), JSON.stringify({ name: 'subpkg' }));

      const workspaces = await findWorkspaces(tempDir);
      expect(workspaces.length).toBe(1);
      expect(workspaces[0].name).toBe('subpkg');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('installs pre-commit hook in native git and husky structures', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envguard-hook-test-'));
    try {
      execSync('git init', { cwd: tempDir, stdio: 'pipe' });

      // Native git hook
      const result = installPreCommitHook(tempDir);
      expect(result.success).toBe(true);
      expect(result.hookType).toBe('git-native');
      expect(fs.existsSync(result.hookPath)).toBe(true);

      // Re-install (already installed)
      const reinstall = installPreCommitHook(tempDir);
      expect(reinstall.success).toBe(true);

      // Husky structure
      const huskyDir = path.join(tempDir, '.husky');
      fs.mkdirSync(huskyDir, { recursive: true });
      const huskyResult = installPreCommitHook(tempDir);
      expect(huskyResult.success).toBe(true);
      expect(huskyResult.hookType).toBe('husky');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
