import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { compareEnvFiles } from '../src/index.js';
import { runFileDiff } from '../src/cli/commands/diff.js';

describe('File-to-File Environment Diff Engine', () => {
  it('detects added, removed, changed, and identical variables with secret masking', () => {
    const envStaging = `
PORT=8080
DATABASE_URL=postgresql://user:pass@staging.db:5432/db
API_KEY=sk-ant-api03-abcdef1234567890abcdef1234567890abcdef1234567890
OLD_FEATURE=true
`;

    const envProd = `
PORT=3000
DATABASE_URL=postgresql://user:pass@prod.db:5432/db
API_KEY=sk-ant-api03-abcdef1234567890abcdef1234567890abcdef1234567890
NEW_FEATURE=enabled
`;

    const diff = compareEnvFiles(envStaging, envProd, '.env.staging', '.env.prod');
    expect(diff.hasDifferences).toBe(true);

    // Removed in Prod
    expect(diff.removed.length).toBe(1);
    expect(diff.removed[0].key).toBe('OLD_FEATURE');

    // Added in Prod
    expect(diff.added.length).toBe(1);
    expect(diff.added[0].key).toBe('NEW_FEATURE');

    // Changed values
    expect(diff.changed.length).toBe(2); // PORT and DATABASE_URL
    const portDiff = diff.changed.find((c) => c.key === 'PORT');
    expect(portDiff?.valueA).toBe('8080');
    expect(portDiff?.valueB).toBe('3000');

    // Identical
    expect(diff.identical.length).toBe(1);
    expect(diff.identical[0].key).toBe('API_KEY');
    expect(diff.identical[0].maskedValueA).toContain('sk-a...');
  });

  it('runs CLI diff command', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envguard-cli-diff-'));
    try {
      const fileA = path.join(tempDir, '.env.a');
      const fileB = path.join(tempDir, '.env.b');

      fs.writeFileSync(fileA, 'PORT=3000\n');
      fs.writeFileSync(fileB, 'PORT=3000\n');

      const exitCodeSame = await runFileDiff(fileA, fileB, { quiet: true });
      expect(exitCodeSame).toBe(0);

      fs.writeFileSync(fileB, 'PORT=8080\n');
      const exitCodeDiff = await runFileDiff(fileA, fileB, { quiet: true });
      expect(exitCodeDiff).toBe(1);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
