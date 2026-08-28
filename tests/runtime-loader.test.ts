import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { loadEnv, expandVariables, EnvGuardValidationError } from '../src/index.js';

describe('Runtime Environment Loader', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('expands variables with defaults properly', () => {
    const env = { HOST: 'api.example.com', PORT: '8080' };
    expect(expandVariables('http://${HOST}:${PORT}/v1', env)).toBe('http://api.example.com:8080/v1');
    expect(expandVariables('http://${UNKNOWN_HOST:-localhost}:3000', env)).toBe('http://localhost:3000');
  });

  it('loads .env variables into process.env', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envguard-runtime-load-'));
    try {
      fs.writeFileSync(path.join(tempDir, '.env'), 'RUNTIME_PORT=4000\nRUNTIME_HOST=localhost\n');

      const result = loadEnv({ cwd: tempDir });
      expect(result.loadedFiles).toContain('.env');
      expect(result.parsed.RUNTIME_PORT).toBe('4000');
      expect(process.env.RUNTIME_PORT).toBe('4000');
      expect(process.env.RUNTIME_HOST).toBe('localhost');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('throws EnvGuardValidationError on schema violation in strict mode', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envguard-runtime-strict-'));
    try {
      // .env has invalid port
      fs.writeFileSync(path.join(tempDir, '.env'), 'PORT=not_a_number\n');
      fs.writeFileSync(path.join(tempDir, '.env.example'), '# @type port @required\nPORT=3000\n# @type string @required\nMISSING_SECRET=foo\n');

      expect(() =>
        loadEnv({
          cwd: tempDir,
          strict: true
        })
      ).toThrowError(EnvGuardValidationError);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
