import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { runCheck } from '../src/cli/commands/check.js';
import { runSync } from '../src/cli/commands/sync.js';
import { runGenTypes } from '../src/cli/commands/gen-types.js';

describe('CLI Commands Integration', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envguard-test-cli-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('runs sync to create .env.example, gen-types, and check validates successfully', async () => {
    // Setup sample codebase
    fs.writeFileSync(path.join(tempDir, '.env'), 'PORT=3000\nDATABASE_URL=postgres://localhost/db\n');
    fs.writeFileSync(path.join(tempDir, 'app.js'), 'const p = process.env.PORT;');

    const oldCwd = process.cwd();
    process.chdir(tempDir);

    try {
      // 1. Sync
      const syncCode = await runSync({ quiet: true });
      expect(syncCode).toBe(0);
      expect(fs.existsSync(path.join(tempDir, '.env.example'))).toBe(true);

      // 2. Gen-types
      const genCode = await runGenTypes({ quiet: true });
      expect(genCode).toBe(0);
      expect(fs.existsSync(path.join(tempDir, 'env.d.ts'))).toBe(true);

      // 3. Check
      const checkCode = await runCheck({ quiet: true, noBanner: true });
      expect(checkCode).toBe(0);
    } finally {
      process.chdir(oldCwd);
    }
  });

  it('fails check when required variable is missing in .env', async () => {
    fs.writeFileSync(path.join(tempDir, '.env.example'), 'PORT=3000\nMISSING_KEY=val # @required\n');
    fs.writeFileSync(path.join(tempDir, '.env'), 'PORT=3000\n');

    const oldCwd = process.cwd();
    process.chdir(tempDir);

    try {
      const checkCode = await runCheck({ quiet: true, noBanner: true });
      expect(checkCode).toBe(1);
    } finally {
      process.chdir(oldCwd);
    }
  });
});
