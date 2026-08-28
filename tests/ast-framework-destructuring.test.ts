import { describe, it, expect } from 'vitest';
import { scanTsAst } from '../src/index.js';

describe('TypeScript AST Scanner - Destructuring, Aliasing & Computed Access', () => {
  it('scans nested and renamed object destructuring', () => {
    const code = `
const {
  DB_USER,
  DB_PASS: password,
  DB_PORT = 5432,
  nested: { DEEP_SECRET }
} = process.env;
`;

    const refs = scanTsAst({
      filePath: 'server.ts',
      relFilePath: 'server.ts',
      content: code
    });

    const keys = refs.map((r) => r.key);
    expect(keys).toContain('DB_USER');
    expect(keys).toContain('DB_PASS');
    expect(keys).toContain('DB_PORT');
    expect(keys).toContain('DEEP_SECRET');
  });

  it('scans aliased environment wrappers and subsequent references', () => {
    const code = `
const env = process.env;
const myMeta = import.meta.env;

const apiKey = env.OPENAI_API_KEY;
const viteKey = myMeta.VITE_MAP_KEY;
const { DB_HOST } = env;
`;

    const refs = scanTsAst({
      filePath: 'config.ts',
      relFilePath: 'config.ts',
      content: code
    });

    const keys = refs.map((r) => r.key);
    expect(keys).toContain('OPENAI_API_KEY');
    expect(keys).toContain('VITE_MAP_KEY');
    expect(keys).toContain('DB_HOST');
  });

  it('scans parameter destructuring with default process.env', () => {
    const code = `
export function setupClient({ STRIPE_KEY, TIMEOUT = 5000 } = process.env) {
  return { STRIPE_KEY, TIMEOUT };
}
`;

    const refs = scanTsAst({
      filePath: 'client.ts',
      relFilePath: 'client.ts',
      content: code
    });

    const keys = refs.map((r) => r.key);
    expect(keys).toContain('STRIPE_KEY');
    expect(keys).toContain('TIMEOUT');
  });

  it('scans element access and template literal brackets', () => {
    const code = `
const a = process.env['REDIS_URL'];
const b = process.env[\`AUTH_SECRET\`];
const c = Bun.env.BUN_SECRET;
const d = Deno.env.get('DENO_VAR');
const e = Deno.env.has('DENO_EXISTS');
`;

    const refs = scanTsAst({
      filePath: 'runtime.ts',
      relFilePath: 'runtime.ts',
      content: code
    });

    const keys = refs.map((r) => r.key);
    expect(keys).toContain('REDIS_URL');
    expect(keys).toContain('AUTH_SECRET');
    expect(keys).toContain('BUN_SECRET');
    expect(keys).toContain('DENO_VAR');
    expect(keys).toContain('DENO_EXISTS');
  });
});
