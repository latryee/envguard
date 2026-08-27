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

  const lower = value.trim().toLowerCase();

  // Exact matches
  if (SAFE_PLACEHOLDERS.includes(lower)) return true;

  // Repetitive or dummy markers
  if (/^(\*+|x+|X+|0+|1+|_+|-+)$/.test(lower)) return true;

  // Contains obvious placeholder flags
  if (
    lower.includes('your_') ||
    lower.includes('your-') ||
    lower.includes('<your') ||
    lower.includes('[your') ||
    lower.includes('replace_me') ||
    lower.includes('insert_') ||
    lower.includes('change_me') ||
    lower.includes('example.com') ||
    lower.includes('placeholder')
  ) {
    return true;
  }

  return false;
}
