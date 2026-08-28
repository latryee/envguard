import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, execSync } from 'node:child_process';

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


