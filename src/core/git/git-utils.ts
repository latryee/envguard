import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, execSync } from 'node:child_process';
import { SecretFinding, detectSecretsInValue, DetectSecretsOptions } from '../secrets/detector.js';

function canonicalizePath(p: string): string {
  try {
    return fs.realpathSync.native ? fs.realpathSync.native(p) : fs.realpathSync(p);
  } catch {
    return path.resolve(p);
  }
}

/**
 * Checks if the given directory is within a Git repository.
 */
export function isGitRepository(cwd = process.cwd()): boolean {
  return getGitRoot(cwd) !== null;
}

/**
 * Gets the root directory of the Git repository.
 */
export function getGitRoot(cwd = process.cwd()): string | null {
  const canonicalCwd = canonicalizePath(cwd);
  if (fs.existsSync(path.join(canonicalCwd, '.git')) || fs.existsSync(path.join(cwd, '.git'))) {
    return canonicalCwd;
  }
  try {
    const output = execSync('git rev-parse --show-toplevel', {
      cwd,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    return canonicalizePath(output.trim());
  } catch {
    return null;
  }
}

/**
 * Returns a list of all staged file paths relative to Git root.
 */
export function getStagedFiles(cwd = process.cwd()): string[] {
  const root = getGitRoot(cwd);
  if (!root) return [];
  const canonicalCwd = canonicalizePath(cwd);
  try {
    const output = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR'], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    return output
      .split(/\r?\n/)
      .map((f) => f.trim())
      .filter(Boolean)
      .map((f) => {
        const abs = canonicalizePath(path.resolve(root, f));
        return path.relative(canonicalCwd, abs).replace(/\\/g, '/');
      });
  } catch {
    return [];
  }
}

/**
 * Reads a staged file's content directly from the Git index.
 * Returns null if the file is not staged, is binary, or cannot be read.
 */
export function getStagedFileContent(filePath: string, cwd = process.cwd()): string | null {
  const root = getGitRoot(cwd);
  if (!root) {
    return null;
  }

  try {
    const absPath = path.isAbsolute(filePath) ? filePath : path.resolve(cwd, filePath);
    const canonicalAbs = canonicalizePath(absPath);
    const relFromRoot = path.relative(root, canonicalAbs).replace(/\\/g, '/');

    const output = execFileSync('git', ['show', `:${relFromRoot}`], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      maxBuffer: 20 * 1024 * 1024
    });

    // Check for null bytes indicative of binary files
    if (output.includes('\0')) {
      return null;
    }

    return output;
  } catch {
    return null;
  }
}

export interface ScanGitHistoryOptions {
  cwd?: string;
  maxCommits?: number;
  since?: string;
  detectOptions?: DetectSecretsOptions;
}

/**
 * Scans past Git commit diffs for hardcoded secret leaks across repository history.
 */
export function scanGitHistory(options: ScanGitHistoryOptions = {}): SecretFinding[] {
  const cwd = options.cwd ? path.resolve(options.cwd) : process.cwd();
  const root = getGitRoot(cwd);
  if (!root) {
    return [];
  }

  const args = ['log', '-p', '--no-color', '--diff-filter=AM'];
  if (options.maxCommits && options.maxCommits > 0) {
    args.push(`-n`, String(options.maxCommits));
  }
  if (options.since) {
    args.push(`--since=${options.since}`);
  }

  let logOutput: string;
  try {
    logOutput = execFileSync('git', args, {
      cwd: root,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      maxBuffer: 50 * 1024 * 1024
    });
  } catch {
    return [];
  }

  const findings: SecretFinding[] = [];
  const lines = logOutput.split(/\r?\n/);

  let currentCommit = '';
  let currentAuthor = '';
  let currentDate = '';
  let currentFile = '';
  let currentLineInDiff = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('commit ')) {
      currentCommit = line.slice(7).trim().slice(0, 12);
      currentFile = '';
      continue;
    }

    if (line.startsWith('Author: ')) {
      currentAuthor = line.slice(8).trim();
      continue;
    }

    if (line.startsWith('Date: ')) {
      currentDate = line.slice(6).trim();
      continue;
    }

    if (line.startsWith('+++ b/')) {
      currentFile = line.slice(6).trim();
      currentLineInDiff = 0;
      continue;
    }

    if (line.startsWith('@@ ')) {
      // Chunk header e.g. @@ -1,5 +1,10 @@
      const match = line.match(/\+([0-9]+)/);
      if (match) {
        currentLineInDiff = parseInt(match[1], 10) - 1;
      }
      continue;
    }

    if (line.startsWith('+') && !line.startsWith('+++')) {
      currentLineInDiff++;
      const addedContent = line.slice(1);
      if (addedContent.trim()) {
        const detected = detectSecretsInValue(addedContent, undefined, currentLineInDiff, {
          file: currentFile,
          commitHash: currentCommit,
          author: currentAuthor,
          date: currentDate,
          allowHighEntropy: options.detectOptions?.allowHighEntropy,
          entropyThreshold: options.detectOptions?.entropyThreshold,
          minLength: options.detectOptions?.minLength,
          paranoid: options.detectOptions?.paranoid,
          minConfidence: options.detectOptions?.minConfidence
        });

        if (detected.length > 0) {
          findings.push(...detected);
        }
      }
    } else if (!line.startsWith('-')) {
      currentLineInDiff++;
    }
  }

  return findings;
}
