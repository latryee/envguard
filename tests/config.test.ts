import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { loadConfig } from '../src/core/config/config-loader.js';
import { DEFAULT_CONFIG } from '../src/core/config/defaults.js';

describe('Config Loader', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'envguard-test-cfg-')));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('returns default config when no configuration file exists', () => {
    const config = loadConfig(tempDir);
    expect(config.envFile).toBe(DEFAULT_CONFIG.envFile);
    expect(config.exampleFile).toBe(DEFAULT_CONFIG.exampleFile);
    expect(config.typesFile).toBe(DEFAULT_CONFIG.typesFile);
    expect(config.strict).toBe(false);
  });

  it('loads configuration from envguard.config.json', () => {
    fs.writeFileSync(
      path.join(tempDir, 'envguard.config.json'),
      JSON.stringify({
        envFile: '.env.local',
        exampleFile: '.env.template',
        strict: true,
        ignoredKeys: ['CUSTOM_VAR']
      })
    );

    const config = loadConfig(tempDir);
    expect(config.envFile).toBe('.env.local');
    expect(config.exampleFile).toBe('.env.template');
    expect(config.strict).toBe(true);
    expect(config.ignoredKeys).toContain('CUSTOM_VAR');
  });

  it('loads configuration from package.json envguard section', () => {
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify({
        name: 'my-app',
        envguard: {
          envFile: '.env.prod',
          strict: true
        }
      })
    );

    const config = loadConfig(tempDir);
    expect(config.envFile).toBe('.env.prod');
    expect(config.strict).toBe(true);
  });
});
