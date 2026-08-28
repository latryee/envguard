import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';
import { isGitRepository, getGitRoot, getStagedFiles, getStagedFileContent } from '../src/core/git/git-utils.js';
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
    expect(res1.hookPath.replace(/\\/g, '/')).toContain('.git/hooks/pre-commit');

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
    expect(fs.existsSync(res.hookPath)).toBe(true);
    expect(res.hookPath.replace(/\\/g, '/')).toContain('.husky/pre-commit');

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

  it('reads staged file content directly from git index including spaces and deleted working-tree files', () => {
    execSync('git init', { cwd: tempDir, stdio: 'ignore' });
    execSync('git config user.name "Test"', { cwd: tempDir, stdio: 'ignore' });
    execSync('git config user.email "test@example.com"', { cwd: tempDir, stdio: 'ignore' });

    // File with spaces
    const subDir = path.join(tempDir, 'nested folder');
    fs.mkdirSync(subDir, { recursive: true });
    const fileWithSpaces = path.join(subDir, 'my file.ts');
    fs.writeFileSync(fileWithSpaces, 'export const secret = "staged-value";');
    execSync('git add "nested folder/my file.ts"', { cwd: tempDir, stdio: 'ignore' });

    // Modify working tree copy
    fs.writeFileSync(fileWithSpaces, 'export const secret = "working-tree-value";');

    // getStagedFileContent should read staged blob
    const content = getStagedFileContent(fileWithSpaces, tempDir);
    expect(content).toBe('export const secret = "staged-value";');

    // Delete working-tree copy completely
    fs.unlinkSync(fileWithSpaces);
    const contentAfterDelete = getStagedFileContent(fileWithSpaces, tempDir);
    expect(contentAfterDelete).toBe('export const secret = "staged-value";');
  });

  it('detects renamed staged files and ignores binary files', () => {
    execSync('git init', { cwd: tempDir, stdio: 'ignore' });
    execSync('git config user.name "Test"', { cwd: tempDir, stdio: 'ignore' });
    execSync('git config user.email "test@example.com"', { cwd: tempDir, stdio: 'ignore' });

    const origFile = path.join(tempDir, 'orig.ts');
    fs.writeFileSync(origFile, 'console.log(process.env.INITIAL_VAR);');
    execSync('git add orig.ts', { cwd: tempDir, stdio: 'ignore' });
    execSync('git commit -m "init"', { cwd: tempDir, stdio: 'ignore' });

    // Rename file via git mv
    execSync('git mv orig.ts renamed.ts', { cwd: tempDir, stdio: 'ignore' });
    const staged = getStagedFiles(tempDir);
    expect(staged).toContain('renamed.ts');

    const stagedRenamedContent = getStagedFileContent(path.join(tempDir, 'renamed.ts'), tempDir);
    expect(stagedRenamedContent).toContain('INITIAL_VAR');

    // Binary file check
    const binFile = path.join(tempDir, 'data.bin');
    fs.writeFileSync(binFile, Buffer.from([0x00, 0x01, 0x02, 0xff]));
    execSync('git add data.bin', { cwd: tempDir, stdio: 'ignore' });

    const binContent = getStagedFileContent(binFile, tempDir);
    expect(binContent).toBeNull();
  });

  it('detects git repository from deeply nested subdirectories and resolves staged files correctly', async () => {
    execSync('git init', { cwd: tempDir, stdio: 'ignore' });
    execSync('git config user.name "Test"', { cwd: tempDir, stdio: 'ignore' });
    execSync('git config user.email "test@example.com"', { cwd: tempDir, stdio: 'ignore' });

    const nestedDir = path.join(tempDir, 'packages', 'web', 'src');
    fs.mkdirSync(nestedDir, { recursive: true });

    // isGitRepository should return true from the nested directory
    expect(isGitRepository(nestedDir)).toBe(true);
    expect(getGitRoot(nestedDir)).toBe(tempDir);

    // Staging a file inside the nested subdirectory
    const appFile = path.join(nestedDir, 'app.ts');
    fs.writeFileSync(appFile, 'const key = process.env.NESTED_APP_KEY;');
    execSync('git add packages/web/src/app.ts', { cwd: tempDir, stdio: 'ignore' });

    // getStagedFiles called from nestedDir should return the relative path from nestedDir
    const stagedFromNested = getStagedFiles(nestedDir);
    expect(stagedFromNested).toContain('app.ts');

    // Run runCheck with --staged from nestedDir
    const { runCheck } = await import('../src/cli/commands/check.js');
    const oldCwd = process.cwd();
    process.chdir(nestedDir);

    try {
      // With NESTED_APP_KEY undocumented, check should discover it
      fs.writeFileSync(path.join(nestedDir, '.env'), 'NESTED_APP_KEY=123\n');
      fs.writeFileSync(path.join(nestedDir, '.env.example'), 'NESTED_APP_KEY=123\n');
      const exitCode = await runCheck({ staged: true, quiet: true, noBanner: true });
      expect(exitCode).toBe(0);
    } finally {
      process.chdir(oldCwd);
    }
  });
});


