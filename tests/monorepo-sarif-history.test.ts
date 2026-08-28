import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';
import {
  findWorkspaces,
  renderSarifReport,
  scanGitHistory,
  computeEnvDiff,
  parseEnv
} from '../src/index.js';

describe('Monorepo Workspaces, SARIF Report & Git History Scanning', () => {
  it('discovers monorepo workspaces via package.json workspaces array', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envguard-test-monorepo-'));
    try {
      const rootPkg = {
        name: 'my-monorepo',
        workspaces: ['packages/*', 'apps/*']
      };
      fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify(rootPkg, null, 2));

      // Create packages/web
      const webDir = path.join(tempDir, 'packages', 'web');
      fs.mkdirSync(webDir, { recursive: true });
      fs.writeFileSync(path.join(webDir, 'package.json'), JSON.stringify({ name: '@monorepo/web' }));
      fs.writeFileSync(path.join(webDir, '.env'), 'VITE_API=http://localhost:3000\n');
      fs.writeFileSync(path.join(webDir, '.env.example'), 'VITE_API=http://localhost:3000\n');

      // Create apps/api
      const apiDir = path.join(tempDir, 'apps', 'api');
      fs.mkdirSync(apiDir, { recursive: true });
      fs.writeFileSync(path.join(apiDir, 'package.json'), JSON.stringify({ name: '@monorepo/api' }));
      fs.writeFileSync(path.join(apiDir, '.env'), 'PORT=8080\n');

      const workspaces = await findWorkspaces(tempDir);
      expect(workspaces.length).toBe(2);

      const names = workspaces.map((w) => w.name);
      expect(names).toContain('@monorepo/web');
      expect(names).toContain('@monorepo/api');

      const webWs = workspaces.find((w) => w.name === '@monorepo/web');
      expect(webWs?.hasEnv).toBe(true);
      expect(webWs?.hasExample).toBe(true);

      const apiWs = workspaces.find((w) => w.name === '@monorepo/api');
      expect(apiWs?.hasEnv).toBe(true);
      expect(apiWs?.hasExample).toBe(false);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('renders valid SARIF 2.1.0 JSON report with secret findings and type errors', () => {
    const secretVal = ['sk-ant-', 'api03-abcdef1234567890abcdef1234567890abcdef1234567890'].join('');
    const envAst = parseEnv(`PORT=invalid_port\nAPI_KEY=${secretVal}\n`);
    const exampleAst = parseEnv('# @type port\nPORT=3000\n# @type string\nAPI_KEY=your_key\n# @type string\nMISSING_REQUIRED=val\n');

    const diff = computeEnvDiff({
      envAst,
      exampleAst,
      codeKeys: new Set(['PORT', 'API_KEY', 'MISSING_REQUIRED', 'UNDOCUMENTED_VAR'])
    });

    const sarifJson = renderSarifReport(diff);
    expect(sarifJson).toBeDefined();

    const parsed = JSON.parse(sarifJson);
    expect(parsed.version).toBe('2.1.0');
    expect(parsed.$schema).toContain('sarif-2.1.0.json');
    expect(parsed.runs.length).toBe(1);
    expect(parsed.runs[0].tool.driver.name).toBe('envguard');
    expect(parsed.runs[0].results.length).toBeGreaterThan(0);

    const ruleIds = parsed.runs[0].results.map((r: any) => r.ruleId);
    expect(ruleIds).toContain('anthropic-api-key');
    expect(ruleIds).toContain('env-type-mismatch');
  });

  it('scans past Git commit history diffs for committed secret leaks', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envguard-test-githistory-'));
    try {
      execSync('git init', { cwd: tempDir, stdio: 'pipe' });
      execSync('git config user.name "Test User"', { cwd: tempDir, stdio: 'pipe' });
      execSync('git config user.email "test@example.com"', { cwd: tempDir, stdio: 'pipe' });

      // Commit 1: Introduce a secret leak
      const secretVal = ['sk-ant-', 'api03-abcdef1234567890abcdef1234567890abcdef1234567890'].join('');
      const secretFile = path.join(tempDir, 'credentials.ts');
      fs.writeFileSync(secretFile, `export const key = "${secretVal}";\n`);
      execSync('git add credentials.ts', { cwd: tempDir, stdio: 'pipe' });
      execSync('git commit -m "Add leaked credential"', { cwd: tempDir, stdio: 'pipe' });

      // Commit 2: Remove secret
      fs.writeFileSync(secretFile, 'export const key = process.env.API_KEY;\n');
      execSync('git add credentials.ts', { cwd: tempDir, stdio: 'pipe' });
      execSync('git commit -m "Fix credential by reading from env"', { cwd: tempDir, stdio: 'pipe' });

      // History scan should detect the leak in commit 1
      const findings = scanGitHistory({ cwd: tempDir });
      expect(findings.length).toBeGreaterThan(0);
      expect(findings[0].ruleId).toBe('anthropic-api-key');
      expect(findings[0].commitHash).toBeDefined();
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
