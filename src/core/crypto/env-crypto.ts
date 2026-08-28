import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Generates a random 32-byte (256-bit) encryption key encoded as hex.
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString('hex');
}

/**
 * Derives a 32-byte key from either a hex key or a passphrase using scrypt.
 */
function deriveKey(secret: string, salt: Buffer): Buffer {
  // If exactly 64 hex characters (32 bytes), use directly
  if (/^[0-9a-fA-F]{64}$/.test(secret)) {
    return Buffer.from(secret, 'hex');
  }
  // Otherwise derive key via scrypt
  return crypto.scryptSync(secret, salt, KEY_LENGTH);
}

/**
 * Encrypts environment plaintext using AES-256-GCM into a compact envelope.
 */
export function encryptEnv(plaintext: string, secretKey: string): string {
  if (!secretKey) {
    throw new Error('Encryption key is required.');
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = deriveKey(secretKey, salt);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
  ciphertext += cipher.final('hex');

  const tag = cipher.getAuthTag();

  // Return compact safe envelope format
  return `ENVGUARD_ENC_V1:${iv.toString('hex')}:${salt.toString('hex')}:${tag.toString('hex')}:${ciphertext}\n`;
}

/**
 * Decrypts an AES-256-GCM envelope back to plaintext.
 */
export function decryptEnv(encryptedContent: string, secretKey: string): string {
  if (!secretKey) {
    throw new Error('Decryption key is required.');
  }

  const trimmed = encryptedContent.trim();
  if (!trimmed.startsWith('ENVGUARD_ENC_V1:')) {
    throw new Error('Invalid or unsupported encrypted environment file format.');
  }

  const parts = trimmed.split(':');
  if (parts.length !== 5) {
    throw new Error('Corrupted encrypted envelope.');
  }

  const [, ivHex, saltHex, tagHex, ciphertextHex] = parts;

  const iv = Buffer.from(ivHex, 'hex');
  const salt = Buffer.from(saltHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const key = deriveKey(secretKey, salt);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  try {
    let decrypted = decipher.update(ciphertextHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err: any) {
    throw new Error('Decryption failed. Invalid key or tampered ciphertext.');
  }
}
