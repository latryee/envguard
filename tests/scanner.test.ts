import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { scanCodebase } from '../src/core/scanner/code-scanner.js';

describe('Multi-Language Code Scanner', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envguard-test-scan-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('scans JavaScript and TypeScript env references', async () => {
    const srcDir = path.join(tempDir, 'src');
    fs.mkdirSync(srcDir, { recursive: true });

    fs.writeFileSync(
      path.join(srcDir, 'index.ts'),
      `
const port = process.env.PORT || 3000;
const secret = process.env['API_KEY'];
const viteUrl = import.meta.env.VITE_BACKEND_URL;
const bunKey = Bun.env.BUN_SECRET;
const denoVal = Deno.env.get('DENO_VAR');
`
    );

    const result = await scanCodebase({ cwd: tempDir });
    expect(result.uniqueKeys.has('PORT')).toBe(true);
    expect(result.uniqueKeys.has('API_KEY')).toBe(true);
    expect(result.uniqueKeys.has('VITE_BACKEND_URL')).toBe(true);
    expect(result.uniqueKeys.has('BUN_SECRET')).toBe(true);
    expect(result.uniqueKeys.has('DENO_VAR')).toBe(true);
  });

  it('scans Python, Go, Rust, and Docker references', async () => {
    fs.writeFileSync(
      path.join(tempDir, 'app.py'),
      `import os\ndb = os.getenv("PYTHON_DB_URL")\nhost = os.environ.get("PY_HOST")`
    );

    fs.writeFileSync(
      path.join(tempDir, 'main.go'),
      `package main\nimport "os"\nfunc main() { p := os.Getenv("GO_PORT") }`
    );

    fs.writeFileSync(
      path.join(tempDir, 'main.rs'),
      `fn main() { let _ = std::env::var("RUST_LOG"); }`
    );

    fs.writeFileSync(
      path.join(tempDir, 'Dockerfile'),
      `FROM node:20\nENV DOCKER_PORT=8080\nCMD ["node", "index.js"]`
    );

    const result = await scanCodebase({ cwd: tempDir });
    expect(result.uniqueKeys.has('PYTHON_DB_URL')).toBe(true);
    expect(result.uniqueKeys.has('PY_HOST')).toBe(true);
    expect(result.uniqueKeys.has('GO_PORT')).toBe(true);
    expect(result.uniqueKeys.has('RUST_LOG')).toBe(true);
    expect(result.uniqueKeys.has('DOCKER_PORT')).toBe(true);
  });

  it('ignores files in node_modules and .git by default', async () => {
    const nodeModules = path.join(tempDir, 'node_modules', 'some-pkg');
    fs.mkdirSync(nodeModules, { recursive: true });
    fs.writeFileSync(path.join(nodeModules, 'index.js'), 'const p = process.env.IGNORED_KEY;');

    const result = await scanCodebase({ cwd: tempDir });
    expect(result.uniqueKeys.has('IGNORED_KEY')).toBe(false);
  });
});
