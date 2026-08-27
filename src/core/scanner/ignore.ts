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

/**
 * Reads and parses .gitignore / .envguardignore patterns from directory.
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

  const envguardIgnorePath = path.join(cwd, '.envguardignore');
  if (fs.existsSync(envguardIgnorePath)) {
    try {
      const content = fs.readFileSync(envguardIgnorePath, 'utf8');
      patterns.push(...parseIgnoreLines(content));
    } catch {
      // Ignore read errors
    }
  }

  return patterns;
}

function parseIgnoreLines(content: string): string[] {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
}
