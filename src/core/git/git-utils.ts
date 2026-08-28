import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

/**
 * Checks if the given directory is a Git repository root.
 */
export function isGitRepository(cwd = process.cwd()): boolean {
  if (fs.existsSync(path.join(cwd, '.git'))) {
    return true;
  }
  return false;
}

/**
 * Gets the root directory of the Git repository.
 */
export function getGitRoot(cwd = process.cwd()): string | null {
  if (fs.existsSync(path.join(cwd, '.git'))) {
    return path.resolve(cwd);
  }
  try {
    const output = execSync('git rev-parse --show-toplevel', {
      cwd,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    return path.resolve(output.trim());
  } catch {
    return null;
  }
}

/**
 * Returns a list of all staged file paths relative to Git root.
 */
export function getStagedFiles(cwd = process.cwd()): string[] {
  try {
    const output = execSync('git diff --cached --name-only --diff-filter=ACM', {
      cwd,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    return output
      .split(/\r?\n/)
      .map((f) => f.trim())
      .filter(Boolean)
      .map((f) => f.replace(/\\/g, '/'));
  } catch {
    return [];
  }
}
