import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { scanCodebase, scanTsAst, stripComments } from '../src/index.js';

describe('AST & Multi-Language Scanner Edge Cases Coverage', () => {
  it('covers Deno.env.has, string literal destructuring, and binary assignment', () => {
    const code = `
let PORT;
({ PORT } = process.env);
const { 'API_KEY': myKey } = process.env;
const hasSecret = Deno.env.has('DENO_KEY');
`;
    const refs = scanTsAst({
      filePath: 'src/edge.ts',
      relFilePath: 'src/edge.ts',
      content: code
    });

    const keys = refs.map((r) => r.key);
    expect(keys).toContain('PORT');
    expect(keys).toContain('API_KEY');
    expect(keys).toContain('DENO_KEY');
  });

  it('scans multi-language source files (Go, Rust, Python, PHP, Ruby, Dockerfile)', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envguard-multilang-'));
    try {
      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });

      // Python
      fs.writeFileSync(
        path.join(srcDir, 'app.py'),
        `# Python comment\nimport os\nval = os.environ.get("PY_VAR")\nval2 = os.getenv("PY_VAR2")\n"""\nTriple quoted string os.getenv("FAKE_PY")\n"""\n`
      );

      // Go
      fs.writeFileSync(
        path.join(srcDir, 'main.go'),
        `package main\nimport "os"\n// comment\nfunc main() {\n  os.Getenv("GO_VAR")\n  os.LookupEnv("GO_LOOKUP")\n}\n`
      );

      // Rust
      fs.writeFileSync(
        path.join(srcDir, 'main.rs'),
        `fn main() {\n  // comment\n  std::env::var("RUST_VAR").unwrap();\n  dotenvy::var("DOTENVY_VAR").unwrap();\n}\n`
      );

      // PHP
      fs.writeFileSync(
        path.join(srcDir, 'index.php'),
        `<?php\n# comment\n$x = $_ENV['PHP_VAR'];\n$y = getenv('PHP_GETENV');\n`
      );

      // Ruby
      fs.writeFileSync(
        path.join(srcDir, 'app.rb'),
        `# comment\nx = ENV['RUBY_VAR']\ny = ENV.fetch('RUBY_FETCH')\n`
      );

      // Dockerfile
      fs.writeFileSync(
        path.join(tempDir, 'Dockerfile'),
        `FROM node:20\nENV DOCKER_ENV=production\nCMD ["npm", "start"]\n`
      );

      const result = await scanCodebase({ cwd: tempDir });
      expect(result.uniqueKeys.has('PY_VAR')).toBe(true);
      expect(result.uniqueKeys.has('PY_VAR2')).toBe(true);
      expect(result.uniqueKeys.has('FAKE_PY')).toBe(false);
      expect(result.uniqueKeys.has('GO_VAR')).toBe(true);
      expect(result.uniqueKeys.has('GO_LOOKUP')).toBe(true);
      expect(result.uniqueKeys.has('RUST_VAR')).toBe(true);
      expect(result.uniqueKeys.has('DOTENVY_VAR')).toBe(true);
      expect(result.uniqueKeys.has('PHP_VAR')).toBe(true);
      expect(result.uniqueKeys.has('PHP_GETENV')).toBe(true);
      expect(result.uniqueKeys.has('RUBY_VAR')).toBe(true);
      expect(result.uniqueKeys.has('RUBY_FETCH')).toBe(true);
      expect(result.uniqueKeys.has('DOCKER_ENV')).toBe(true);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('strips comments across all languages accurately', () => {
    const tsCode = `const x = 1; // line comment\n/* block \n comment */ const y = 2;`;
    const strippedTs = stripComments(tsCode, 'typescript');
    expect(strippedTs).not.toContain('line comment');
    expect(strippedTs).not.toContain('block');

    const pyCode = `x = 1 # python comment\n"""\ntriple\n"""`;
    const strippedPy = stripComments(pyCode, 'python');
    expect(strippedPy).not.toContain('python comment');
    expect(strippedPy).not.toContain('triple');

    const phpCode = `<?php\n# php hash comment\n$x = 1;`;
    const strippedPhp = stripComments(phpCode, 'php');
    expect(strippedPhp).not.toContain('php hash comment');
  });
});
