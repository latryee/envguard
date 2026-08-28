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

  it('scans JavaScript and TypeScript env references including optional chaining', async () => {
    const srcDir = path.join(tempDir, 'src');
    fs.mkdirSync(srcDir, { recursive: true });

    fs.writeFileSync(
      path.join(srcDir, 'index.ts'),
      `
const port = process.env.PORT || 3000;
const secret = process.env['API_KEY'];
const optionalPort = process.env?.OPT_PORT;
const viteUrl = import.meta.env.VITE_BACKEND_URL;
const optVite = import.meta.env?.VITE_OPTIONAL;
const bunKey = Bun.env.BUN_SECRET;
const denoVal = Deno.env.get('DENO_VAR');
`
    );

    const result = await scanCodebase({ cwd: tempDir });
    expect(result.uniqueKeys.has('PORT')).toBe(true);
    expect(result.uniqueKeys.has('API_KEY')).toBe(true);
    expect(result.uniqueKeys.has('OPT_PORT')).toBe(true);
    expect(result.uniqueKeys.has('VITE_BACKEND_URL')).toBe(true);
    expect(result.uniqueKeys.has('VITE_OPTIONAL')).toBe(true);
    expect(result.uniqueKeys.has('BUN_SECRET')).toBe(true);
    expect(result.uniqueKeys.has('DENO_VAR')).toBe(true);
  });

  it('scans destructuring patterns from process.env and import.meta.env', async () => {
    const srcDir = path.join(tempDir, 'src');
    fs.mkdirSync(srcDir, { recursive: true });

    fs.writeFileSync(
      path.join(srcDir, 'config.ts'),
      `
const { DB_HOST, DB_PASS: password, TIMEOUT = 5000 } = process.env;
const { VITE_API_ENDPOINT, VITE_APP_TITLE } = import.meta.env;
const { BUN_FEATURE_FLAG } = Bun.env;
`
    );

    const result = await scanCodebase({ cwd: tempDir });
    expect(result.uniqueKeys.has('DB_HOST')).toBe(true);
    expect(result.uniqueKeys.has('DB_PASS')).toBe(true);
    expect(result.uniqueKeys.has('TIMEOUT')).toBe(true);
    expect(result.uniqueKeys.has('VITE_API_ENDPOINT')).toBe(true);
    expect(result.uniqueKeys.has('VITE_APP_TITLE')).toBe(true);
    expect(result.uniqueKeys.has('BUN_FEATURE_FLAG')).toBe(true);
  });

  it('ignores commented-out lines to avoid false positives', async () => {
    const srcDir = path.join(tempDir, 'src');
    fs.mkdirSync(srcDir, { recursive: true });

    fs.writeFileSync(
      path.join(srcDir, 'ignored.ts'),
      `
// const oldPort = process.env.COMMENTED_KEY;
/* const another = process.env.BLOCK_COMMENT_KEY; */
const active = process.env.ACTIVE_KEY;
`
    );

    const result = await scanCodebase({ cwd: tempDir });
    expect(result.uniqueKeys.has('ACTIVE_KEY')).toBe(true);
    expect(result.uniqueKeys.has('COMMENTED_KEY')).toBe(false);
    expect(result.uniqueKeys.has('BLOCK_COMMENT_KEY')).toBe(false);
  });

  it('scans Python, Go, Rust, PHP, Ruby, and Docker references', async () => {
    fs.writeFileSync(
      path.join(tempDir, 'app.py'),
      `import os\ndb = os.getenv("PYTHON_DB_URL")\nhost = os.environ.get("PY_HOST")`
    );

    fs.writeFileSync(
      path.join(tempDir, 'main.go'),
      `package main\nimport "os"\nfunc main() { p := os.Getenv("GO_PORT"); l := os.LookupEnv("GO_LOOKUP") }`
    );

    fs.writeFileSync(
      path.join(tempDir, 'main.rs'),
      `fn main() { let _ = std::env::var("RUST_LOG"); let _ = env::var("RUST_VAR"); }`
    );

    fs.writeFileSync(
      path.join(tempDir, 'index.php'),
      `<?php $db = $_ENV['PHP_DB']; $token = getenv('PHP_TOKEN');`
    );

    fs.writeFileSync(
      path.join(tempDir, 'app.rb'),
      `db = ENV['RUBY_DB']\nhost = ENV.fetch('RUBY_HOST')`
    );

    fs.writeFileSync(
      path.join(tempDir, 'Dockerfile'),
      `FROM node:20\nENV DOCKER_PORT=8080\nCMD ["node", "index.js"]`
    );

    const result = await scanCodebase({ cwd: tempDir });
    expect(result.uniqueKeys.has('PYTHON_DB_URL')).toBe(true);
    expect(result.uniqueKeys.has('PY_HOST')).toBe(true);
    expect(result.uniqueKeys.has('GO_PORT')).toBe(true);
    expect(result.uniqueKeys.has('GO_LOOKUP')).toBe(true);
    expect(result.uniqueKeys.has('RUST_LOG')).toBe(true);
    expect(result.uniqueKeys.has('RUST_VAR')).toBe(true);
    expect(result.uniqueKeys.has('PHP_DB')).toBe(true);
    expect(result.uniqueKeys.has('PHP_TOKEN')).toBe(true);
    expect(result.uniqueKeys.has('RUBY_DB')).toBe(true);
    expect(result.uniqueKeys.has('RUBY_HOST')).toBe(true);
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
