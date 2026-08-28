/**
 * Safe placeholders and mock patterns that should never trigger secret alerts.
 */
export const SAFE_PLACEHOLDERS = [
  'your_api_key_here',
  'your-api-key-here',
  'your_secret_here',
  'your-secret-here',
  'your_key_here',
  'your-key-here',
  'your_token_here',
  'your-token-here',
  'your_password_here',
  'your-password-here',
  'changeme',
  'change_me',
  'change-me',
  'replace_me',
  'replace-me',
  'placeholder',
  'dummy',
  'example',
  'sample',
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  'test',
  'demo',
  'todo',
  'fake',
  'mock',
  'xxx',
  'xxxx',
  'default',
  'none',
  'null',
  'undefined',
  'true',
  'false',
  'postgres://user:password@localhost:5432/dbname',
  'mongodb://localhost:27017/mydb',
  'redis://localhost:6379'
];

/**
 * Checks whether a given value is a recognizable mock/placeholder.
 */
export function isSafePlaceholder(value: string): boolean {
  if (!value) return true;

  const trimmed = value.trim();
  const lower = trimmed.toLowerCase();

  // Exact matches
  if (SAFE_PLACEHOLDERS.includes(lower)) return true;

  // Repetitive or dummy markers
  if (/^(\*+|x+|X+|0+|1+|_+|-+)$/.test(lower)) return true;

  // UUIDs (standard, URN, uppercase/lowercase)
  if (/^(?:urn:uuid:)?[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i.test(trimmed)) {
    return true;
  }

  // Pure 40-char SHA1 or 64-char SHA256 git/build hashes
  if (/^[0-9a-f]{40}$/.test(trimmed) || /^[0-9a-f]{64}$/.test(trimmed)) {
    return true;
  }

  // Base64 Data URIs (e.g. data:image/png;base64,...)
  if (/^data:[a-zA-Z0-9/+-]+;base64,/i.test(trimmed)) {
    return true;
  }

  // Webpack / Vite / Rollup build asset chunk filenames
  if (/\b(?:chunk|bundle|vendor|app|main)[-._][0-9a-fA-F]{8,32}\.(?:js|css|map)$/i.test(trimmed)) {
    return true;
  }

  // CSS module or CSP nonce classes
  if (/^(?:css-module-|nonce-)/i.test(trimmed)) {
    return true;
  }

  // Unsigned / Mock JWTs (alg: "none")
  if (/^eyJhbGciOiJub25lIiw/i.test(trimmed)) {
    return true;
  }

  // Contains obvious placeholder flags
  if (
    lower.includes('your_') ||
    lower.includes('your-') ||
    lower.includes('<your') ||
    lower.includes('[your') ||
    lower.includes('replace_me') ||
    lower.includes('insert_') ||
    lower.includes('change_me') ||
    lower.includes('changeme') ||
    lower.includes('example.com') ||
    lower.includes('localhost') ||
    lower.includes('127.0.0.1') ||
    lower.includes('placeholder') ||
    lower.includes('dummy') ||
    lower.includes('test_secret')
  ) {
    return true;
  }

  return false;
}
