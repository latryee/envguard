import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';
import { isGitRepository, getGitRoot, getStagedFiles } from '../src/core/git/git-utils.js';
import { installPreCommitHook } from '../src/core/git/hooks.js';

describe('Git Utilities & Hook Engine', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'envguard-test-git-')));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('detects non-git repositories cleanly', () => {
    expect(isGitRepository(tempDir)).toBe(false);
    expect(getGitRoot(tempDir)).toBeNull();
    expect(getStagedFiles(tempDir)).toEqual([]);

    const result = installPreCommitHook(tempDir);
    expect(result.success).toBe(false);
    expect(result.message).toContain('Not a Git repository');
  });

  it('detects git repository and installs native pre-commit hook idempotently', () => {
    // Initialize git repo
    execSync('git init', { cwd: tempDir, stdio: 'ignore' });

    expect(isGitRepository(tempDir)).toBe(true);
    const root = getGitRoot(tempDir);
    expect(root).toBeDefined();

    // First install
    const res1 = installPreCommitHook(tempDir);
    expect(res1.success).toBe(true);
    expect(res1.hookType).toBe('git-native');
    expect(fs.existsSync(res1.hookPath)).toBe(true);

    const hookContent = fs.readFileSync(res1.hookPath, 'utf8');
    expect(hookContent).toContain('envguard check --staged --strict');

    // Second install (should be idempotent)
    const res2 = installPreCommitHook(tempDir);
    expect(res2.success).toBe(true);
    expect(res2.message).toContain('already installed');
  });

  it('installs pre-commit hook into .husky when Husky directory exists', () => {
    execSync('git init', { cwd: tempDir, stdio: 'ignore' });
    const huskyDir = path.join(tempDir, '.husky');
    fs.mkdirSync(huskyDir, { recursive: true });

    const res = installPreCommitHook(tempDir);
    expect(res.success).toBe(true);
    expect(res.hookType).toBe('husky');
    expect(fs.realpathSync(res.hookPath)).toBe(fs.realpathSync(path.join(huskyDir, 'pre-commit')));

    const content = fs.readFileSync(res.hookPath, 'utf8');
    expect(content).toContain('envguard check --staged --strict');

    // Second install (idempotency in husky)
    const res2 = installPreCommitHook(tempDir);
    expect(res2.success).toBe(true);
    expect(res2.message).toContain('already installed');
  });

  it('detects staged files in git repository', () => {
    execSync('git init', { cwd: tempDir, stdio: 'ignore' });
    execSync('git config user.name "Test"', { cwd: tempDir, stdio: 'ignore' });
    execSync('git config user.email "test@example.com"', { cwd: tempDir, stdio: 'ignore' });

    const testFile = path.join(tempDir, 'sample.ts');
    fs.writeFileSync(testFile, 'console.log("hello");');
    execSync('git add sample.ts', { cwd: tempDir, stdio: 'ignore' });

    const staged = getStagedFiles(tempDir);
    expect(staged).toContain('sample.ts');
  });
});
