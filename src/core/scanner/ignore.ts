import fs from 'node:fs';
import path from 'node:path';

export const DEFAULT_IGNORED_DIRS = [
  'node_modules',
  '.git',
  '.svn',
  '.hg',
  'dist',
  'build',
  'out',
  '.next',
  '.nuxt',
  '.svelte-kit',
  '.turbo',
  'coverage',
  '.nyc_output',
  'target', // Rust
  'vendor', // Go / PHP
  '__pycache__', // Python
  '.venv',
  'venv',
  '.idea',
  '.vscode',
  '.output'
];

export const DEFAULT_IGNORED_EXTENSIONS = [
  '.min.js',
  '.min.css',
  '.map',
  '.lock',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.svg',
  '.ico',
  '.webp',
  '.mp4',
  '.webm',
  '.mp3',
  '.wav',
  '.pdf',
  '.zip',
  '.tar',
  '.gz',
  '.rar',
  '.7z',
  '.exe',
  '.dll',
  '.so',
  '.dylib',
  '.ttf',
  '.woff',
  '.woff2',
  '.eot'
];

export interface EnvguardIgnoreConfig {
  globPatterns: string[];
  ignoredKeys: Set<string>;
  ignoredRules: Set<string>;
}

export interface FileInlineIgnores {
  ignoredLines: Set<number>;
  lineRuleIgnores: Map<number, Set<string>>;
  lineKeyIgnores: Map<number, Set<string>>;
}

/**
 * Reads and parses .gitignore patterns from directory.
 */
export function loadIgnorePatterns(cwd: string): string[] {
  const patterns: string[] = [];

  const gitignorePath = path.join(cwd, '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    try {
      const content = fs.readFileSync(gitignorePath, 'utf8');
      patterns.push(...parseIgnoreLines(content));
    } catch {
      // Ignore read errors
    }
  }

  const envguardIgnore = loadEnvguardIgnore(cwd);
  patterns.push(...envguardIgnore.globPatterns);

  return patterns;
}

/**
 * Loads and parses .envguardignore file supporting globs, key:<KEY>, and rule:<RULE_ID>.
 */
export function loadEnvguardIgnore(cwd: string): EnvguardIgnoreConfig {
  const result: EnvguardIgnoreConfig = {
    globPatterns: [],
    ignoredKeys: new Set<string>(),
    ignoredRules: new Set<string>()
  };

  const envguardIgnorePath = path.join(cwd, '.envguardignore');
  if (fs.existsSync(envguardIgnorePath)) {
    try {
      const content = fs.readFileSync(envguardIgnorePath, 'utf8');
      const lines = parseIgnoreLines(content);
      for (const line of lines) {
        if (line.startsWith('key:') || line.startsWith('var:')) {
          const key = line.slice(line.indexOf(':') + 1).trim();
          if (key) result.ignoredKeys.add(key);
        } else if (line.startsWith('rule:')) {
          const ruleId = line.slice(5).trim();
          if (ruleId) result.ignoredRules.add(ruleId);
        } else {
          result.globPatterns.push(line);
        }
      }
    } catch {
      // Ignore read errors
    }
  }

  return result;
}

function parseIgnoreLines(content: string): string[] {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
}

/**
 * Scans content for inline ignore directives:
 * - // envguard-ignore-next-line [ruleId/key]
 * - # envguard-ignore-next-line [ruleId/key]
 * - // envguard-ignore [ruleId/key]
 * - # envguard-ignore [ruleId/key]
 * - /* envguard-disable * / ... /* envguard-enable * /
 */
export function parseInlineDirectives(content: string): FileInlineIgnores {
  const ignoredLines = new Set<number>();
  const lineRuleIgnores = new Map<number, Set<string>>();
  const lineKeyIgnores = new Map<number, Set<string>>();

  const lines = content.split(/\r?\n/);
  let blockDisabled = false;

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const line = lines[i];

    // Block disable/enable (exclude -line and -next-line)
    if (/envguard-disable(?!\s*-(?:line|next-line))\b/i.test(line)) {
      blockDisabled = true;
    }
    if (/envguard-enable\b/i.test(line)) {
      blockDisabled = false;
      continue;
    }

    if (blockDisabled) {
      ignoredLines.add(lineNum);
      continue;
    }

    // Ignore next line: // envguard-ignore-next-line or // envguard-disable-next-line or # envguard-ignore-next-line
    const nextLineMatch = line.match(/(?:\/\/|#|\/\*)\s*envguard-(?:ignore|disable)-next-line(?:\s+([a-zA-Z0-9_-]+))?/i);
    if (nextLineMatch) {
      const targetLine = lineNum + 1;
      const specific = nextLineMatch[1]?.trim();
      if (specific) {
        if (specific.includes('-') || specific.startsWith('rule:')) {
          const rule = specific.replace(/^rule:/, '');
          const rules = lineRuleIgnores.get(targetLine) || new Set<string>();
          rules.add(rule);
          lineRuleIgnores.set(targetLine, rules);
        } else {
          const keys = lineKeyIgnores.get(targetLine) || new Set<string>();
          keys.add(specific);
          lineKeyIgnores.set(targetLine, keys);
        }
      } else {
        ignoredLines.add(targetLine);
      }
    }

    // Inline ignore on the same line: // envguard-ignore or // envguard-disable-line
    const sameLineMatch = line.match(/(?:\/\/|#|\/\*)\s*envguard-(?:ignore|disable)(?:-line)?(?!\s*-\s*next-line)(?:\s+([a-zA-Z0-9_:-]+))?/i);
    if (sameLineMatch) {
      const specific = sameLineMatch[1]?.trim();
      if (specific) {
        if (specific.includes('-') || specific.startsWith('rule:')) {
          const rule = specific.replace(/^rule:/, '');
          const rules = lineRuleIgnores.get(lineNum) || new Set<string>();
          rules.add(rule);
          lineRuleIgnores.set(lineNum, rules);
        } else {
          const keys = lineKeyIgnores.get(lineNum) || new Set<string>();
          keys.add(specific);
          lineKeyIgnores.set(lineNum, keys);
        }
      } else {
        ignoredLines.add(lineNum);
      }
    }
  }

  return {
    ignoredLines,
    lineRuleIgnores,
    lineKeyIgnores
  };
}

/**
 * Checks if a specific finding on a line is ignored by inline comments or ignore configuration.
 */
export function isFindingIgnored(
  lineNum: number | undefined,
  ruleId: string | undefined,
  key: string | undefined,
  inlineIgnores: FileInlineIgnores,
  ignoreConfig?: EnvguardIgnoreConfig
): boolean {
  if (ruleId && ignoreConfig?.ignoredRules.has(ruleId)) return true;
  if (key && ignoreConfig?.ignoredKeys.has(key)) return true;

  if (lineNum !== undefined) {
    if (inlineIgnores.ignoredLines.has(lineNum)) return true;
    if (ruleId && inlineIgnores.lineRuleIgnores.get(lineNum)?.has(ruleId)) return true;
    if (key && inlineIgnores.lineKeyIgnores.get(lineNum)?.has(key)) return true;
  }

  return false;
}
