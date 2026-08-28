import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { syncEnvExample } from '../src/core/sync/env-syncer.js';

describe('Auto-Sync & Masking Engine', () => {
  let tempDir: string;

  beforeEach(() => {
    const raw = fs.mkdtempSync(path.join(os.tmpdir(), 'envguard-test-sync-'));
    tempDir = fs.realpathSync.native ? fs.realpathSync.native(raw) : fs.realpathSync(raw);
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

  it('guarantees sync output for detected secrets is always a generic placeholder and never derived from real values', () => {
    const envFile = path.join(tempDir, '.env');
    const exampleFile = path.join(tempDir, '.env.example');

    const realSecrets = {
      STRIPE_SECRET_KEY: 'sk_live_99887766554433221100aabbccddeeff',
      ANTHROPIC_API_KEY: 'sk-ant-api03-abcdefghijklmnopqrstuvwxyz1234567890',
      AWS_ACCESS_KEY_ID: 'AKIAIOSFODNN7EXAMPLE',
      AWS_SECRET_ACCESS_KEY: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
      GITLAB_TOKEN: 'glpat-0123456789abcdefghij',
      NPM_TOKEN: 'npm_0123456789abcdefghijklmnopqrstuv',
      DISCORD_BOT_TOKEN: 'MTIzNDU2Nzg5MDEyMzQ1Njc4OTA.ABCDEF.1234567890abcdefghijklmnopqrstuvwx',
      HUGGINGFACE_TOKEN: 'hf_0123456789abcdefghijklmnopqrstuvwxyz12',
      CUSTOM_SECRET: 'Uniq$eSecretVal9988!@#RandomEntropyToken9102'
    };

    const envLines = Object.entries(realSecrets)
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');

    fs.writeFileSync(envFile, envLines);

    syncEnvExample({
      cwd: tempDir,
      envPath: '.env',
      examplePath: '.env.example'
    });

    const exampleContent = fs.readFileSync(exampleFile, 'utf8');

    // 1. None of the real secrets (or their non-trivial substrings) should appear in .env.example
    for (const [key, secret] of Object.entries(realSecrets)) {
      if (key === 'AWS_ACCESS_KEY_ID' || key === 'AWS_SECRET_ACCESS_KEY') {
        // AWS documentation dummy example values
        continue;
      }
      expect(exampleContent).not.toContain(secret);
      // Ensure no truncated slice (first 10 chars) appears
      const prefix = secret.slice(0, 10);
      expect(exampleContent).not.toContain(prefix);
    }

    // 2. All generated values must be clean generic placeholders
    expect(exampleContent).toContain('STRIPE_SECRET_KEY=sk_test_your_stripe_key_here');
    expect(exampleContent).toContain('ANTHROPIC_API_KEY=your_anthropic_api_key_here');
    expect(exampleContent).toContain('GITLAB_TOKEN=your_gitlab_token_here');
    expect(exampleContent).toContain('NPM_TOKEN=your_npm_token_here');
    expect(exampleContent).toContain('DISCORD_BOT_TOKEN=your_discord_bot_token_here');
    expect(exampleContent).toContain('HUGGINGFACE_TOKEN=your_huggingface_token_here');
    expect(exampleContent).toContain('CUSTOM_SECRET=your_custom_secret_here');
  });
});
