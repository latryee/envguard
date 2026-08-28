import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { runFileDiff } from '../src/cli/commands/diff.js';
import { runEncrypt } from '../src/cli/commands/encrypt.js';
import { runDecrypt } from '../src/cli/commands/decrypt.js';
import { runFmt } from '../src/cli/commands/fmt.js';
import { auditDockerFiles } from '../src/core/docker/docker-guard.js';
import { loadEnv } from '../src/runtime/loader.js';

describe('CLI New Commands Edge Cases & Deep Coverage', () => {
  it('covers runFileDiff with unmask, removed, added, changed, and error branches', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envguard-diff-cov-'));
    try {
      const fileA = path.join(tempDir, '.env.a');
      const fileB = path.join(tempDir, '.env.b');

      // Error branches: file not found
      expect(await runFileDiff('nonexistent.a', 'nonexistent.b')).toBe(1);
      fs.writeFileSync(fileA, 'PORT=3000\nREMOVED_VAR=val\n');
      expect(await runFileDiff(fileA, 'nonexistent.b')).toBe(1);

      fs.writeFileSync(fileB, 'PORT=8080\nADDED_VAR=val2\n');

      // Terminal output branch with unmask
      const exitDiff = await runFileDiff(fileA, fileB, { unmask: true, quiet: false });
      expect(exitDiff).toBe(1);

      // Masked output branch
      const exitDiffMasked = await runFileDiff(fileA, fileB, { unmask: false, quiet: false });
      expect(exitDiffMasked).toBe(1);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('covers runEncrypt & runDecrypt error and auto-generated key branches', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envguard-crypto-cov-'));
    try {
      const envPath = path.join(tempDir, '.env');
      const encPath = path.join(tempDir, '.env.enc');

      // Encrypt nonexistent
      expect(await runEncrypt('nonexistent.env')).toBe(1);

      // Encrypt with auto-generated key
      fs.writeFileSync(envPath, 'SECRET_KEY=val\n');
      const exitAutoKey = await runEncrypt(envPath, { output: encPath, quiet: false });
      expect(exitAutoKey).toBe(0);

      // Decrypt nonexistent
      expect(await runDecrypt('nonexistent.enc', { key: 'foo' })).toBe(1);

      // Decrypt without key
      delete process.env.ENVGUARD_KEY;
      expect(await runDecrypt(encPath, { key: '' })).toBe(1);

      // Decrypt with invalid key format
      expect(await runDecrypt(encPath, { key: 'invalid-key', quiet: false })).toBe(1);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('covers runFmt with single/double quotes, prefixes, check modes, and already formatted files', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envguard-fmt-cov-'));
    try {
      const envPath = path.join(tempDir, '.env');
      fs.writeFileSync(envPath, 'PORT=3000\n');

      // Already formatted in check mode
      const exitCheck = await runFmt([envPath], { check: true, quiet: false });
      expect(exitCheck).toBe(0);

      // Already formatted write mode
      const exitWrite = await runFmt([envPath], { check: false, quiet: false });
      expect(exitWrite).toBe(0);

      // Format with always-double quotes and prefix sort
      fs.writeFileSync(envPath, 'APP_KEY=123\nDB_HOST=localhost\nAPP_NAME=my-app\n');
      const exitPrefix = await runFmt([envPath], { sort: 'prefix', quoteStyle: 'always-double' });
      expect(exitPrefix).toBe(0);

      const content = fs.readFileSync(envPath, 'utf8');
      expect(content).toContain('APP_KEY="123"');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('covers auditDockerFiles when no Dockerfile exists', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envguard-docker-cov-'));
    try {
      const res = auditDockerFiles(tempDir);
      expect(res.hasDockerfile).toBe(false);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('covers loadEnv with multiple paths and override enabled', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envguard-loader-cov-'));
    try {
      fs.writeFileSync(path.join(tempDir, '.env'), 'VAR_A=initial\nVAR_B=base\n');
      fs.writeFileSync(path.join(tempDir, '.env.override'), 'VAR_A=overridden\n');

      const res = loadEnv({
        cwd: tempDir,
        path: ['.env', '.env.override'],
        override: true
      });

      expect(res.loadedFiles).toHaveLength(2);
      expect(res.parsed.VAR_A).toBe('overridden');
      expect(process.env.VAR_A).toBe('overridden');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
