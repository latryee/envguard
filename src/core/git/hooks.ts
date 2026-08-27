import fs from 'node:fs';
import path from 'node:path';
import { getGitRoot, isGitRepository } from './git-utils.js';

export interface HookInstallResult {
  success: boolean;
  hookPath: string;
  hookType: 'git-native' | 'husky';
  message: string;
}

const HOOK_MARKER = '# --- envguard pre-commit hook ---';

const PRE_COMMIT_SCRIPT = `#!/bin/sh
${HOOK_MARKER}
# Automatically check for secret leaks, stale .env.example, and type mismatches
npx envguard check --staged --strict
STATUS=$?

if [ $STATUS -ne 0 ]; then
  echo "\\n❌ [envguard] Pre-commit check failed. Fix errors above or run 'npx envguard sync' to update template."
  exit $STATUS
fi
# --- end envguard pre-commit hook ---
`;

/**
 * Installs the envguard pre-commit hook into .git/hooks or .husky directory.
 */
export function installPreCommitHook(cwd = process.cwd()): HookInstallResult {
  if (!isGitRepository(cwd)) {
    return {
      success: false,
      hookPath: '',
      hookType: 'git-native',
      message: 'Not a Git repository. Run "git init" first.'
    };
  }

  const gitRoot = getGitRoot(cwd) || cwd;
  const huskyDir = path.join(gitRoot, '.husky');

  // If Husky is used
  if (fs.existsSync(huskyDir)) {
    const huskyHook = path.join(huskyDir, 'pre-commit');
    let content = '';
    if (fs.existsSync(huskyHook)) {
      content = fs.readFileSync(huskyHook, 'utf8');
      if (content.includes(HOOK_MARKER)) {
        return {
          success: true,
          hookPath: huskyHook,
          hookType: 'husky',
          message: 'EnvGuard hook is already installed in .husky/pre-commit.'
        };
      }
      content += `\n\n${HOOK_MARKER}\nnpx envguard check --staged --strict\n`;
    } else {
      content = `#!/bin/sh\n. "$(dirname "$0")/_/husky.sh"\n\n${HOOK_MARKER}\nnpx envguard check --staged --strict\n`;
    }

    fs.writeFileSync(huskyHook, content, { mode: 0o755 });
    return {
      success: true,
      hookPath: huskyHook,
      hookType: 'husky',
      message: 'Installed EnvGuard pre-commit hook in .husky/pre-commit.'
    };
  }

  // Native Git Hook
  const hooksDir = path.join(gitRoot, '.git', 'hooks');
  if (!fs.existsSync(hooksDir)) {
    fs.mkdirSync(hooksDir, { recursive: true });
  }

  const hookPath = path.join(hooksDir, 'pre-commit');
  if (fs.existsSync(hookPath)) {
    const existing = fs.readFileSync(hookPath, 'utf8');
    if (existing.includes(HOOK_MARKER)) {
      return {
        success: true,
        hookPath,
        hookType: 'git-native',
        message: 'EnvGuard pre-commit hook is already installed in .git/hooks/pre-commit.'
      };
    }
    // Append to existing hook
    fs.appendFileSync(hookPath, `\n\n${PRE_COMMIT_SCRIPT}`);
  } else {
    fs.writeFileSync(hookPath, PRE_COMMIT_SCRIPT, { mode: 0o755 });
  }

  // Ensure executable permission on Unix systems
  try {
    fs.chmodSync(hookPath, 0o755);
  } catch {
    // ignore on Windows
  }

  return {
    success: true,
    hookPath,
    hookType: 'git-native',
    message: 'Installed EnvGuard pre-commit hook in .git/hooks/pre-commit.'
  };
}
