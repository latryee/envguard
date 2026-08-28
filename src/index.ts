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

// Scanner & AST
export { scanCodebase, stripComments } from './core/scanner/code-scanner.js';
export type { ScanOptions, ScanResult } from './core/scanner/code-scanner.js';
export { scanTsAst } from './core/scanner/ts-ast-scanner.js';
export type { TsAstScanOptions } from './core/scanner/ts-ast-scanner.js';
export { LANGUAGE_PATTERNS, SYSTEM_ENV_VARS } from './core/scanner/patterns.js';
export type { CodeReference, LanguagePattern } from './core/scanner/patterns.js';
export {
  loadIgnorePatterns,
  loadEnvguardIgnore,
  parseInlineDirectives,
  isFindingIgnored
} from './core/scanner/ignore.js';
export type { EnvguardIgnoreConfig, FileInlineIgnores } from './core/scanner/ignore.js';

// Frameworks & Client-Side Leak Prevention
export { detectFramework, getFrameworkInfo } from './core/frameworks/detector.js';
export type { FrameworkInfo, SupportedFramework } from './core/frameworks/detector.js';
export { loadCascadingEnv } from './core/frameworks/cascade.js';
export type { CascadingEnvResult } from './core/frameworks/cascade.js';
export { isClientContext, checkClientSideExposures } from './core/frameworks/client-leak.js';
export type { ClientExposureFinding } from './core/frameworks/client-leak.js';

// Secrets & Entropy
export { calculateShannonEntropy, isHighEntropyString } from './core/secrets/entropy.js';
export { detectSecretsInValue, maskSecret } from './core/secrets/detector.js';
export type { SecretFinding, DetectSecretsOptions } from './core/secrets/detector.js';
export { SECRET_RULES } from './core/secrets/rules.js';
export type { SecretRule } from './core/secrets/rules.js';
export { isSafePlaceholder, SAFE_PLACEHOLDERS } from './core/secrets/whitelist.js';

// Type Validation & Schema
export { inferType, isCronExpression } from './core/validator/type-inference.js';
export { createSchemaFromAnnotations } from './core/validator/schema.js';
export type { EnvFieldSchema } from './core/validator/schema.js';
export { validateFieldValue } from './core/validator/type-validator.js';
export type { ValidationError } from './core/validator/type-validator.js';

// Diff Engine
export { computeEnvDiff } from './core/diff/env-differ.js';
export type { DiffOptions, DiffResult } from './core/diff/env-differ.js';

// Sync, Interactive Wizard & Masking
export { syncEnvExample } from './core/sync/env-syncer.js';
export type { SyncOptions, SyncResult } from './core/sync/env-syncer.js';
export { runInteractiveSync } from './core/sync/interactive-syncer.js';
export type { InteractiveSyncOptions, InteractiveSyncResult } from './core/sync/interactive-syncer.js';
export { generateSafePlaceholder } from './core/sync/masker.js';

// Vault & Infrastructure Exporters
export {
  exportToK8sSecret,
  exportToDockerCompose,
  exportToTerraform,
  exportToHelm,
  exportToJson,
  exportToJsonSchema,
  exportEnv
} from './core/vault/exporter.js';
export type { ExportFormat, ExporterOptions } from './core/vault/exporter.js';
export { pullFromVault } from './core/vault/providers.js';
export type { PullSecretsOptions, PullSecretsResult, VaultProvider } from './core/vault/providers.js';

// IDE & VS Code Integration
export { setupVsCodeIntegration } from './core/ide/vscode.js';
export type { VsCodeSetupResult } from './core/ide/vscode.js';

// Generator
export { generateTypeDeclarations } from './core/generator/types-generator.js';
export type { GenerateTypesOptions, GenerateTypesResult } from './core/generator/types-generator.js';

// Git & Hooks & History
export {
  isGitRepository,
  getGitRoot,
  getStagedFiles,
  getStagedFileContent,
  scanGitHistory
} from './core/git/git-utils.js';
export type { ScanGitHistoryOptions } from './core/git/git-utils.js';
export { installPreCommitHook } from './core/git/hooks.js';
export type { HookInstallResult } from './core/git/hooks.js';

// Monorepo & Workspaces
export { findWorkspaces } from './core/monorepo/workspaces.js';
export type { WorkspacePackage } from './core/monorepo/workspaces.js';

// Configuration
export { loadConfig } from './core/config/config-loader.js';
export type { LoadedConfig } from './core/config/config-loader.js';
export { DEFAULT_CONFIG } from './core/config/defaults.js';
export type { EnvGuardConfig, SecretDetectionConfig } from './core/config/defaults.js';

// Terminal Prompter UI
export { promptQuestion, promptSelect, promptConfirm } from './cli/ui/prompt.js';
export type { PromptSelectOption } from './cli/ui/prompt.js';

// Reporters
export { renderTerminalReport } from './reporters/terminal-reporter.js';
export { renderJsonReport } from './reporters/json-reporter.js';
export { renderGitHubReport } from './reporters/github-reporter.js';
export { renderSarifReport } from './reporters/sarif-reporter.js';
export { renderPrCommentReport } from './reporters/pr-comment-reporter.js';
