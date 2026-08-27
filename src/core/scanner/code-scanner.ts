import fs from 'node:fs';
import path from 'node:path';
import fg from 'fast-glob';
import {
  CodeReference,
  LANGUAGE_PATTERNS,
  SYSTEM_ENV_VARS
} from './patterns.js';
import {
  DEFAULT_IGNORED_DIRS,
  DEFAULT_IGNORED_EXTENSIONS,
  loadIgnorePatterns
} from './ignore.js';

export interface ScanOptions {
  cwd?: string;
  includeSystemVars?: boolean;
  ignoredKeys?: string[];
  customGlobs?: string[];
  ignoreGlobs?: string[];
}

export interface ScanResult {
  references: CodeReference[];
  uniqueKeys: Set<string>;
  keyLocations: Map<string, CodeReference[]>;
  scannedFilesCount: number;
}

/**
 * Scans code files across supported programming languages to find all environment variable usages.
 */
export async function scanCodebase(options: ScanOptions = {}): Promise<ScanResult> {
  const cwd = options.cwd ? path.resolve(options.cwd) : process.cwd();
  const ignoredKeys = new Set(options.ignoredKeys || []);
  if (!options.includeSystemVars) {
    for (const key of SYSTEM_ENV_VARS) {
      ignoredKeys.add(key);
    }
  }

  const userIgnorePatterns = loadIgnorePatterns(cwd);
  const ignorePatterns = [
    ...DEFAULT_IGNORED_DIRS.map((d) => `**/${d}/**`),
    ...DEFAULT_IGNORED_DIRS.map((d) => `**/${d}`),
    ...DEFAULT_IGNORED_EXTENSIONS.map((ext) => `**/*${ext}`),
    '**/.env*',
    ...userIgnorePatterns,
    ...(options.ignoreGlobs || [])
  ];

  // Collect all supported file extensions
  const allExtensions = new Set<string>();
  for (const lang of LANGUAGE_PATTERNS) {
    for (const ext of lang.extensions) {
      allExtensions.add(ext);
    }
  }

  const globPatterns = options.customGlobs && options.customGlobs.length > 0
    ? options.customGlobs
    : ['**/*'];

  const files = await fg(globPatterns, {
    cwd,
    ignore: ignorePatterns,
    dot: false,
    absolute: true,
    onlyFiles: true,
    followSymbolicLinks: false
  });

  const references: CodeReference[] = [];
  const uniqueKeys = new Set<string>();
  const keyLocations = new Map<string, CodeReference[]>();
  let scannedFilesCount = 0;

  for (const file of files) {
    const filename = path.basename(file);
    const ext = path.extname(file);

    // Find matching language pattern
    const matchingLang = LANGUAGE_PATTERNS.find(
      (p) => p.extensions.includes(ext) || p.extensions.includes(filename)
    );

    if (!matchingLang) {
      continue;
    }

    scannedFilesCount++;

    let content: string;
    try {
      content = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }

    const lines = content.split(/\r?\n/);

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const lineContent = lines[lineIdx];
      const lineNum = lineIdx + 1;

      for (const regex of matchingLang.regexes) {
        // Reset regex state
        regex.lastIndex = 0;
        let match: RegExpExecArray | null;

        while ((match = regex.exec(lineContent)) !== null) {
          const varName = match[1];
          if (!varName || ignoredKeys.has(varName)) {
            continue;
          }

          const colNum = match.index + 1;
          const ref: CodeReference = {
            key: varName,
            file: path.relative(cwd, file).replace(/\\/g, '/'),
            line: lineNum,
            column: colNum,
            snippet: lineContent.trim(),
            language: matchingLang.language
          };

          references.push(ref);
          uniqueKeys.add(varName);

          const existing = keyLocations.get(varName) || [];
          existing.push(ref);
          keyLocations.set(varName, existing);
        }
      }
    }
  }

  return {
    references,
    uniqueKeys,
    keyLocations,
    scannedFilesCount
  };
}
