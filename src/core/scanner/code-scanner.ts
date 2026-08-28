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
import { getStagedFileContent } from '../git/git-utils.js';

export interface ScanOptions {
  cwd?: string;
  includeSystemVars?: boolean;
  ignoredKeys?: string[];
  customGlobs?: string[];
  ignoreGlobs?: string[];
  staged?: boolean;
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

  if (options.customGlobs !== undefined && options.customGlobs.length === 0) {
    return {
      references: [],
      uniqueKeys: new Set(),
      keyLocations: new Map(),
      scannedFilesCount: 0
    };
  }

  let files: string[];
  if (options.staged && options.customGlobs && options.customGlobs.length > 0) {
    // When scanning staged files, resolve paths directly without requiring files to exist on disk
    files = options.customGlobs
      .map((p) => path.resolve(cwd, p))
      .filter((file) => {
        const rel = path.relative(cwd, file).replace(/\\/g, '/');
        const ext = path.extname(file).toLowerCase();
        if (DEFAULT_IGNORED_EXTENSIONS.includes(ext)) return false;
        const segments = rel.split('/');
        if (segments.some((s) => DEFAULT_IGNORED_DIRS.includes(s))) return false;
        if (segments.some((s) => s.startsWith('.env'))) return false;
        return true;
      });
  } else {
    const globPatterns = options.customGlobs && options.customGlobs.length > 0
      ? options.customGlobs
      : ['**/*'];

    files = await fg(globPatterns, {
      cwd,
      ignore: ignorePatterns,
      dot: false,
      absolute: true,
      onlyFiles: true,
      followSymbolicLinks: false
    });
  }

  const references: CodeReference[] = [];
  const uniqueKeys = new Set<string>();
  const keyLocations = new Map<string, CodeReference[]>();
  let scannedFilesCount = 0;

  // JS/TS Destructuring Regex: const { A, B: renamed, C = default } = process.env
  const jsDestructuringRegex = /(?:(?:const|let|var)\s*\{|(?:\(|^|\s)\{\s*)([^}]+)\}\s*=\s*(?:process\.env|import\.meta\.env|Bun\.env)\b/g;

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
    if (options.staged) {
      const stagedContent = getStagedFileContent(file, cwd);
      if (stagedContent === null) {
        continue;
      }
      content = stagedContent;
    } else {
      try {
        content = fs.readFileSync(file, 'utf8');
      } catch {
        continue;
      }
    }


    const lines = content.split(/\r?\n/);

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const lineContent = lines[lineIdx];
      const lineNum = lineIdx + 1;
      const trimmedLine = lineContent.trim();

      // Skip empty lines or comment lines
      if (
        !trimmedLine ||
        trimmedLine.startsWith('//') ||
        trimmedLine.startsWith('/*') ||
        trimmedLine.startsWith('*') ||
        (trimmedLine.startsWith('#') && matchingLang.language !== 'docker') ||
        trimmedLine.startsWith('--')
      ) {
        continue;
      }

      // Handle JS/TS destructuring
      if (matchingLang.language === 'typescript') {
        jsDestructuringRegex.lastIndex = 0;
        let dMatch: RegExpExecArray | null;
        while ((dMatch = jsDestructuringRegex.exec(lineContent)) !== null) {
          const rawBlock = dMatch[1];
          const parts = rawBlock.split(',');
          for (const rawPart of parts) {
            const trimmedPart = rawPart.trim();
            if (!trimmedPart) continue;
            // Handle rename (A: b) or default assignment (A = 'default')
            const varName = trimmedPart.split(/[:=]/)[0].trim();
            if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(varName) && !ignoredKeys.has(varName)) {
              const ref: CodeReference = {
                key: varName,
                file: path.relative(cwd, file).replace(/\\/g, '/'),
                line: lineNum,
                column: dMatch.index + 1,
                snippet: lineContent.trim(),
                language: 'typescript'
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
