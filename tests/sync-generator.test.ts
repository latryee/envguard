import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { generateSafePlaceholder, syncEnvExample } from '../src/index.js';

describe('Sync Engine & Smart Placeholder Generation', () => {
  it('generates realistic and safe placeholders based on semantic type and key heuristics', () => {
    expect(generateSafePlaceholder('PORT').value).toBe('3000');
    expect(generateSafePlaceholder('CACHE_TTL', undefined, 'duration').value).toBe('30s');
    expect(generateSafePlaceholder('CRON_JOB', undefined, 'cron').value).toBe('0 0 * * *');
    expect(generateSafePlaceholder('APP_VERSION', undefined, 'semver').value).toBe('1.0.0');
    expect(generateSafePlaceholder('API_HOST', undefined, 'hostname').value).toBe('api.example.com');
    expect(generateSafePlaceholder('DATABASE_URL').value).toContain('postgresql://');
    expect(generateSafePlaceholder('REDIS_URL').value).toContain('redis://');
    expect(generateSafePlaceholder('OPENAI_API_KEY').value).toBe('your_openai_api_key_here');
    expect(generateSafePlaceholder('ENABLE_FEATURE').value).toBe('false');
  });

  it('syncs new variables into .env.example with correct type annotations', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envguard-test-sync-gen-'));
    try {
      const envContent = `
PORT=8080
CACHE_TTL=60s
CRON_SCHEDULE=0 0 * * *
APP_VERSION=1.2.0
DB_HOST=db.internal.net
`;
      fs.writeFileSync(path.join(tempDir, '.env'), envContent);

      const result = syncEnvExample({ cwd: tempDir });
      expect(result.addedKeys.length).toBe(5);
      expect(fs.existsSync(path.join(tempDir, '.env.example'))).toBe(true);

      const exampleContent = fs.readFileSync(path.join(tempDir, '.env.example'), 'utf8');
      expect(exampleContent).toContain('PORT=3000');
      expect(exampleContent).toContain('@type port');
      expect(exampleContent).toContain('CACHE_TTL=30s');
      expect(exampleContent).toContain('@type duration');
      expect(exampleContent).toContain('CRON_SCHEDULE="0 0 * * *"');
      expect(exampleContent).toContain('@type cron');
      expect(exampleContent).toContain('APP_VERSION=1.0.0');
      expect(exampleContent).toContain('@type semver');
      expect(exampleContent).toContain('DB_HOST=api.example.com');
      expect(exampleContent).toContain('@type hostname');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
