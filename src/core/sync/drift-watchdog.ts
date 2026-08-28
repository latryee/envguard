import { EnvFileAst, EnvVariable } from '../parser/types.js';
import { parseEnv } from '../parser/env-parser.js';
import { createSchemaFromAnnotations } from '../validator/schema.js';
import { validateFieldValue } from '../validator/type-validator.js';
import { maskSecret } from '../secrets/detector.js';

export type DriftSeverity = 'CRITICAL' | 'HIGH' | 'WARNING' | 'INFO';

export type DriftDivergenceKind =
  | 'MISSING_IN_RUNTIME'
  | 'UNDOCUMENTED_IN_SCHEMA'
  | 'TYPE_MISMATCH'
  | 'STALE_SCHEMA';

export interface DriftDivergence {
  key: string;
  kind: DriftDivergenceKind;
  severity: DriftSeverity;
  message: string;
  runtimeValueMasked?: string;
  expectedType?: string;
  actualType?: string;
  remediation: string;
}

export interface DriftWatchdogOptions {
  runtimeEnv?: Record<string, string | undefined>;
  exampleAst?: EnvFileAst | null;
  exampleContent?: string;
  ignoredKeys?: string[];
  strict?: boolean;
}

export interface DriftReport {
  timestamp: string;
  isCompliant: boolean;
  driftScore: number; // 0.0 (perfect alignment) to 1.0 (complete drift)
  divergences: DriftDivergence[];
  summary: {
    totalRuntimeKeys: number;
    totalSchemaKeys: number;
    missingInRuntimeCount: number;
    undocumentedCount: number;
    typeMismatchesCount: number;
    staleSchemaCount: number;
  };
}

/**
 * Compares live runtime environment variables against repository schema (.env.example)
 * to detect operational divergence and compliance drift.
 */
