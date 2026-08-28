import { describe, it, expect } from 'vitest';
import { renderTerminalReport } from '../src/reporters/terminal-reporter.js';
import { renderJsonReport } from '../src/reporters/json-reporter.js';
import { renderGitHubReport } from '../src/reporters/github-reporter.js';
import { DiffResult } from '../src/core/diff/env-differ.js';

describe('Report Renderers', () => {
  const mockDiffPassing: DiffResult = {
    missingInEnv: [],
    missingInExample: [],
    staleInExample: [],
    typeMismatches: [],
    secretLeaks: [],
    unusedInEnv: [],
    hasErrors: false,
    hasWarnings: false,
    summary: {
      totalCodeKeys: 5,
      totalEnvKeys: 5,
      totalExampleKeys: 5,
      missingInEnvCount: 0,
      missingInExampleCount: 0,
      staleCount: 0,
      typeErrorsCount: 0,
      secretsCount: 0
    }
  };

  const mockDiffFailing: DiffResult = {
    missingInEnv: [
      { key: 'REQUIRED_KEY', required: true, source: 'example', references: [{ file: 'src/app.ts', line: 10, column: 5, key: 'REQUIRED_KEY', snippet: 'process.env.REQUIRED_KEY', language: 'typescript' }] },
      { key: 'OPTIONAL_KEY', required: false, default: 'fallback', source: 'example' }
    ],
    missingInExample: [
      { key: 'NEW_KEY', source: 'env' }
    ],
    staleInExample: [
      { key: 'OLD_KEY', line: 12 }
    ],
    typeMismatches: [
      { key: 'PORT', value: 'invalid_port', expectedType: 'port (1-65535)', actualType: 'string', message: 'Expected valid port number', line: 4 }
    ],
    secretLeaks: [
      {
        ruleId: 'openai-api-key',
        ruleName: 'OpenAI API Key',
        category: 'ai',
        severity: 'critical',
        description: 'Exposed OpenAI API Key.',
        remediation: 'Rotate key.',
        variableKey: 'OPENAI_KEY',
        file: '.env.example',
        line: 5,
        snippetMasked: 'sk-p...cdef',
        entropy: 4.5
      }
    ],
    unusedInEnv: [
      { key: 'LOCAL_VAR', line: 20 }
    ],
    hasErrors: true,
    hasWarnings: true,
    summary: {
      totalCodeKeys: 3,
      totalEnvKeys: 3,
      totalExampleKeys: 3,
      missingInEnvCount: 2,
      missingInExampleCount: 1,
      staleCount: 1,
      typeErrorsCount: 1,
      secretsCount: 1
    }
  };

  it('renders terminal passing report correctly', () => {
    const report = renderTerminalReport(mockDiffPassing);
    expect(report).toContain('All checks passed!');
    expect(report).toContain('5 code references');
  });

  it('renders terminal failing report with error details and masked secrets', () => {
    const report = renderTerminalReport(mockDiffFailing, { verbose: true });
    expect(report).toContain('CRITICAL: SECRET LEAKS DETECTED');
    expect(report).toContain('OpenAI API Key');
    expect(report).toContain('sk-p...cdef');
    expect(report).toContain('Missing in .env');
    expect(report).toContain('REQUIRED_KEY');
    expect(report).toContain('OPTIONAL_KEY');
    expect(report).toContain('Type & Format Mismatches');
    expect(report).toContain('PORT');
    expect(report).toContain('Drift: Missing in .env.example');
    expect(report).toContain('NEW_KEY');
  });

  it('renders valid JSON report without exposing raw secrets', () => {
    const jsonStr = renderJsonReport(mockDiffFailing);
    const parsed = JSON.parse(jsonStr);

    expect(parsed.status).toBe('failed');
    expect(parsed.secretLeaks).toHaveLength(1);
    expect(parsed.secretLeaks[0].snippetMasked).toBe('sk-p...cdef');
    expect(parsed.missingInEnv).toHaveLength(2);
    expect(parsed.typeMismatches).toHaveLength(1);
    expect(parsed.missingInExample[0].key).toBe('NEW_KEY');
    // Ensure no raw value field exists in missingInExample
    expect(parsed.missingInExample[0].value).toBeUndefined();
  });

  it('renders GitHub Actions workflow annotations format correctly', () => {
    const ghReport = renderGitHubReport(mockDiffFailing);
    expect(ghReport).toContain('::error file=.env.example line=5,title=Secret Leak::[OpenAI API Key] Exposed OpenAI API Key.');
    expect(ghReport).toContain('::error file=.env line=4,title=Env Type Mismatch::Expected valid port number');
    expect(ghReport).toContain('::error title=Missing Env Variable::Required environment variable "REQUIRED_KEY" is missing in .env.');
    expect(ghReport).toContain('::warning title=Undocumented Env Variable::Variable "NEW_KEY" is used in code or .env but missing in .env.example.');
  });
});
