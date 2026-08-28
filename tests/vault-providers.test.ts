import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { pullFromVault } from '../src/index.js';
import { runPull } from '../src/cli/commands/pull.js';

describe('Vault Providers Integration', () => {
  it('pulls secrets from Doppler CLI format', () => {
    const mockExec = vi.fn().mockReturnValue('PORT=8080\nDATABASE_URL=postgresql://doppler:5432/db\n');

    const result = pullFromVault({
      provider: 'doppler',
      project: 'my-project',
      config: 'dev',
      execFn: mockExec
    });

    expect(result.variablesCount).toBe(2);
    expect(result.ast.variables.get('PORT')?.value).toBe('8080');
    expect(mockExec).toHaveBeenCalledWith(expect.stringContaining('doppler secrets download'));
  });

  it('pulls and parses JSON secrets from AWS Secrets Manager and HashiCorp Vault', () => {
    const awsJson = JSON.stringify({
      API_KEY: 'aws-secret-key-val',
      REGION: 'us-east-1'
    });

    const mockExec = vi.fn().mockReturnValue(awsJson);

    const result = pullFromVault({
      provider: 'aws',
      vaultSecretId: 'arn:aws:secretsmanager:us-east-1:123456:secret:app',
      execFn: mockExec
    });

    expect(result.variablesCount).toBe(2);
    expect(result.ast.variables.get('API_KEY')?.value).toBe('aws-secret-key-val');
  });

  it('handles Infisical and 1Password provider commands', () => {
    const mockExec = vi.fn().mockReturnValue('TOKEN=sample_token\n');

    const infisicalResult = pullFromVault({
      provider: 'infisical',
      config: 'production',
      execFn: mockExec
    });
    expect(infisicalResult.variablesCount).toBe(1);

    const opResult = pullFromVault({
      provider: '1password',
      execFn: mockExec
    });
    expect(opResult.variablesCount).toBe(1);

    const vaultResult = pullFromVault({
      provider: 'vault',
      execFn: mockExec
    });
    expect(vaultResult.variablesCount).toBe(1);
  });

  it('throws friendly error on CLI failure and handles runPull command', async () => {
    const mockExecFail = vi.fn().mockImplementation(() => {
      throw new Error('doppler: command not found');
    });

    expect(() =>
      pullFromVault({
        provider: 'doppler',
        execFn: mockExecFail
      })
    ).toThrowError('doppler: command not found');

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envguard-pull-test-'));
    try {
      const exitCodeFail = await runPull({
        provider: 'doppler',
        output: path.join(tempDir, '.env'),
        quiet: true,
        execFn: mockExecFail
      });
      expect(exitCodeFail).toBe(1);

      // Success branch
      const mockExecSuccess = vi.fn().mockReturnValue('PORT=3000\n');
      const exitCodeOk = await runPull({
        provider: 'doppler',
        output: path.join(tempDir, '.env'),
        quiet: false,
        execFn: mockExecSuccess
      });
      expect(exitCodeOk).toBe(0);
      expect(fs.existsSync(path.join(tempDir, '.env'))).toBe(true);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
