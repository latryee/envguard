import fs from 'node:fs';
import path from 'node:path';
import { parseEnv } from '../core/parser/env-parser.js';
import { createSchemaFromAnnotations } from '../core/validator/schema.js';
import { validateFieldValue } from '../core/validator/type-validator.js';

export interface LoadEnvOptions {
  cwd?: string;
  path?: string | string[];
  examplePath?: string;
  override?: boolean;
  expand?: boolean;
  strict?: boolean;
  validate?: boolean;
}

export interface LoadEnvResult {
  parsed: Record<string, string>;
  loadedFiles: string[];
}

export class EnvGuardValidationError extends Error {
  public errors: string[];

  constructor(errors: string[]) {
    super(`[envguard] Environment validation failed:\n  - ${errors.join('\n  - ')}`);
    this.name = 'EnvGuardValidationError';
    this.errors = errors;
  }
}

/**
 * Expands variable placeholders like ${PORT} or ${HOST:-localhost}
 */
export function expandVariables(value: string, env: Record<string, string | undefined>): string {
  return value.replace(/\$\{([a-zA-Z0-9_]+)(?::-([^}]*))?\}/g, (match, varName, defaultVal) => {
    const existing = env[varName];
    if (existing !== undefined && existing !== '') {
      return existing;
    }
    return defaultVal !== undefined ? defaultVal : match;
  });
}

/**
 * In-process runtime environment loader with variable expansion and schema validation
 */
export function loadEnv(options: LoadEnvOptions = {}): LoadEnvResult {
  const cwd = options.cwd ?? process.cwd();
  const override = options.override ?? false;
  const shouldExpand = options.expand ?? true;
  const shouldValidate = options.validate ?? options.strict ?? false;

  const targetPaths = Array.isArray(options.path)
    ? options.path
    : [options.path || '.env'];

  const loadedFiles: string[] = [];
  const parsed: Record<string, string> = {};

  for (const p of targetPaths) {
    const absPath = path.resolve(cwd, p);
    if (fs.existsSync(absPath)) {
      const raw = fs.readFileSync(absPath, 'utf8');
      const ast = parseEnv(raw);
      loadedFiles.push(p);

      for (const [key, v] of ast.variables) {
        let finalVal = v.value;
        if (shouldExpand) {
          finalVal = expandVariables(finalVal, { ...process.env, ...parsed });
        }
        parsed[key] = finalVal;

        if (override || process.env[key] === undefined) {
          process.env[key] = finalVal;
        }
      }
    }
  }

  // Schema validation against .env.example if requested
  if (shouldValidate) {
    const exampleFile = path.resolve(cwd, options.examplePath || '.env.example');
    if (fs.existsSync(exampleFile)) {
      const exampleRaw = fs.readFileSync(exampleFile, 'utf8');
      const exampleAst = parseEnv(exampleRaw);

      const validationErrors: string[] = [];

      for (const [key, exampleVar] of exampleAst.variables) {
        const schema = createSchemaFromAnnotations(key, exampleVar.annotations);
        const actualVal = process.env[key];

        if (actualVal === undefined) {
          if (schema.required) {
            validationErrors.push(`Missing required environment variable: ${key}`);
          }
        } else {
          const err = validateFieldValue(actualVal, schema);
          if (err) {
            validationErrors.push(
              `Invalid value for "${key}" (value: "${actualVal}"): ${err.message}`
            );
          }
        }
      }

      if (validationErrors.length > 0) {
        throw new EnvGuardValidationError(validationErrors);
      }
    }
  }

  return {
    parsed,
    loadedFiles
  };
}
