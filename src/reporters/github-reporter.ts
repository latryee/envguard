import { DiffResult } from '../core/diff/env-differ.js';

export function renderGitHubReport(diff: DiffResult): string {
  const lines: string[] = [];

  // Secret leaks
  for (const leak of diff.secretLeaks) {
    const file = leak.file || '.env.example';
    const line = leak.line ? ` line=${leak.line}` : '';
    lines.push(`::error file=${file}${line},title=Secret Leak::[${leak.ruleName}] ${leak.description}`);
  }

  // Type mismatches
  for (const err of diff.typeMismatches) {
    const line = err.line ? ` line=${err.line}` : '';
    lines.push(`::error file=.env${line},title=Env Type Mismatch::${err.message}`);
  }

  // Missing required in .env
  for (const m of diff.missingInEnv.filter((item) => item.required)) {
    lines.push(`::error title=Missing Env Variable::Required environment variable "${m.key}" is missing in .env.`);
  }

  // Missing in .env.example
  for (const m of diff.missingInExample) {
    lines.push(`::warning title=Undocumented Env Variable::Variable "${m.key}" is used in code or .env but missing in .env.example.`);
  }

  return lines.join('\n');
}
