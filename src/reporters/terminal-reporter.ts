import pc from 'picocolors';
import { DiffResult } from '../core/diff/env-differ.js';

export interface TerminalReporterOptions {
  showBanner?: boolean;
  verbose?: boolean;
  version?: string;
}

export function renderTerminalReport(diff: DiffResult, options: TerminalReporterOptions = {}): string {
  const output: string[] = [];

  const addLine = (line = '') => output.push(line);

  // 1. Secret Leaks (CRITICAL ALERT)
  if (diff.secretLeaks.length > 0) {
    addLine(pc.bgRed(pc.white(pc.bold(' 🚨 CRITICAL: SECRET LEAKS DETECTED '))) + '\n');
    for (const leak of diff.secretLeaks) {
      const loc = leak.file ? `${leak.file}${leak.line ? `:${leak.line}` : ''}` : 'unknown';
      const keyName = leak.variableKey ? ` in variable ${pc.bold(leak.variableKey)}` : '';
      addLine(`  ${pc.red('●')} ${pc.bold(leak.ruleName)}${keyName} ${pc.dim(`at ${loc}`)}`);
      addLine(`    ${pc.dim('Pattern:')} ${leak.description}`);
      addLine(`    ${pc.dim('Masked:')}  ${pc.yellow(leak.snippetMasked)} ${leak.entropy ? pc.dim(`(entropy: ${leak.entropy})`) : ''}`);
      addLine(`    ${pc.dim('Fix:')}     ${pc.green(leak.remediation)}`);
      addLine();
    }
  }

  // 2. Missing in .env (Runtime crash risk)
  if (diff.missingInEnv.length > 0) {
    const requiredMissing = diff.missingInEnv.filter((m) => m.required);
    const optionalMissing = diff.missingInEnv.filter((m) => !m.required);

    if (requiredMissing.length > 0) {
      addLine(pc.bold(pc.red(`❌ Missing in .env (Required - Runtime Crash Risk) [${requiredMissing.length}]`)));
      for (const item of requiredMissing) {
        let extra = '';
        if (item.references && item.references.length > 0) {
          const firstRef = item.references[0];
          extra = pc.dim(` (referenced in ${firstRef.file}:${firstRef.line})`);
        }
        addLine(`  ${pc.red('✖')} ${pc.bold(item.key)}${extra}`);
      }
      addLine();
    }

    if (optionalMissing.length > 0 && options.verbose) {
      addLine(pc.bold(pc.yellow(`⚠️ Missing in .env (Optional / Has Default) [${optionalMissing.length}]`)));
      for (const item of optionalMissing) {
        const def = item.default ? pc.dim(` (default: ${item.default})`) : '';
        addLine(`  ${pc.yellow('○')} ${item.key}${def}`);
      }
      addLine();
    }
  }

  // 3. Type Mismatches
  if (diff.typeMismatches.length > 0) {
    addLine(pc.bold(pc.red(`❌ Type & Format Mismatches [${diff.typeMismatches.length}]`)));
    for (const err of diff.typeMismatches) {
      const loc = err.line ? pc.dim(` (line ${err.line})`) : '';
      addLine(`  ${pc.red('✖')} ${pc.bold(err.key)}${loc}: ${err.message}`);
      addLine(`    ${pc.dim('Expected:')} ${pc.cyan(err.expectedType)} | ${pc.dim('Got:')} ${pc.yellow(err.value)}`);
    }
    addLine();
  }

  // 4. Missing in .env.example (Documentation drift)
  if (diff.missingInExample.length > 0) {
    addLine(pc.bold(pc.yellow(`⚠️ Drift: Missing in .env.example (Undocumented Keys) [${diff.missingInExample.length}]`)));
    for (const item of diff.missingInExample) {
      let extra = '';
      if (item.references && item.references.length > 0) {
        const firstRef = item.references[0];
        extra = pc.dim(` (used in ${firstRef.file}:${firstRef.line})`);
      }
      addLine(`  ${pc.yellow('▲')} ${pc.bold(item.key)}${extra}`);
    }
    addLine(`  ${pc.dim('💡 Fix: Run')} ${pc.cyan('npx envguard sync')} ${pc.dim('to automatically update .env.example')}\n`);
  }

  // 5. Stale variables in .env.example
  if (diff.staleInExample.length > 0) {
    addLine(pc.bold(pc.dim(`⚠️ Stale variables in .env.example (Unused) [${diff.staleInExample.length}]`)));
    for (const item of diff.staleInExample) {
      addLine(`  ${pc.dim('—')} ${item.key} ${pc.dim(`(line ${item.line})`)}`);
    }
    addLine(`  ${pc.dim('💡 Tip: Run')} ${pc.cyan('npx envguard sync --prune')} ${pc.dim('to clean up obsolete keys')}\n`);
  }

  // 6. Summary Stats
  const errors =
    diff.missingInEnv.filter((m) => m.required).length +
    diff.typeMismatches.length +
    diff.secretLeaks.length;

  const warnings =
    diff.missingInEnv.filter((m) => !m.required).length +
    diff.missingInExample.length +
    diff.staleInExample.length;

  const divider = pc.dim('─'.repeat(60));
  addLine(divider);

  if (errors === 0 && warnings === 0) {
    addLine(
      `  ${pc.green(pc.bold('✔ Environment Guard: All checks passed!'))} ${pc.dim(`(${diff.summary.totalCodeKeys} code references, ${diff.summary.totalEnvKeys} env keys, ${diff.summary.totalExampleKeys} example keys)`)}`
    );
  } else {
    const errorStr = errors > 0 ? pc.red(pc.bold(`${errors} error${errors === 1 ? '' : 's'}`)) : pc.green('0 errors');
    const warnStr = warnings > 0 ? pc.yellow(pc.bold(`${warnings} warning${warnings === 1 ? '' : 's'}`)) : pc.dim('0 warnings');
    const status = errors > 0 ? pc.red('✖ Failed') : pc.yellow('⚠ Passed with warnings');

    addLine(`  ${status}: ${errorStr}, ${warnStr}`);
  }

  addLine(divider);
  return output.join('\n');
}