export function watchEnvironmentDrift(options: DriftWatchdogOptions): DriftReport {
  const runtime = options.runtimeEnv || process.env;
  const ignored = new Set(options.ignoredKeys || []);

  let exampleAst = options.exampleAst;
  if (!exampleAst && options.exampleContent) {
    exampleAst = parseEnv(options.exampleContent);
  }

  const schemaVars = exampleAst?.variables || new Map<string, EnvVariable>();
  const divergences: DriftDivergence[] = [];

  // Filter runtime keys excluding system / ignored vars
  const runtimeKeys = Object.keys(runtime).filter((k) => !ignored.has(k) && runtime[k] !== undefined);
  const runtimeKeySet = new Set(runtimeKeys);

  // 1. Missing in Runtime (Keys required by schema but not present in live process.env)
  for (const [key, schemaVar] of schemaVars.entries()) {
    if (ignored.has(key)) continue;

    const isOptional = schemaVar.annotations.required === false || schemaVar.annotations.default !== undefined;
    const isPresent = runtimeKeySet.has(key) && runtime[key] !== '' && runtime[key] !== undefined;

    if (!isPresent && !isOptional) {
      divergences.push({
        key,
        kind: 'MISSING_IN_RUNTIME',
        severity: 'CRITICAL',
        message: `Required variable "${key}" defined in schema is missing from the active runtime environment.`,
        remediation: `Set the "${key}" environment variable in your deployment environment or secrets vault.`
      });
    } else if (!isPresent && isOptional && schemaVar.annotations.default === undefined) {
      divergences.push({
        key,
        kind: 'MISSING_IN_RUNTIME',
        severity: 'INFO',
        message: `Optional variable "${key}" is not set in the active runtime environment.`,
        remediation: `Configure "${key}" if you require its specific functionality.`
      });
    }
  }

  // 2. Undocumented in Schema (Keys in live runtime that do not exist in .env.example)
  for (const key of runtimeKeys) {
    if (ignored.has(key)) continue;

    if (!schemaVars.has(key)) {
      const rawVal = runtime[key] || '';
      divergences.push({
        key,
        kind: 'UNDOCUMENTED_IN_SCHEMA',
        severity: 'WARNING',
        message: `Variable "${key}" is active in runtime but missing from repository .env.example schema.`,
        runtimeValueMasked: maskSecret(rawVal),
        remediation: `Document "${key}" in .env.example or run "envguard sync" to align repository templates.`
      });
    }
  }

  // 3. Type & Format validation of live runtime values against schema annotations
  for (const [key, schemaVar] of schemaVars.entries()) {
    if (ignored.has(key)) continue;

    const runtimeVal = runtime[key];
    if (runtimeVal !== undefined && runtimeVal !== '') {
      const fieldSchema = createSchemaFromAnnotations(
        key,
        schemaVar.annotations,
        schemaVar.value
      );

      const error = validateFieldValue(runtimeVal, fieldSchema);
      if (error) {
        divergences.push({
          key,
          kind: 'TYPE_MISMATCH',
          severity: 'HIGH',
          message: `Runtime value for "${key}" does not match schema type "${fieldSchema.type}": ${error.message}`,
          expectedType: fieldSchema.type,
          runtimeValueMasked: maskSecret(runtimeVal),
          remediation: `Fix the value of "${key}" in your environment to match expected type "${fieldSchema.type}".`
        });
      }
    }
  }

  const criticalAndHigh = divergences.filter((d) => d.severity === 'CRITICAL' || d.severity === 'HIGH').length;
  const warnings = divergences.filter((d) => d.severity === 'WARNING').length;

  const totalEvaluated = Math.max(1, schemaVars.size + runtimeKeys.length);
  const driftScore = Number(
    Math.min(1.0, (criticalAndHigh * 2 + warnings) / totalEvaluated).toFixed(4)
  );

  const isCompliant = options.strict ? divergences.length === 0 : criticalAndHigh === 0;

  return {
    timestamp: new Date().toISOString(),
    isCompliant,
    driftScore,
    divergences,
    summary: {
      totalRuntimeKeys: runtimeKeys.length,
      totalSchemaKeys: schemaVars.size,
      missingInRuntimeCount: divergences.filter((d) => d.kind === 'MISSING_IN_RUNTIME' && d.severity === 'CRITICAL').length,
      undocumentedCount: divergences.filter((d) => d.kind === 'UNDOCUMENTED_IN_SCHEMA').length,
      typeMismatchesCount: divergences.filter((d) => d.kind === 'TYPE_MISMATCH').length,
      staleSchemaCount: 0
    }
  };
}

/**
 * Formats a drift report as human-readable Markdown or Terminal text.
 */
export function formatDriftReport(report: DriftReport, format: 'markdown' | 'json' = 'markdown'): string {
  if (format === 'json') {
    return JSON.stringify(report, null, 2);
  }

  const lines: string[] = [];
  lines.push(`# 🌐 Environment Drift & Runtime Alignment Report`);
  lines.push(`**Status:** ${report.isCompliant ? '✅ COMPLIANT' : '❌ DIVERGED'} (Drift Score: ${(report.driftScore * 100).toFixed(1)}%)\n`);

  lines.push(`| Metric | Count |`);
  lines.push(`|---|---|`);
  lines.push(`| Total Runtime Variables | ${report.summary.totalRuntimeKeys} |`);
  lines.push(`| Total Schema Variables | ${report.summary.totalSchemaKeys} |`);
  lines.push(`| Missing Required in Runtime | ${report.summary.missingInRuntimeCount} |`);
  lines.push(`| Undocumented Runtime Variables | ${report.summary.undocumentedCount} |`);
  lines.push(`| Type Mismatches | ${report.summary.typeMismatchesCount} |\n`);

  if (report.divergences.length > 0) {
    lines.push(`### ⚠️ Divergences Detected\n`);
    lines.push(`| Severity | Variable | Kind | Message | Remediation |`);
    lines.push(`|---|---|---|---|---|`);
    for (const div of report.divergences) {
      lines.push(`| **${div.severity}** | \`${div.key}\` | ${div.kind} | ${div.message} | ${div.remediation} |`);
    }
  } else {
    lines.push(`\n✨ **No environment drift detected. Runtime and schema are in 100% synchronization.**\n`);
  }

  return lines.join('\n');
}
