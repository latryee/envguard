import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { renderPrCommentReport } from '../src/index.js';
import { computeEnvDiff } from '../src/core/diff/env-differ.js';
import { parseEnv } from '../src/core/parser/env-parser.js';

describe('GitHub PR Comment & Step Summary Reporter', () => {
  it('generates rich PR markdown comment with secret leak, missing var, and type mismatch tables', () => {
    const secretVal = ['sk-ant-', 'api03-abcdef1234567890abcdef1234567890abcdef1234567890'].join('');
    const envAst = parseEnv(`PORT=invalid_port\nAPI_KEY=${secretVal}\n`);
    const exampleAst = parseEnv('# @type port\nPORT=3000\n# @type string\nAPI_KEY=your_key\n# @type string\nMISSING_REQUIRED=val\n');

    const diff = computeEnvDiff({
      envAst,
      exampleAst,
      codeKeys: new Set(['PORT', 'API_KEY', 'MISSING_REQUIRED', 'UNDOCUMENTED_VAR'])
    });

    const report = renderPrCommentReport(diff);
    expect(report).toContain('## 🛡️ EnvGuard CI Environment Report');
    expect(report).toContain('Status: 🔴 **Failed**');
    expect(report).toContain('Anthropic Claude API Key');
    expect(report).toContain('MISSING_REQUIRED');
    expect(report).toContain('invalid_port');
    expect(report).toContain('UNDOCUMENTED_VAR');
  });

  it('writes to GITHUB_STEP_SUMMARY when environment variable is present', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envguard-summary-test-'));
    const summaryFile = path.join(tempDir, 'step-summary.md');
    process.env.GITHUB_STEP_SUMMARY = summaryFile;

    try {
      const envAst = parseEnv('PORT=3000\n');
      const exampleAst = parseEnv('# @type port\nPORT=3000\n');
      const diff = computeEnvDiff({ envAst, exampleAst, codeKeys: new Set(['PORT']) });

      const report = renderPrCommentReport(diff);
      expect(report).toContain('Status: 🟢 **Passed**');
      expect(fs.existsSync(summaryFile)).toBe(true);

      const fileContent = fs.readFileSync(summaryFile, 'utf8');
      expect(fileContent).toContain('EnvGuard CI Environment Report');
    } finally {
      delete process.env.GITHUB_STEP_SUMMARY;
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
