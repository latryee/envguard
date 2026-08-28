import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { runCheck } from '../src/cli/commands/check.js';
import { runSync } from '../src/cli/commands/sync.js';
import { runGenTypes } from '../src/cli/commands/gen-types.js';
import { runHookInstall } from '../src/cli/commands/hook.js';
import { runInit } from '../src/cli/commands/init.js';

describe('CLI Commands Integration', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'envguard-test-cli-')));
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

  it('fails in strict mode when warnings exist', async () => {
    fs.writeFileSync(path.join(tempDir, '.env.example'), 'PORT=3000\n');
    fs.writeFileSync(path.join(tempDir, '.env'), 'PORT=3000\nNEW_UNDOCUMENTED_VAR=123\n');

    const oldCwd = process.cwd();
    process.chdir(tempDir);

    try {
      // Non-strict: exit code 0 because warnings only
      const nonStrictCode = await runCheck({ strict: false, quiet: true, noBanner: true });
      expect(nonStrictCode).toBe(0);

      // Strict: exit code 1 because warnings are treated as failures
      const strictCode = await runCheck({ strict: true, quiet: true, noBanner: true });
      expect(strictCode).toBe(1);
    } finally {
      process.chdir(oldCwd);
    }
  });

  it('outputs valid JSON format with --format json', async () => {
    fs.writeFileSync(path.join(tempDir, '.env'), 'PORT=3000\n');
    fs.writeFileSync(path.join(tempDir, '.env.example'), 'PORT=3000\n');

    const oldCwd = process.cwd();
    process.chdir(tempDir);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const checkCode = await runCheck({ format: 'json', noBanner: true });
      expect(checkCode).toBe(0);

      const jsonCall = logSpy.mock.calls.find((call) => {
        try {
          const parsed = JSON.parse(call[0]);
          return parsed.status === 'passed';
        } catch {
          return false;
        }
      });
      expect(jsonCall).toBeDefined();
    } finally {
      logSpy.mockRestore();
      process.chdir(oldCwd);
    }
  });

  it('outputs GitHub workflow commands with --format github', async () => {
    fs.writeFileSync(path.join(tempDir, '.env'), 'PORT=3000\n');
    fs.writeFileSync(path.join(tempDir, '.env.example'), 'PORT=3000\nMISSING_REQUIRED=abc # @required\n');

    const oldCwd = process.cwd();
    process.chdir(tempDir);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const checkCode = await runCheck({ format: 'github', noBanner: true });
      expect(checkCode).toBe(1);

      const ghCall = logSpy.mock.calls.find((call) => call[0]?.includes('::error'));
      expect(ghCall).toBeDefined();
    } finally {
      logSpy.mockRestore();
      process.chdir(oldCwd);
    }
  });

  it('runs init workflow cleanly', async () => {
    const oldCwd = process.cwd();
    process.chdir(tempDir);

    try {
      const initCode = await runInit();
      expect(initCode).toBe(0);
      expect(fs.existsSync(path.join(tempDir, '.env.example'))).toBe(true);
    } finally {
      process.chdir(oldCwd);
    }
  });

  it('handles hook install command', () => {
    const oldCwd = process.cwd();
    process.chdir(tempDir);

    try {
      // In a non-git directory, hook install returns 1
      const exitCode = runHookInstall();
      expect(exitCode).toBe(1);
    } finally {
      process.chdir(oldCwd);
    }
  });

  it('fails check when a real secret is hardcoded in a source file', async () => {
    fs.writeFileSync(path.join(tempDir, '.env'), 'PORT=3000\n');
    fs.writeFileSync(path.join(tempDir, '.env.example'), 'PORT=3000\n');

    const claudeSecret = ['sk-ant-', 'api03-abcdefghijklmnopqrstuvwxyz1234567890'].join('');
    fs.writeFileSync(
      path.join(tempDir, 'service.ts'),
      `export const key = "${claudeSecret}";\nconst port = process.env.PORT;\n`
    );

    const oldCwd = process.cwd();
    process.chdir(tempDir);

    try {
      const checkCode = await runCheck({ quiet: true, noBanner: true });
      expect(checkCode).toBe(1);
    } finally {
      process.chdir(oldCwd);
    }
  });

  it('fails check when a real secret is present in .env', async () => {
    const fakeKey = ['sk-proj-', 'aBcDeFgHiJkLmNoPqRsTuVwXyZ1234567890abcdef'].join('');
    fs.writeFileSync(path.join(tempDir, '.env'), `PORT=3000\nOPENAI_KEY=${fakeKey}\n`);
    fs.writeFileSync(path.join(tempDir, '.env.example'), 'PORT=3000\nOPENAI_KEY=your_key_here\n');
    fs.writeFileSync(path.join(tempDir, 'app.js'), 'const port = process.env.PORT; const key = process.env.OPENAI_KEY;');

    const oldCwd = process.cwd();
    process.chdir(tempDir);

    try {
      const checkCode = await runCheck({ quiet: true, noBanner: true });
      expect(checkCode).toBe(1);
    } finally {
      process.chdir(oldCwd);
    }
  });

  it('honors customGlobs from config file when not in staged mode', async () => {
    fs.writeFileSync(
      path.join(tempDir, 'envguard.config.json'),
      JSON.stringify({
        customGlobs: ['src/**/*.ts']
      })
    );

    const srcDir = path.join(tempDir, 'src');
    const scriptsDir = path.join(tempDir, 'scripts');
    fs.mkdirSync(srcDir, { recursive: true });
    fs.mkdirSync(scriptsDir, { recursive: true });

    // File matched by customGlobs
    fs.writeFileSync(path.join(srcDir, 'app.ts'), 'const port = process.env.PORT;');
    // File outside customGlobs (would cause drift if scanned)
    fs.writeFileSync(path.join(scriptsDir, 'ignored.js'), 'const secret = process.env.UNCONFIGURED_IGNORED_VAR;');

    fs.writeFileSync(path.join(tempDir, '.env'), 'PORT=3000\n');
    fs.writeFileSync(path.join(tempDir, '.env.example'), 'PORT=3000\n');

    const oldCwd = process.cwd();
    process.chdir(tempDir);

    try {
      // With strict mode, any drift from ignored.js would fail the check
      const checkCode = await runCheck({ strict: true, quiet: true, noBanner: true });
      expect(checkCode).toBe(0);
    } finally {
      process.chdir(oldCwd);
    }
  });
});


