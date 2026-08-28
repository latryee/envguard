import { describe, it, expect } from 'vitest';
import {
  generateLspDiagnostics,
  toLspRange,
  LspDiagnosticSeverity,
  LspDiagnosticTag,
  computeEnvDiff,
  parseEnv
} from '../src/index.js';

describe('Language Server Protocol (LSP) Real-Time Diagnostics Engine', () => {
  it('converts 1-indexed lines to 0-indexed LSP Ranges', () => {
    const range = toLspRange(5, 10, 8);
    expect(range.start.line).toBe(4);
    expect(range.start.character).toBe(9);
    expect(range.end.line).toBe(4);
    expect(range.end.character).toBe(17);
  });

  it('generates schema-compliant LSP diagnostics across secret leaks, client leaks, and type mismatches', () => {
    const envAst = parseEnv(`
PORT=invalid_port
AWS_KEY=AKIAIOSFODNN7EXAMPLE
`);
    const exampleAst = parseEnv(`
# @type port
PORT=3000
# @required true
DATABASE_URL=postgresql://localhost:5432/app
# @required false
OBSOLETE_SCHEMA_VAR=true
`);

    const diff = computeEnvDiff({
      envAst,
      exampleAst,
      codeKeys: new Set(['PORT', 'DATABASE_URL', 'CLIENT_SECRET_KEY']),
      clientLeaks: [
        {
          key: 'CLIENT_SECRET_KEY',
          filePath: 'src/components/Header.tsx',
          line: 12,
          column: 15,
          framework: 'Next.js',
          expectedPrefix: 'NEXT_PUBLIC_',
          severity: 'critical',
          message: 'Private variable "CLIENT_SECRET_KEY" referenced in client component.'
        }
      ]
    });

    const fileMap = generateLspDiagnostics(diff);

    // 1. Check .env file diagnostics
    const envDiagnostics = fileMap.get('file:///.env') || [];
    expect(envDiagnostics.length).toBeGreaterThan(0);

    const secretDiagnostic = envDiagnostics.find((d) => d.code === 'aws-access-key');
    expect(secretDiagnostic).toBeDefined();
    expect(secretDiagnostic?.severity).toBe(LspDiagnosticSeverity.Error);
    expect(secretDiagnostic?.source).toBe('envguard');
    expect(secretDiagnostic?.message).toContain('AKIA');

    const typeDiagnostic = envDiagnostics.find((d) => d.code === 'env-type-mismatch');
    expect(typeDiagnostic).toBeDefined();
    expect(typeDiagnostic?.severity).toBe(LspDiagnosticSeverity.Error);

    // 2. Check client leak diagnostic for Header.tsx
    const headerDiagnostics = fileMap.get('file:///src/components/Header.tsx') || [];
    expect(headerDiagnostics.length).toBe(1);
    expect(headerDiagnostics[0].code).toBe('framework-client-leak');
    expect(headerDiagnostics[0].severity).toBe(LspDiagnosticSeverity.Error);
    expect(headerDiagnostics[0].range.start.line).toBe(11); // line 12 -> index 11
    expect(headerDiagnostics[0].range.start.character).toBe(14); // col 15 -> index 14

    // 3. Check stale variable in .env.example with Unnecessary diagnostic tag
    const exampleDiagnostics = fileMap.get('file:///.env.example') || [];
    const staleDiag = exampleDiagnostics.find((d) => d.code === 'stale-env-variable');
    expect(staleDiag).toBeDefined();
    expect(staleDiag?.severity).toBe(LspDiagnosticSeverity.Hint);
    expect(staleDiag?.tags).toContain(LspDiagnosticTag.Unnecessary);
  });
});
