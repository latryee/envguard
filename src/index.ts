// Core AST & Parser
export { parseEnv, serializeEnv, parseAnnotations } from './core/parser/env-parser.js';
export type {
  EnvAnnotations,
  EnvAstEntry,
  EnvComment,
  EnvEmptyLine,
  EnvFileAst,
  EnvVariable,
  InferredType,
  ParseOptions
} from './core/parser/types.js';

// Scanner
export { scanCodebase } from './core/scanner/code-scanner.js';
export type { ScanOptions, ScanResult } from './core/scanner/code-scanner.js';
export { LANGUAGE_PATTERNS, SYSTEM_ENV_VARS } from './core/scanner/patterns.js';
export type { CodeReference, LanguagePattern } from './core/scanner/patterns.js';

// Secrets & Entropy
export { calculateShannonEntropy, isHighEntropyString } from './core/secrets/entropy.js';
export { detectSecretsInValue, maskSecret } from './core/secrets/detector.js';
export type { SecretFinding, DetectSecretsOptions } from './core/secrets/detector.js';
export { SECRET_RULES } from './core/secrets/rules.js';
export type { SecretRule } from './core/secrets/rules.js';
export { isSafePlaceholder, SAFE_PLACEHOLDERS } from './core/secrets/whitelist.js';

// Type Validation & Schema
export { inferType } from './core/validator/type-inference.js';
export { createSchemaFromAnnotations } from './core/validator/schema.js';
export type { EnvFieldSchema } from './core/validator/schema.js';
export { validateFieldValue } from './core/validator/type-validator.js';
export type { ValidationError } from './core/validator/type-validator.js';

// Diff Engine
export { computeEnvDiff } from './core/diff/env-differ.js';
export type { DiffOptions, DiffResult } from './core/diff/env-differ.js';

// Sync & Masking
export { syncEnvExample } from './core/sync/env-syncer.js';
export type { SyncOptions, SyncResult } from './core/sync/env-syncer.js';
export { generateSafePlaceholder } from './core/sync/masker.js';

// Generator
export { generateTypeDeclarations } from './core/generator/types-generator.js';
export type { GenerateTypesOptions, GenerateTypesResult } from './core/generator/types-generator.js';

// Git & Hooks
export { isGitRepository, getGitRoot, getStagedFiles } from './core/git/git-utils.js';
export { installPreCommitHook } from './core/git/hooks.js';
export type { HookInstallResult } from './core/git/hooks.js';

// Configuration
export { loadConfig } from './core/config/config-loader.js';
export { DEFAULT_CONFIG } from './core/config/defaults.js';
export type { EnvGuardConfig } from './core/config/defaults.js';

// Reporters
export { renderTerminalReport } from './reporters/terminal-reporter.js';
export { renderJsonReport } from './reporters/json-reporter.js';
export { renderGitHubReport } from './reporters/github-reporter.js';
