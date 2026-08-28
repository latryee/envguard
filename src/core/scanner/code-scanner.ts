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
import { SecretFinding, detectSecretsInValue } from '../secrets/detector.js';

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
  secretLeaks: SecretFinding[];
}

/**
 * Strips comments from code content while preserving line breaks and column positions.
 * Replaces comment characters with spaces so line and column numbers remain accurate.
 */
export function stripComments(content: string, language: CodeReference['language']): string {
  const chars = content.split('');
  const len = chars.length;
  let i = 0;

  if (
    language === 'typescript' ||
    language === 'javascript' ||
    language === 'go' ||
    language === 'rust' ||
    language === 'php'
  ) {
    while (i < len) {
      const char = chars[i];
      const next = chars[i + 1];

      // Single-line comment //
      if (char === '/' && next === '/') {
        chars[i] = ' ';
        chars[i + 1] = ' ';
        i += 2;
        while (i < len && chars[i] !== '\n' && chars[i] !== '\r') {
          chars[i] = ' ';
          i++;
        }
        continue;
      }

      // Block comment /* ... */
      if (char === '/' && next === '*') {
        chars[i] = ' ';
        chars[i + 1] = ' ';
        i += 2;
        while (i < len) {
          if (chars[i] === '*' && chars[i + 1] === '/') {
            chars[i] = ' ';
            chars[i + 1] = ' ';
            i += 2;
            break;
          }
          if (chars[i] !== '\n' && chars[i] !== '\r') {
            chars[i] = ' ';
          }
          i++;
        }
        continue;
      }

      // Single quote string '...'
      if (char === "'") {
        i++;
        while (i < len && chars[i] !== "'") {
          if (chars[i] === '\\') i++;
          i++;
        }
        if (i < len) i++;
        continue;
      }

      // Double quote string "..."
      if (char === '"') {
        i++;
        while (i < len && chars[i] !== '"') {
          if (chars[i] === '\\') i++;
          i++;
        }
        if (i < len) i++;
        continue;
      }

      // Template literal `...`
      if (char === '`') {
        i++;
        while (i < len && chars[i] !== '`') {
          if (chars[i] === '\\') {
            i += 2;
            continue;
          }
          if (chars[i] === '$' && chars[i + 1] === '{') {
            // Enter expression inside template literal
            i += 2;
            let depth = 1;
            while (i < len && depth > 0) {
              if (chars[i] === '/' && chars[i + 1] === '/') {
                chars[i] = ' ';
                chars[i + 1] = ' ';
                i += 2;
                while (i < len && chars[i] !== '\n' && chars[i] !== '\r') {
                  chars[i] = ' ';
                  i++;
                }
                continue;
              }
              if (chars[i] === '/' && chars[i + 1] === '*') {
                chars[i] = ' ';
                chars[i + 1] = ' ';
                i += 2;
                while (i < len) {
                  if (chars[i] === '*' && chars[i + 1] === '/') {
                    chars[i] = ' ';
                    chars[i + 1] = ' ';
                    i += 2;
                    break;
                  }
                  if (chars[i] !== '\n' && chars[i] !== '\r') {
                    chars[i] = ' ';
                  }
                  i++;
                }
                continue;
              }
              if (chars[i] === "'") {
                i++;
                while (i < len && chars[i] !== "'") {
                  if (chars[i] === '\\') i++;
                  i++;
                }
                if (i < len) i++;
                continue;
              }
              if (chars[i] === '"') {
                i++;
                while (i < len && chars[i] !== '"') {
                  if (chars[i] === '\\') i++;
                  i++;
                }
                if (i < len) i++;
                continue;
              }
              if (chars[i] === '{') depth++;
              else if (chars[i] === '}') depth--;
              if (depth === 0) {
                i++;
                break;
              }
              i++;
            }
            continue;
          }
          i++;
        }
        if (i < len) i++;
        continue;
      }

      // PHP # comment
      if (language === 'php' && char === '#') {
        chars[i] = ' ';
        i++;
        while (i < len && chars[i] !== '\n' && chars[i] !== '\r') {
          chars[i] = ' ';
          i++;
        }
        continue;
      }

      i++;
    }
  } else if (language === 'python' || language === 'ruby' || language === 'shell') {
    while (i < len) {
      const char = chars[i];

      // Triple quoted strings in Python
      if (language === 'python') {
        const triple = chars.slice(i, i + 3).join('');
        if (triple === '"""' || triple === "'''") {
          i += 3;
          while (i < len && chars.slice(i, i + 3).join('') !== triple) {
            if (chars[i] === '\\') i++;
            i++;
          }
          if (i < len) i += 3;
          continue;
        }
      }

      // Single quote
      if (char === "'") {
        i++;
        while (i < len && chars[i] !== "'") {
          if (chars[i] === '\\') i++;
          i++;
        }
        if (i < len) i++;
        continue;
      }

      // Double quote
      if (char === '"') {
        i++;
        while (i < len && chars[i] !== '"') {
          if (chars[i] === '\\') i++;
          i++;
        }
        if (i < len) i++;
        continue;
      }

      // Hash comment #
      if (char === '#') {
        chars[i] = ' ';
        i++;
        while (i < len && chars[i] !== '\n' && chars[i] !== '\r') {
          chars[i] = ' ';
          i++;
        }
        continue;
      }

      i++;
    }
  }

  return chars.join('');
}

