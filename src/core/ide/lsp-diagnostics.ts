import { DiffResult } from '../diff/env-differ.js';

export enum LspDiagnosticSeverity {
  Error = 1,
  Warning = 2,
  Information = 3,
  Hint = 4
}

export enum LspDiagnosticTag {
  Unnecessary = 1,
  Deprecated = 2
}

export interface LspPosition {
  line: number; // 0-indexed per LSP standard
  character: number; // 0-indexed per LSP standard
}

export interface LspRange {
  start: LspPosition;
  end: LspPosition;
}

export interface LspLocation {
  uri: string;
  range: LspRange;
}

export interface LspDiagnosticRelatedInformation {
  location: LspLocation;
  message: string;
}

export interface LspDiagnostic {
  range: LspRange;
  severity: LspDiagnosticSeverity;
  code: string;
  source: 'envguard';
  message: string;
  tags?: LspDiagnosticTag[];
  relatedInformation?: LspDiagnosticRelatedInformation[];
}

export interface FileLspDiagnostics {
  uri: string;
  diagnostics: LspDiagnostic[];
}

/**
 * Converts a 1-indexed line and column into a 0-indexed LSP Range.
 */
export function toLspRange(line = 1, column = 1, length = 1): LspRange {
  const zeroLine = Math.max(0, line - 1);
  const zeroCol = Math.max(0, column - 1);
  return {
    start: { line: zeroLine, character: zeroCol },
    end: { line: zeroLine, character: zeroCol + Math.max(1, length) }
  };
}

/**
 * Generates schema-compliant Language Server Protocol (LSP) Diagnostics from EnvGuard DiffResult.
 * Groups diagnostics per file URI for seamless IDE publishDiagnostics dispatch.
 */
export function generateLspDiagnostics(diff: DiffResult, baseUri = 'file:///'): Map<string, LspDiagnostic[]> {
  const fileDiagnosticsMap = new Map<string, LspDiagnostic[]>();

  const getList = (filePath: string): LspDiagnostic[] => {
    const norm = (filePath || '.env').replace(/\\/g, '/');
    let uri: string;
    if (norm.startsWith('file://')) {
      uri = norm;
    } else {
      const cleanPath = norm.replace(/^\/+/, '');
      const cleanBase = baseUri.endsWith('/') ? baseUri : `${baseUri}/`;
      uri = `${cleanBase}${cleanPath}`;
    }

    if (!fileDiagnosticsMap.has(uri)) {
      fileDiagnosticsMap.set(uri, []);
    }
    return fileDiagnosticsMap.get(uri)!;
  };

  // 1. Secret leaks -> LSP Errors
  for (const leak of diff.secretLeaks) {
    const list = getList(leak.file || '.env');
    const range = toLspRange(leak.line || 1, 1, 20);
    list.push({
      range,
      severity: LspDiagnosticSeverity.Error,
      code: leak.ruleId,
      source: 'envguard',
      message: `[${leak.ruleName}] ${leak.description} Masked: ${leak.snippetMasked}. Fix: ${leak.remediation}`
    });
  }

  // 2. Framework Client Leaks -> LSP Errors
  if (diff.clientLeaks) {
    for (const cl of diff.clientLeaks) {
      const list = getList(cl.filePath);
      const range = toLspRange(cl.line, cl.column, cl.key.length);
      list.push({
        range,
        severity: LspDiagnosticSeverity.Error,
        code: 'framework-client-leak',
        source: 'envguard',
        message: `Private server secret "${cl.key}" referenced in client bundle (${cl.framework}). Client variables must start with "${cl.expectedPrefix}".`
      });
    }
  }

  // 3. Type Mismatches -> LSP Errors
  for (const err of diff.typeMismatches) {
    const list = getList('.env');
    const range = toLspRange(err.line || 1, 1, err.key.length);
    list.push({
      range,
      severity: LspDiagnosticSeverity.Error,
      code: 'env-type-mismatch',
      source: 'envguard',
      message: `Variable "${err.key}": ${err.message} (Expected: ${err.expectedType}, got: "${err.value}")`
    });
  }

  // 4. Missing required in .env -> LSP Errors
  for (const missing of diff.missingInEnv.filter((m) => m.required)) {
    if (missing.references && missing.references.length > 0) {
      for (const ref of missing.references) {
        const list = getList(ref.file);
        const range = toLspRange(ref.line, ref.column, missing.key.length);
        list.push({
          range,
          severity: LspDiagnosticSeverity.Error,
          code: 'missing-required-env',
          source: 'envguard',
          message: `Required environment variable "${missing.key}" is referenced here but missing in .env.`
        });
      }
    } else {
      const list = getList('.env');
      list.push({
        range: toLspRange(1, 1, missing.key.length),
        severity: LspDiagnosticSeverity.Error,
        code: 'missing-required-env',
        source: 'envguard',
        message: `Required environment variable "${missing.key}" defined in schema is missing in .env.`
      });
    }
  }

  // 5. Missing in .env.example (Drift) -> LSP Warnings
  for (const missing of diff.missingInExample) {
    if (missing.references && missing.references.length > 0) {
      for (const ref of missing.references) {
        const list = getList(ref.file);
        const range = toLspRange(ref.line, ref.column, missing.key.length);
        list.push({
          range,
          severity: LspDiagnosticSeverity.Warning,
          code: 'undocumented-env-variable',
          source: 'envguard',
          message: `Variable "${missing.key}" is used in code but undocumented in .env.example.`
        });
      }
    } else {
      const list = getList('.env.example');
      list.push({
        range: toLspRange(1, 1, missing.key.length),
        severity: LspDiagnosticSeverity.Warning,
        code: 'undocumented-env-variable',
        source: 'envguard',
        message: `Variable "${missing.key}" is present in .env but undocumented in .env.example.`
      });
    }
  }

  // 6. Stale variables in .env.example -> LSP Hints with Unnecessary Tag
  for (const stale of diff.staleInExample) {
    const list = getList('.env.example');
    const range = toLspRange(stale.line, 1, stale.key.length);
    list.push({
      range,
      severity: LspDiagnosticSeverity.Hint,
      code: 'stale-env-variable',
      source: 'envguard',
      tags: [LspDiagnosticTag.Unnecessary],
      message: `Variable "${stale.key}" appears to be unused across source code and .env.`
    });
  }

  return fileDiagnosticsMap;
}
