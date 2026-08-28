import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  detectFramework,
  loadCascadingEnv,
  exportEnv,
  encryptEnv,
  decryptEnv,
  runInteractiveSync,
  renderPrCommentReport,
  renderSarifReport,
  parseEnv
} from '../src/index.js';
import { runVsCode } from '../src/cli/commands/vscode.js';
import { runSync } from '../src/cli/commands/sync.js';
import { runExport } from '../src/cli/commands/export.js';
import { EventEmitter } from 'node:events';

function createMockReadline(answers: string[]): any {
  const emitter = new EventEmitter() as any;
  let index = 0;
  emitter.question = async () => answers[index++] ?? '';
  emitter.close = () => {};
  return emitter;
}

describe('Deep Branch Coverage Suite', () => {
  it('covers all framework detections: Nuxt, Astro, SvelteKit, NestJS, Django, FastAPI', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envguard-all-fw-'));
    try {
      // Nuxt
      fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({ dependencies: { nuxt: '^3.0.0' } }));
      expect(detectFramework(tempDir).name).toBe('nuxt');

      // Astro
      fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({ dependencies: { astro: '^4.0.0' } }));
      expect(detectFramework(tempDir).name).toBe('astro');

      // SvelteKit
      fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({ dependencies: { '@sveltejs/kit': '^2.0.0' } }));
      expect(detectFramework(tempDir).name).toBe('sveltekit');

      // NestJS
      fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({ dependencies: { '@nestjs/core': '^10.0.0' } }));
      expect(detectFramework(tempDir).name).toBe('nestjs');

      // Django (manage.py)
      fs.unlinkSync(path.join(tempDir, 'package.json'));
      fs.writeFileSync(path.join(tempDir, 'manage.py'), '#!/usr/bin/env python');
      expect(detectFramework(tempDir).name).toBe('django');

      // FastAPI (requirements.txt with fastapi)
      fs.unlinkSync(path.join(tempDir, 'manage.py'));
      fs.writeFileSync(path.join(tempDir, 'requirements.txt'), 'fastapi>=0.100.0\nuvicorn');
      expect(detectFramework(tempDir).name).toBe('fastapi');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('covers full cascade loading with .env.development.local and .env.development', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envguard-cascade-deep-'));
    try {
      fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({ dependencies: { next: '14.0.0' } }));
      fs.writeFileSync(path.join(tempDir, '.env'), 'A=base\nB=base\nC=base\nD=base\n');
      fs.writeFileSync(path.join(tempDir, '.env.local'), 'B=local\n');
      fs.writeFileSync(path.join(tempDir, '.env.development'), 'C=dev\n');
      fs.writeFileSync(path.join(tempDir, '.env.development.local'), 'D=devlocal\n');

      const cascade = loadCascadingEnv(tempDir, 'development');
      expect(cascade.mergedVariables.get('A')?.value).toBe('base');
      expect(cascade.mergedVariables.get('B')?.value).toBe('local');
      expect(cascade.mergedVariables.get('C')?.value).toBe('dev');
      expect(cascade.mergedVariables.get('D')?.value).toBe('devlocal');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('covers crypto scrypt passphrase derivation and error validations', () => {
    const passphrase = 'my-secret-human-passphrase';
    const plaintext = 'HELLO=world\n';
    const encrypted = encryptEnv(plaintext, passphrase);
    expect(decryptEnv(encrypted, passphrase)).toBe(plaintext);

    // Empty key checks
    expect(() => encryptEnv(plaintext, '')).toThrowError('Encryption key is required.');
    expect(() => decryptEnv(encrypted, '')).toThrowError('Decryption key is required.');

    // Malformed envelope
    expect(() => decryptEnv('NOT_VALID_FORMAT', passphrase)).toThrowError('Invalid or unsupported');
    expect(() => decryptEnv('ENVGUARD_ENC_V1:part1:part2', passphrase)).toThrowError('Corrupted encrypted envelope.');
  });

  it('covers interactive syncer custom values, optional tags, and missing in env', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envguard-syncer-deep-'));
    try {
      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });

      fs.writeFileSync(path.join(srcDir, 'app.ts'), 'const a = process.env.VAR_CUSTOM; const b = process.env.VAR_OPTIONAL; const c = process.env.VAR_IN_CODE_ONLY;\n');
      fs.writeFileSync(path.join(tempDir, '.env'), 'VAR_CUSTOM=my_custom_secret\nVAR_OPTIONAL=opt_val\n');
      fs.writeFileSync(path.join(tempDir, '.env.example'), '');

      // Answers:
      // For VAR_CUSTOM missing in example: option 2 (custom value) -> 'custom_example_123'
      // For VAR_OPTIONAL missing in example: option 3 (optional)
      // For VAR_IN_CODE_ONLY missing in env: option 1 (custom local val) -> 'local_secret_val'
      const mockRl = createMockReadline([
        '2',
        'custom_example_123',
        '3',
        '1',
        'local_secret_val'
      ]);

      const res = await runInteractiveSync({ cwd: tempDir, rlInstance: mockRl });
      expect(res.addedToExample).toContain('VAR_CUSTOM');
      expect(res.addedToExample).toContain('VAR_OPTIONAL');
      expect(res.addedToEnv).toContain('VAR_IN_CODE_ONLY');

      // Test everything in sync branch
      const resSynced = await runInteractiveSync({ cwd: tempDir, rlInstance: createMockReadline([]) });
      expect(resSynced.addedToExample).toHaveLength(0);
      expect(resSynced.addedToEnv).toHaveLength(0);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('covers runVsCode with existing settings.json and custom example path', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envguard-vscode-merge-'));
    const oldCwd = process.cwd();
    try {
      process.chdir(tempDir);
      const vscodeDir = path.join(tempDir, '.vscode');
      fs.mkdirSync(vscodeDir, { recursive: true });
      fs.writeFileSync(
        path.join(vscodeDir, 'settings.json'),
        JSON.stringify({ 'editor.tabSize': 2 })
      );
      fs.writeFileSync(path.join(tempDir, '.env.template'), 'PORT=3000\n');

      const exitCode = await runVsCode({ example: '.env.template', quiet: false });
      expect(exitCode).toBe(0);

      const merged = JSON.parse(fs.readFileSync(path.join(vscodeDir, 'settings.json'), 'utf8'));
      expect(merged['editor.tabSize']).toBe(2);
      expect(merged['explorer.fileNesting.enabled']).toBe(true);
    } finally {
      process.chdir(oldCwd);
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('covers runExport stdout printing and runSync prune / error handling', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envguard-export-sync-cov-'));
    const oldCwd = process.cwd();
    try {
      process.chdir(tempDir);
      fs.writeFileSync(path.join(tempDir, '.env'), 'FLOAT_VAL=3.14\nBOOL_VAL=false\n');
      fs.writeFileSync(path.join(tempDir, '.env.example'), 'OBSOLETE_ONE=1\n');

      // Export stdout branch
      const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
      const exitExportStdout = await runExport({ envFile: '.env', format: 'terraform', quiet: false });
      expect(exitExportStdout).toBe(0);
      expect(writeSpy).toHaveBeenCalled();
      writeSpy.mockRestore();

      // Export each format
      const ast = parseEnv('PORT=80\nDEBUG=true\nPI=3.14\nNAME=app\n');
      expect(exportEnv(ast, 'docker-compose')).toContain('services:');
      expect(exportEnv(ast, 'helm')).toContain('env:');
      expect(exportEnv(ast, 'terraform')).toContain('pi = 3.14');
      expect(exportEnv(ast, 'unknown' as any)).toContain('"PORT": "80"');

      // Run sync prune
      const exitSyncPrune = await runSync({ prune: true, quiet: false });
      expect(exitSyncPrune).toBe(0);
    } finally {
      process.chdir(oldCwd);
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('covers SARIF and PR comment reports with full diagnostics', () => {
    const sarif = renderSarifReport({
      missingInEnv: [{ key: 'DB_PASS', required: true, source: 'code' }],
      missingInExample: [],
      staleInExample: [{ key: 'OLD_VAR', line: 5, raw: 'OLD_VAR=1', type: 'variable', value: '1', annotations: {} }],
      typeMismatches: [{ key: 'PORT', expectedType: 'port', value: 'invalid_port', message: 'Not a port' }],
      secretLeaks: [{
        ruleId: 'secret-rule-1',
        ruleName: 'Test Rule',
        category: 'ai_api_key',
        severity: 'critical',
        description: 'Hardcoded key',
        remediation: 'Rotate key',
        file: 'src/index.ts',
        line: 12,
        snippetMasked: 'sk-a...7890',
        confidence: 95,
        confidenceLevel: 'HIGH'
      }]
    });

    expect(sarif).toContain('https://json.schemastore.org/sarif-2.1.0.json');
    expect(sarif).toContain('DB_PASS');
    expect(sarif).toContain('Test Rule');

    const prReport = renderPrCommentReport({
      missingInEnv: [],
      missingInExample: [],
      staleInExample: [{ key: 'STALE_KEY', line: 10, raw: '', type: 'variable', value: '', annotations: {} }],
      typeMismatches: [],
      secretLeaks: []
    });
    expect(prReport).toContain('Passed with Warnings');
    expect(prReport).toContain('STALE_KEY');
  });
});
