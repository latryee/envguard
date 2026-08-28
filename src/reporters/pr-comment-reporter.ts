import fs from 'node:fs';
import { DiffResult } from '../core/diff/env-differ.js';

/**
 * Renders a Markdown PR Review Comment and writes to GITHUB_STEP_SUMMARY if available.
 */
export function renderPrCommentReport(diff: DiffResult): string {
  const lines: string[] = [];

  const totalErrors = diff.missingInEnv.length + diff.typeMismatches.length + diff.secretLeaks.length;
  const totalWarnings = diff.missingInExample.length + diff.staleInExample.length;

  let statusBadge = '🟢 **Passed**';
  if (totalErrors > 0) {
    statusBadge = '🔴 **Failed**';
  } else if (totalWarnings > 0) {
    statusBadge = '🟡 **Passed with Warnings**';
  }

  lines.push(`## 🛡️ EnvGuard CI Environment Report`);
  lines.push(`Status: ${statusBadge} (${totalErrors} error(s), ${totalWarnings} warning(s))\n`);

  // 1. Critical Secret Leaks
  if (diff.secretLeaks.length > 0) {
    lines.push(`### 🚨 Critical: Hardcoded Secrets Detected (${diff.secretLeaks.length})`);
    lines.push(`| Rule / Provider | Location | Confidence | Remediation |`);
    lines.push(`|---|---|---|---|`);
    for (const leak of diff.secretLeaks) {
      const loc = leak.file ? `\`${leak.file}:${leak.line ?? 1}\`` : `Variable \`${leak.variableKey ?? 'UNKNOWN'}\``;
      const conf = `**${leak.confidenceLevel || 'HIGH'}** (${leak.confidence ?? 95}%)`;
      lines.push(`| **${leak.ruleName}** | ${loc} | ${conf} | ${leak.remediation || 'Rotate immediately'} |`);
    }
    lines.push('');
  }

  // 2. Missing in .env (Runtime Crash Risk)
  if (diff.missingInEnv.length > 0) {
    lines.push(`### ❌ Missing Variables in \`.env\` (${diff.missingInEnv.length})`);
    lines.push(`> ⚠️ **Runtime Crash Risk:** The following variables are required by code or \`.env.example\` but missing from \`.env\`:\n`);
    lines.push(`| Variable Name | Required By | Default |`);
    lines.push(`|---|---|---|`);
    for (const item of diff.missingInEnv) {
      const reqBy = item.source === 'code' ? 'Codebase Reference' : '.env.example template';
      const def = item.default || '-';
      lines.push(`| \`${item.key}\` | ${reqBy} | ${def} |`);
    }
    lines.push('');
  }

  // 3. Type Mismatches
  if (diff.typeMismatches.length > 0) {
    lines.push(`### ⚠️ Semantic Type Mismatches (${diff.typeMismatches.length})`);
    lines.push(`| Variable | Current Value | Expected Type | Error |`);
    lines.push(`|---|---|---|---|`);
    for (const tm of diff.typeMismatches) {
      lines.push(`| \`${tm.key}\` | \`${tm.value}\` | \`${tm.expectedType}\` | ${tm.message} |`);
    }
    lines.push('');
  }

  // 4. Undocumented / Drift Variables
  if (diff.missingInExample.length > 0) {
    lines.push(`<details><summary><b>⚠️ Undocumented Variables (${diff.missingInExample.length})</b></summary>\n`);
    lines.push(`The following variables exist in \`.env\` or codebase but are not documented in \`.env.example\`:\n`);
    lines.push(`| Variable | Source |`);
    lines.push(`|---|---|`);
    for (const item of diff.missingInExample) {
      lines.push(`| \`${item.key}\` | ${item.source === 'env' ? '.env file' : 'Codebase reference'} |`);
    }
    lines.push(`\n💡 **Fix:** Run \`npx @latryee/envguard sync\` to automatically update \`.env.example\`.\n`);
    lines.push(`</details>\n`);
  }

  // 5. Stale / Unused in .env.example
  if (diff.staleInExample.length > 0) {
    lines.push(`<details><summary><b>ℹ️ Stale / Unused Variables (${diff.staleInExample.length})</b></summary>\n`);
    lines.push(`These variables exist in \`.env.example\` but are not referenced in code or \`.env\`:\n`);
    for (const v of diff.staleInExample) {
      lines.push(`- \`${v.key}\` (line ${v.line})`);
    }
    lines.push(`\n💡 **Fix:** Run \`npx @latryee/envguard sync --prune\` to remove obsolete variables.\n`);
    lines.push(`</details>\n`);
  }

  lines.push(`---\n*Report generated automatically by [EnvGuard](https://github.com/latryee/envguard)*`);

  const report = lines.join('\n');

  // Write to GitHub Step Summary if running in GitHub Actions
  const summaryFile = process.env.GITHUB_STEP_SUMMARY;
  if (summaryFile) {
    try {
      fs.appendFileSync(summaryFile, report + '\n\n', 'utf8');
    } catch {
      // ignore
    }
  }

  return report;
}