function getLineAndColumn(
  content: string,
  charIndex: number,
  originalLines: string[]
): { line: number; column: number; snippet: string } {
  let line = 1;
  let lastNewline = -1;
  for (let i = 0; i < charIndex && i < content.length; i++) {
    if (content[i] === '\n') {
      line++;
      lastNewline = i;
    }
  }
  const column = charIndex - lastNewline;
  const snippet = originalLines[line - 1] ? originalLines[line - 1].trim() : '';
  return { line, column, snippet };
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
      scannedFilesCount: 0,
      secretLeaks: []
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
  const secretLeaks: SecretFinding[] = [];
  let scannedFilesCount = 0;

  // JS/TS Destructuring Regex (supports single-line and multiline): const { A, B: renamed, C = default } = process.env
  const jsDestructuringRegex = /(?:(?:const|let|var)\s*\{|(?:\(|^|\s)\{\s*)([\s\S]*?)\}\s*(?::\s*[^=]+)?=\s*(?:process\.env|import\.meta\.env|Bun\.env)\b/g;

  for (const file of files) {
    const filename = path.basename(file);
    const ext = path.extname(file);

    // Find matching language pattern
    const matchingLang = LANGUAGE_PATTERNS.find(
      (p) => p.extensions.includes(ext) || p.extensions.includes(filename)
    );

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

    scannedFilesCount++;

    const relFilePath = path.relative(cwd, file).replace(/\\/g, '/');
    const lines = content.split(/\r?\n/);

    // 1. Scan all lines in the file for secret leaks
    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const lineContent = lines[lineIdx];
      const lineNum = lineIdx + 1;
      if (lineContent.trim()) {
        const findings = detectSecretsInValue(lineContent, undefined, lineNum, {
          file: relFilePath,
          allowHighEntropy: true
        });
        if (findings.length > 0) {
          secretLeaks.push(...findings);
        }
      }
    }

    // 2. Scan for language-specific environment variable references
    if (!matchingLang) {
      continue;
    }

    const strippedContent = stripComments(content, matchingLang.language);
    const strippedLines = strippedContent.split(/\r?\n/);

    // Handle JS/TS destructuring (both single-line and multi-line)
    if (matchingLang.language === 'typescript') {
      jsDestructuringRegex.lastIndex = 0;
      let dMatch: RegExpExecArray | null;
      while ((dMatch = jsDestructuringRegex.exec(strippedContent)) !== null) {
        const rawBlock = dMatch[1];
        const blockStartIndex = dMatch.index + dMatch[0].indexOf(rawBlock);
        const parts = rawBlock.split(',');
        let currentOffset = 0;

        for (const rawPart of parts) {
          const partOffset = rawBlock.indexOf(rawPart, currentOffset);
          currentOffset = partOffset + rawPart.length;

          const trimmedPart = rawPart.trim();
          if (!trimmedPart) continue;

          // Handle rename (A: b) or default assignment (A = 'default')
          const varName = trimmedPart.split(/[:=]/)[0].trim();
          if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(varName) && !ignoredKeys.has(varName)) {
            const varIndexInBlock = partOffset + rawPart.indexOf(varName);
            const absCharIndex = blockStartIndex + varIndexInBlock;
            const { line: varLine, column: varCol, snippet } = getLineAndColumn(strippedContent, absCharIndex, lines);

            const ref: CodeReference = {
              key: varName,
              file: relFilePath,
              line: varLine,
              column: varCol,
              snippet,
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

    // Handle standard property accesses / function calls line by line on stripped content
    for (let lineIdx = 0; lineIdx < strippedLines.length; lineIdx++) {
      const strippedLine = strippedLines[lineIdx];
      const lineNum = lineIdx + 1;
      const originalSnippet = lines[lineIdx] ? lines[lineIdx].trim() : '';

      if (!strippedLine.trim()) {
        continue;
      }

      for (const regex of matchingLang.regexes) {
        regex.lastIndex = 0;
        let match: RegExpExecArray | null;

        while ((match = regex.exec(strippedLine)) !== null) {
          const varName = match[1];
          if (!varName || ignoredKeys.has(varName)) {
            continue;
          }

          const colNum = match.index + 1;
          const ref: CodeReference = {
            key: varName,
            file: relFilePath,
            line: lineNum,
            column: colNum,
            snippet: originalSnippet,
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
    scannedFilesCount,
    secretLeaks
  };
}

