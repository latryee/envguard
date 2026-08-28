import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { setupVsCodeIntegration } from '../src/index.js';
import { runVsCode } from '../src/cli/commands/vscode.js';

describe('IDE & VS Code Integration Setup', () => {
  it('generates .vscode/settings.json and .envguard.schema.json', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envguard-vscode-test-'));
    try {
      fs.writeFileSync(
        path.join(tempDir, '.env.example'),
        '# @type port @required\nPORT=3000\n# @type boolean\nDEBUG=false\n'
      );

      const result = setupVsCodeIntegration(tempDir, '.env.example');
      expect(result.settingsCreated).toBe(true);
      expect(result.schemaCreated).toBe(true);

      const settings = JSON.parse(fs.readFileSync(result.settingsPath, 'utf8'));
      expect(settings['explorer.fileNesting.enabled']).toBe(true);
      expect(settings['explorer.fileNesting.patterns']['.env']).toContain('.env.*');
      expect(settings['files.associations']['.env*']).toBe('dotenv');

      const schema = JSON.parse(fs.readFileSync(result.schemaPath, 'utf8'));
      expect(schema.properties.PORT).toBeDefined();
      expect(schema.properties.DEBUG).toBeDefined();
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('executes CLI vscode command', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envguard-cli-vscode-'));
    const oldCwd = process.cwd();
    try {
      fs.writeFileSync(path.join(tempDir, '.env.example'), 'PORT=3000\n');
      process.chdir(tempDir);

      const exitCode = await runVsCode({ quiet: true });
      expect(exitCode).toBe(0);
      expect(fs.existsSync(path.join(tempDir, '.vscode', 'settings.json'))).toBe(true);
    } finally {
      process.chdir(oldCwd);
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
