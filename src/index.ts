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
export {
  calculateShannonEntropy,
  calculateNormalizedShannonEntropy,
  detectCharacterSet,
  isHighEntropyString
} from './core/secrets/entropy.js';
export type { CharsetEntropyInfo, CharacterSetType } from './core/secrets/entropy.js';
export { detectSecretsInValue, maskSecret, calculateFindingConfidence } from './core/secrets/detector.js';
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

// Diff Engines (Schema Diff & File-to-File Diff)
export { computeEnvDiff } from './core/diff/env-differ.js';
export type { DiffOptions, DiffResult } from './core/diff/env-differ.js';
export { compareEnvFiles } from './core/diff/file-differ.js';
export type { FileDiffItem, FileDiffResult } from './core/diff/file-differ.js';

// Formatter Engine
export { formatEnv } from './core/formatter/env-formatter.js';
export type { FormatterOptions } from './core/formatter/env-formatter.js';

// Zero-Cloud AES-256-GCM Crypto
export { encryptEnv, decryptEnv, generateEncryptionKey } from './core/crypto/env-crypto.js';

// Runtime Loader & Preloader
export { loadEnv, expandVariables, EnvGuardValidationError } from './runtime/loader.js';
export type { LoadEnvOptions, LoadEnvResult } from './runtime/loader.js';

// Docker & Container Security Guard
export { auditDockerFiles } from './core/docker/docker-guard.js';
export type { DockerAuditResult, DockerFinding } from './core/docker/docker-guard.js';

// Shell Completion Generator
export { generateCompletionScript } from './core/completion/generator.js';
export type { ShellType } from './core/completion/generator.js';

// Sync, Interactive Wizard, Drift Watchdog & Masking
export { syncEnvExample } from './core/sync/env-syncer.js';
export type { SyncOptions, SyncResult } from './core/sync/env-syncer.js';
export { runInteractiveSync } from './core/sync/interactive-syncer.js';
export type { InteractiveSyncOptions, InteractiveSyncResult } from './core/sync/interactive-syncer.js';
export { generateSafePlaceholder } from './core/sync/masker.js';
export { watchEnvironmentDrift, formatDriftReport } from './core/sync/drift-watchdog.js';
export type {
  DriftReport,
  DriftDivergence,
  DriftSeverity,
  DriftDivergenceKind,
  DriftWatchdogOptions
} from './core/sync/drift-watchdog.js';

// Vault Resilience & Infrastructure Exporters
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
export {
  ResilientExecutor,
  sanitizeErrorMessage,
  maskObjectSecrets
} from './core/vault/resilience.js';
export type {
  CircuitState,
  CircuitBreakerOptions,
  CircuitBreakerStats
} from './core/vault/resilience.js';

// IDE, VS Code & Language Server Protocol (LSP) Integration
export { setupVsCodeIntegration } from './core/ide/vscode.js';
export type { VsCodeSetupResult } from './core/ide/vscode.js';
export {
  generateLspDiagnostics,
  toLspRange,
  LspDiagnosticSeverity,
  LspDiagnosticTag
} from './core/ide/lsp-diagnostics.js';
export type {
  LspDiagnostic,
  LspPosition,
  LspRange,
  LspLocation,
  LspDiagnosticRelatedInformation,
  FileLspDiagnostics
} from './core/ide/lsp-diagnostics.js';

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
