import { EnvFileAst, EnvVariable } from '../parser/types.js';
import { CodeReference } from '../scanner/patterns.js';
import { SecretFinding, detectSecretsInValue } from '../secrets/detector.js';
import { createSchemaFromAnnotations } from '../validator/schema.js';
import { ValidationError, validateFieldValue } from '../validator/type-validator.js';

export interface DiffResult {
  missingInEnv: Array<{ key: string; required: boolean; default?: string; source: 'example' | 'code'; references?: CodeReference[] }>;
  missingInExample: Array<{ key: string; value?: string; source: 'env' | 'code'; references?: CodeReference[] }>;
  staleInExample: Array<{ key: string; line: number }>;
  typeMismatches: ValidationError[];
  secretLeaks: SecretFinding[];
  unusedInEnv: Array<{ key: string; line: number }>;
  hasErrors: boolean;
  hasWarnings: boolean;
  summary: {
    totalCodeKeys: number;
    totalEnvKeys: number;
    totalExampleKeys: number;
    missingInEnvCount: number;
    missingInExampleCount: number;
    staleCount: number;
    typeErrorsCount: number;
    secretsCount: number;
  };
}

export interface DiffOptions {
  envAst?: EnvFileAst | null;
  exampleAst?: EnvFileAst | null;
  codeKeys?: Set<string>;
  codeReferences?: Map<string, CodeReference[]>;
}

/**
 * Computes complete environment drift, schema mismatches, and secret leaks across all sources.
 */
export function computeEnvDiff(options: DiffOptions): DiffResult {
  const envVars = options.envAst?.variables || new Map<string, EnvVariable>();
  const exampleVars = options.exampleAst?.variables || new Map<string, EnvVariable>();
  const codeKeys = options.codeKeys || new Set<string>();
  const codeReferences = options.codeReferences || new Map<string, CodeReference[]>();

  const missingInEnv: DiffResult['missingInEnv'] = [];
  const missingInExample: DiffResult['missingInExample'] = [];
  const staleInExample: DiffResult['staleInExample'] = [];
  const typeMismatches: ValidationError[] = [];
  const secretLeaks: SecretFinding[] = [];
  const unusedInEnv: DiffResult['unusedInEnv'] = [];

  // 1. Check for secret leaks in .env.example (CRITICAL: must never contain real secrets)
  if (options.exampleAst) {
    for (const [key, envVar] of exampleVars.entries()) {
      const findings = detectSecretsInValue(envVar.value, key, envVar.line, {
        file: options.exampleAst.filePath || '.env.example'
      });
      secretLeaks.push(...findings);
    }
  }

  // 2. Check for missing in .env
  // Keys in .env.example that are missing in .env
  for (const [key, exampleVar] of exampleVars.entries()) {
    if (!envVars.has(key)) {
      const isOptional = exampleVar.annotations.required === false || exampleVar.annotations.default !== undefined;
      missingInEnv.push({
        key,
        required: !isOptional,
        default: exampleVar.annotations.default,
        source: 'example',
        references: codeReferences.get(key)
      });
    }
  }

  // Keys used in code that are missing in .env (and not already captured)
  for (const codeKey of codeKeys) {
    if (!envVars.has(codeKey) && !missingInEnv.some((m) => m.key === codeKey)) {
      missingInEnv.push({
        key: codeKey,
        required: true,
        source: 'code',
        references: codeReferences.get(codeKey)
      });
    }
  }

  // 3. Check for missing in .env.example (drift)
  // Keys in .env that are not documented in .env.example
  for (const [key, envVar] of envVars.entries()) {
    if (!exampleVars.has(key)) {
      missingInExample.push({
        key,
        value: envVar.value,
        source: 'env',
        references: codeReferences.get(key)
      });
    }
  }

  // Keys in code that are not documented in .env.example (and not in .env)
  for (const codeKey of codeKeys) {
    if (!exampleVars.has(codeKey) && !missingInExample.some((m) => m.key === codeKey)) {
      missingInExample.push({
        key: codeKey,
        source: 'code',
        references: codeReferences.get(codeKey)
      });
    }
  }

  // 4. Check for stale variables in .env.example
  // Variables in .env.example that are NOT used in code AND NOT present in .env
  for (const [key, exampleVar] of exampleVars.entries()) {
    if (!codeKeys.has(key) && !envVars.has(key)) {
      staleInExample.push({
        key,
        line: exampleVar.line
      });
    }
  }

  // 5. Type & Schema validation: Check actual .env values against .env.example schemas
  if (options.exampleAst && options.envAst) {
    for (const [key, envVar] of envVars.entries()) {
      const exampleVar = exampleVars.get(key);
      if (exampleVar) {
        const schema = createSchemaFromAnnotations(
          key,
          exampleVar.annotations,
          exampleVar.value
        );

        const error = validateFieldValue(envVar.value, schema, envVar.line);
        if (error) {
          typeMismatches.push(error);
        }
      }
    }
  }

  // 6. Unused in .env (defined in .env but not in code)
  if (codeKeys.size > 0) {
    for (const [key, envVar] of envVars.entries()) {
      if (!codeKeys.has(key)) {
        unusedInEnv.push({
          key,
          line: envVar.line
        });
      }
    }
  }

  const criticalErrorsCount =
    missingInEnv.filter((m) => m.required).length +
    typeMismatches.length +
    secretLeaks.length;

  const warningsCount =
    missingInEnv.filter((m) => !m.required).length +
    missingInExample.length +
    staleInExample.length;

  return {
    missingInEnv,
    missingInExample,
    staleInExample,
    typeMismatches,
    secretLeaks,
    unusedInEnv,
    hasErrors: criticalErrorsCount > 0,
    hasWarnings: warningsCount > 0,
    summary: {
      totalCodeKeys: codeKeys.size,
      totalEnvKeys: envVars.size,
      totalExampleKeys: exampleVars.size,
      missingInEnvCount: missingInEnv.length,
      missingInExampleCount: missingInExample.length,
      staleCount: staleInExample.length,
      typeErrorsCount: typeMismatches.length,
      secretsCount: secretLeaks.length
    }
  };
}
