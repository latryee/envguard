import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  generateEncryptionKey,
  encryptEnv,
  decryptEnv
} from '../src/index.js';
import { runEncrypt } from '../src/cli/commands/encrypt.js';
import { runDecrypt } from '../src/cli/commands/decrypt.js';

describe('Zero-Cloud AES-256-GCM Environment Encryption', () => {
  it('generates a valid 64-char hex key and performs round-trip encryption', () => {
    const key = generateEncryptionKey();
    expect(key).toHaveLength(64);

    const plaintext = 'PORT=3000\nDATABASE_URL=postgresql://postgres:secret@localhost:5432/db\n';
    const encrypted = encryptEnv(plaintext, key);

    expect(encrypted).toContain('ENVGUARD_ENC_V1:');
    expect(encrypted).not.toContain('3000');
    expect(encrypted).not.toContain('postgresql');

    const decrypted = decryptEnv(encrypted, key);
    expect(decrypted).toBe(plaintext);
  });

  it('rejects decryption when ciphertext is tampered or wrong key is provided', () => {
    const key1 = generateEncryptionKey();
    const key2 = generateEncryptionKey();

    const plaintext = 'SECRET_TOKEN=super_confidential_api_token';
    const encrypted = encryptEnv(plaintext, key1);

    // Wrong key
    expect(() => decryptEnv(encrypted, key2)).toThrowError();

    // Tampered payload
    const tampered = encrypted.slice(0, -5) + 'ffff\n';
    expect(() => decryptEnv(tampered, key1)).toThrowError();
  });

  it('runs CLI encrypt and decrypt workflow cleanly', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envguard-cli-crypto-'));
    try {
      const envPath = path.join(tempDir, '.env');
      const encPath = path.join(tempDir, '.env.enc');
      const decryptedPath = path.join(tempDir, '.env.restored');

      const original = 'APP_SECRET=my-production-secret-value\n';
      fs.writeFileSync(envPath, original);

      const customKey = generateEncryptionKey();

      const encExit = await runEncrypt(envPath, {
        key: customKey,
        output: encPath,
        quiet: true
      });
      expect(encExit).toBe(0);
      expect(fs.existsSync(encPath)).toBe(true);

      const decExit = await runDecrypt(encPath, {
        key: customKey,
        output: decryptedPath,
        quiet: true
      });
      expect(decExit).toBe(0);
      expect(fs.existsSync(decryptedPath)).toBe(true);

      const restored = fs.readFileSync(decryptedPath, 'utf8');
      expect(restored).toBe(original);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
