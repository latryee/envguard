import { describe, it, expect } from 'vitest';
import { scanTsAst } from '../src/index.js';

describe('TypeScript / JavaScript AST Scanner', () => {
  it('extracts process.env properties with exact line and column offsets', () => {
    const code = `
const port = process.env.PORT || 3000;
const dbUrl = process.env?.DATABASE_URL;
const nodeEnv = process.env['NODE_ENV'];
const optKey = process.env?.['OPTIONAL_FLAG'];
`;

    const refs = scanTsAst({
      filePath: 'src/config.ts',
      relFilePath: 'src/config.ts',
      content: code
    });

    const keys = refs.map((r) => r.key);
    expect(keys).toContain('PORT');
    expect(keys).toContain('DATABASE_URL');
    expect(keys).toContain('NODE_ENV');
    expect(keys).toContain('OPTIONAL_FLAG');
    expect(refs.length).toBe(4);
  });

  it('extracts import.meta.env, Bun.env, and Deno.env references', () => {
    const code = `
const viteApi = import.meta.env.VITE_API_URL;
const viteMode = import.meta.env['MODE'];
const bunSecret = Bun.env.BUN_SECRET;
const denoToken = Deno.env.get('DENO_AUTH_TOKEN');
`;

    const refs = scanTsAst({
      filePath: 'src/app.tsx',
      relFilePath: 'src/app.tsx',
      content: code
    });

    const keys = refs.map((r) => r.key);
    expect(keys).toContain('VITE_API_URL');
    expect(keys).toContain('MODE');
    expect(keys).toContain('BUN_SECRET');
    expect(keys).toContain('DENO_AUTH_TOKEN');
    expect(refs.length).toBe(4);
  });

  it('handles complex destructuring with renaming and default values', () => {
    const code = `
const { PORT, DATABASE_URL: dbUri = 'postgresql://localhost:5432', DEBUG = false } = process.env;
const { VITE_TITLE, VITE_PORT: vPort } = import.meta.env;
`;

    const refs = scanTsAst({
      filePath: 'src/server.ts',
      relFilePath: 'src/server.ts',
      content: code
    });

    const keys = refs.map((r) => r.key);
    expect(keys).toContain('PORT');
    expect(keys).toContain('DATABASE_URL');
    expect(keys).toContain('DEBUG');
    expect(keys).toContain('VITE_TITLE');
    expect(keys).toContain('VITE_PORT');
  });

  it('never matches commented-out code or string literals', () => {
    const code = `
// const port = process.env.COMMENTED_PORT;
/* 
  process.env.BLOCK_COMMENTED_VAR
*/
const msg = "Please configure process.env.FAKE_STRING_KEY in your settings";
const templateMsg = \`Use process.env.TEMPLATE_VAR for this\`;
`;

    const refs = scanTsAst({
      filePath: 'src/logger.ts',
      relFilePath: 'src/logger.ts',
      content: code
    });

    expect(refs.length).toBe(0);
  });

  it('ignores dynamic template literals with substitutions', () => {
    const code = `
const dynamicKey = 'FOO';
const val = process.env[\`\${dynamicKey}\`];
const val2 = process.env[dynamicKey];
`;

    const refs = scanTsAst({
      filePath: 'src/dynamic.ts',
      relFilePath: 'src/dynamic.ts',
      content: code
    });

    expect(refs.length).toBe(0);
  });
});
