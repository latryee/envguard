import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { syncEnvExample } from '../src/core/sync/env-syncer.js';

describe('Auto-Sync & Masking Engine', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'envguard-test-sync-')));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('creates new .env.example with masked placeholders from .env', () => {
    const envFile = path.join(tempDir, '.env');
    const exampleFile = path.join(tempDir, '.env.example');

    const fakeOpenAi = ['sk-proj-', 'supersecretkey12345678901234567890'].join('');
    fs.writeFileSync(
      envFile,
      `
PORT=8080
DATABASE_URL=postgres://real_user:super_secret_pw@prod-db.aws.com:5432/production
OPENAI_API_KEY=${fakeOpenAi}
DEBUG=true
`
    );

    const result = syncEnvExample({
      cwd: tempDir,
      envPath: '.env',
      examplePath: '.env.example'
    });

    expect(result.addedKeys).toContain('PORT');
    expect(result.addedKeys).toContain('DATABASE_URL');
    expect(result.addedKeys).toContain('OPENAI_API_KEY');
    expect(result.addedKeys).toContain('DEBUG');

    const createdContent = fs.readFileSync(exampleFile, 'utf8');
    // Ensure real secrets are masked
    expect(createdContent).not.toContain('super_secret_pw');
    expect(createdContent).not.toContain(fakeOpenAi);
    expect(createdContent).toContain('your_openai_api_key_here');
    expect(createdContent).toContain('postgresql://postgres:postgres@localhost:5432/mydb');
    expect(createdContent).toContain('@type port');
    expect(createdContent).toContain('@type boolean');
  });

  it('prunes obsolete variables from .env.example when prune is enabled', () => {
    const envFile = path.join(tempDir, '.env');
    const exampleFile = path.join(tempDir, '.env.example');

    fs.writeFileSync(envFile, 'PORT=3000\n');
    fs.writeFileSync(exampleFile, 'PORT=3000\nOLD_OBSOLETE_KEY=123\n');

    const result = syncEnvExample({
      cwd: tempDir,
      envPath: '.env',
      examplePath: '.env.example',
      prune: true,
      codeKeys: new Set(['PORT'])
    });

    expect(result.prunedKeys).toContain('OLD_OBSOLETE_KEY');
    const updated = fs.readFileSync(exampleFile, 'utf8');
    expect(updated).not.toContain('OLD_OBSOLETE_KEY');
  });
});
