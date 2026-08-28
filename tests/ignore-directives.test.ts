import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  parseInlineDirectives,
  isFindingIgnored,
  loadEnvguardIgnore,
  scanCodebase
} from '../src/index.js';

describe('Ignore Engine - .envguardignore & Inline Directives', () => {
  it('parses inline ignore directives properly', () => {
    const code = `
const a = 1;
// envguard-ignore-next-line
const apiKey = "sk-ant-" + "api03-abcdef1234567890abcdef1234567890abcdef1234567890";

const secret2 = "AKIA" + "IOSFODNN7EXAMPLE"; // envguard-ignore

# envguard-ignore-next-line anthropic-api-key
const secret3 = "sk-ant-" + "api03-abcdef1234567890abcdef1234567890abcdef1234567890";
`;

    const directives = parseInlineDirectives(code);
    expect(directives.ignoredLines.has(4)).toBe(true); // line 4 ignored via next-line on line 3
    expect(directives.ignoredLines.has(6)).toBe(true); // line 6 ignored via same-line ignore
    expect(directives.lineRuleIgnores.get(9)?.has('anthropic-api-key')).toBe(true);
  });

  it('correctly suppresses secret findings when line is ignored', () => {
    const directives = {
      ignoredLines: new Set([4]),
      lineRuleIgnores: new Map([[5, new Set(['openai-api-key'])]]),
      lineKeyIgnores: new Map()
    };

    expect(isFindingIgnored(4, 'anthropic-api-key', 'API_KEY', directives)).toBe(true);
    expect(isFindingIgnored(5, 'openai-api-key', 'API_KEY', directives)).toBe(true);
    expect(isFindingIgnored(5, 'anthropic-api-key', 'API_KEY', directives)).toBe(false);
    expect(isFindingIgnored(10, 'anthropic-api-key', 'API_KEY', directives)).toBe(false);
  });

  it('loads .envguardignore with globs, ignored keys, and ignored rules', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envguard-test-ignore-'));
    try {
      const ignoreContent = `
# Comment
tests/fixtures/**
key:MY_SECRET_TEST_VAR
var:ANOTHER_IGNORED_VAR
rule:high-entropy-secret
`;
      fs.writeFileSync(path.join(tempDir, '.envguardignore'), ignoreContent);

      const config = loadEnvguardIgnore(tempDir);
      expect(config.globPatterns).toContain('tests/fixtures/**');
      expect(config.ignoredKeys.has('MY_SECRET_TEST_VAR')).toBe(true);
      expect(config.ignoredKeys.has('ANOTHER_IGNORED_VAR')).toBe(true);
      expect(config.ignoredRules.has('high-entropy-secret')).toBe(true);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('scans codebase and respects inline ignore directives', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envguard-test-inline-scan-'));
    try {
      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });

      const fileContent = `
// envguard-ignore-next-line
const token = "sk-ant-api03-abcdef1234567890abcdef1234567890abcdef1234567890";
const realLeak = "AKIAIOSFODNN7EXAMPLE";
`;
      fs.writeFileSync(path.join(srcDir, 'service.ts'), fileContent);

      const result = await scanCodebase({ cwd: tempDir });
      // The first secret (sk-ant-...) is ignored via inline comment, so only the second (AKIA...) is reported
      expect(result.secretLeaks.length).toBe(1);
      expect(result.secretLeaks[0].ruleId).toBe('aws-access-key');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
