import { DiffResult } from '../core/diff/env-differ.js';

export function renderJsonReport(diff: DiffResult): string {
  return JSON.stringify(
    {
      timestamp: new Date().toISOString(),
      status: diff.hasErrors ? 'failed' : diff.hasWarnings ? 'warning' : 'passed',
      summary: diff.summary,
      secretLeaks: diff.secretLeaks,
      missingInEnv: diff.missingInEnv,
      missingInExample: diff.missingInExample,
      staleInExample: diff.staleInExample,
      typeMismatches: diff.typeMismatches,
      unusedInEnv: diff.unusedInEnv
    },
    null,
    2
  );
}
