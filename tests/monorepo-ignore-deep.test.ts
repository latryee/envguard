import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  findWorkspaces,
  loadEnvguardIgnore,
  parseInlineDirectives,
  isFindingIgnored,
  installPreCommitHook
} from '../src/index.js';

describe('Monorepo Workspaces & Ignore Engine Deep Coverage', () => {
  it('detects pnpm, yarn/npm, and lerna workspaces', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envguard-ws-deep-'));
    try {
      // 1. pnpm-workspace.yaml
      fs.writeFileSync(
        path.join(tempDir, 'pnpm-workspace.yaml'),
        "packages:\n  - 'apps/*'\n  - 'packages/*'\n"
      );

      const appDir = path.join(tempDir, 'apps', 'web');
      fs.mkdirSync(appDir, { recursive: true });
      fs.writeFileSync(
        path.join(appDir, 'package.json'),
        JSON.stringify({ name: '@my/web' })
      );

      const pnpmWs = await findWorkspaces(tempDir);
      expect(pnpmWs.length).toBeGreaterThan(0);
      expect(pnpmWs[0].name).toBe('@my/web');

      // 2. package.json with workspaces array
      fs.unlinkSync(path.join(tempDir, 'pnpm-workspace.yaml'));
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ workspaces: ['apps/*'] })
      );

      const npmWs = await findWorkspaces(tempDir);
      expect(npmWs.length).toBeGreaterThan(0);
      expect(npmWs[0].name).toBe('@my/web');

      // 3. package.json with workspaces object { packages: [...] }
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ workspaces: { packages: ['apps/*'] } })
      );
      const yarnWs = await findWorkspaces(tempDir);
      expect(yarnWs.length).toBeGreaterThan(0);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('covers .envguardignore file loading and inline comment directives', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envguard-ignore-deep-'));
    try {
      // .envguardignore loading
      fs.writeFileSync(
        path.join(tempDir, '.envguardignore'),
        '# Comment\nignored-dir/**\n*.tmp\nkey:MY_SECRET\nrule:rule-1\n'
      );
      const ignoreConfig = loadEnvguardIgnore(tempDir);
      expect(ignoreConfig.globPatterns).toContain('ignored-dir/**');
      expect(ignoreConfig.globPatterns).toContain('*.tmp');
      expect(ignoreConfig.ignoredKeys.has('MY_SECRET')).toBe(true);
      expect(ignoreConfig.ignoredRules.has('rule-1')).toBe(true);

      // Inline directives
      const content = `
const key = "sk-ant-sample"; // envguard-disable-line
const secret = "ghp_1234567890abcdef1234567890abcdef123456"; // envguard-disable-line secret-github-pat
/* envguard-disable */
const blockSecret = "SG.12345678901234567890123456789012";
/* envguard-enable */
`;
      const directives = parseInlineDirectives(content);
      expect(directives.ignoredLines.has(2)).toBe(true);

      expect(isFindingIgnored(2, 'any-rule', undefined, directives)).toBe(true);
      expect(isFindingIgnored(3, 'secret-github-pat', undefined, directives)).toBe(true);
      expect(isFindingIgnored(3, 'other-rule', undefined, directives)).toBe(false);
      expect(isFindingIgnored(5, 'any-rule', undefined, directives)).toBe(true);
      expect(isFindingIgnored(7, 'any-rule', undefined, directives)).toBe(false);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('installs pre-commit hook in non-git directory returning error status', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envguard-hook-nongit-'));
    try {
      const res = installPreCommitHook(tempDir);
      expect(res.success).toBe(false);
      expect(res.message).toContain('Not a Git repository');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
