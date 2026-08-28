import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { parseEnv } from '../src/core/parser/env-parser.js';
import { generateTypeDeclarations } from '../src/core/generator/types-generator.js';

describe('TypeScript Type Generator', () => {
  let tempDir: string;

  beforeEach(() => {
    const raw = fs.mkdtempSync(path.join(os.tmpdir(), 'envguard-test-types-'));
    tempDir = fs.realpathSync.native ? fs.realpathSync.native(raw) : fs.realpathSync(raw);
  });


  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('generates ambient type declarations for process.env and ImportMetaEnv', () => {
    const exampleRaw = `
PORT=3000 # @type port @description Server port
NODE_ENV=development # @type enum(development,production) @description Environment
DEBUG=false # @type boolean
`;
    const exampleAst = parseEnv(exampleRaw);
    const outputPath = path.join(tempDir, 'env.d.ts');

    const result = generateTypeDeclarations({
      cwd: tempDir,
      outputPath,
      exampleAst
    });

    expect(result.variablesCount).toBe(3);
    const fileContent = fs.readFileSync(outputPath, 'utf8');

    expect(fileContent).toContain('interface ProcessEnv');
    expect(fileContent).toContain('interface ImportMetaEnv');
    expect(fileContent).toContain('PORT: `${number}` | string;');
    expect(fileContent).toContain("NODE_ENV: 'development' | 'production';");
    expect(fileContent).toContain("DEBUG: 'true' | 'false' | '1' | '0';");
    expect(fileContent).toContain('Server port');
  });
});
