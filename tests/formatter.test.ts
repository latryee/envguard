import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { formatEnv } from '../src/index.js';
import { runFmt } from '../src/cli/commands/fmt.js';

describe('Environment Formatter Engine', () => {
  it('normalizes quotes and handles spaces/special characters', () => {
    const raw = `
PORT="3000"
APP_NAME=My Awesome App
DB_PASS="p@ss#word"
SIMPLE=hello
`;
    const formatted = formatEnv(raw, { quoteStyle: 'as-needed' });

    expect(formatted).toContain('PORT=3000');
    expect(formatted).toContain('APP_NAME="My Awesome App"');
    expect(formatted).toContain('DB_PASS="p@ss#word"');
    expect(formatted).toContain('SIMPLE=hello');
  });

  it('sorts alphabetically or by domain prefix', () => {
    const raw = `
REDIS_URL=redis://localhost:6379
AWS_SECRET=secret
DATABASE_URL=postgresql://localhost:5432
AWS_REGION=us-east-1
REDIS_PORT=6379
`;
    const alphaSorted = formatEnv(raw, { sort: 'alphabetical' });
    const lines = alphaSorted.trim().split('\n');
    expect(lines[0]).toContain('AWS_REGION');
    expect(lines[1]).toContain('AWS_SECRET');
    expect(lines[2]).toContain('DATABASE_URL');

    const prefixSorted = formatEnv(raw, { sort: 'prefix' });
    expect(prefixSorted).toContain('AWS_REGION');
    expect(prefixSorted).toContain('REDIS_PORT');
  });

  it('preserves annotations and inline comments cleanly', () => {
    const raw = `
# @type port @required @default 3000
PORT=3000 # Main server port
`;
    const formatted = formatEnv(raw);
    expect(formatted).toContain('# @type port @required @default 3000');
    expect(formatted).toContain('PORT=3000 # Main server port');
  });

  it('runs CLI fmt command in check mode and write mode', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envguard-cli-fmt-'));
    try {
      const envFile = path.join(tempDir, '.env');
      fs.writeFileSync(envFile, 'B=2\nA=1\n');

      const exitCodeUnsorted = await runFmt([envFile], { sort: 'alphabetical', check: true, quiet: true });
      expect(exitCodeUnsorted).toBe(1);

      const exitCodeWrite = await runFmt([envFile], { sort: 'alphabetical', check: false, quiet: true });
      expect(exitCodeWrite).toBe(0);

      const updated = fs.readFileSync(envFile, 'utf8');
      expect(updated.indexOf('A=1')).toBeLessThan(updated.indexOf('B=2'));
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
