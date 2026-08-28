import { execSync } from 'node:child_process';
import { parseEnv } from '../parser/env-parser.js';
import { EnvFileAst } from '../parser/types.js';
import { ResilientExecutor, CircuitBreakerOptions, sanitizeErrorMessage } from './resilience.js';

export type VaultProvider = 'doppler' | 'infisical' | '1password' | 'aws' | 'vault';

export interface PullSecretsOptions {
  provider: VaultProvider;
  project?: string;
  config?: string;
  vaultSecretId?: string;
  cwd?: string;
  execFn?: (cmd: string) => string;
  circuitBreakerOptions?: CircuitBreakerOptions;
}

export interface PullSecretsResult {
  provider: VaultProvider;
  variablesCount: number;
  envRaw: string;
  ast: EnvFileAst;
}

/**
 * Pulls secrets from a supported Cloud Secret Manager CLI with circuit breaker resilience and secret sanitization.
 */
export function pullFromVault(options: PullSecretsOptions): PullSecretsResult {
  const cwd = options.cwd ?? process.cwd();
  let cmd = '';

  switch (options.provider) {
    case 'doppler': {
      const projFlag = options.project ? `--project ${options.project}` : '';
      const confFlag = options.config ? `--config ${options.config}` : '';
      cmd = `doppler secrets download --no-file --format env ${projFlag} ${confFlag}`.trim();
      break;
    }
    case 'infisical': {
      const envFlag = options.config ? `--env=${options.config}` : '';
      cmd = `infisical export --format=dotenv ${envFlag}`.trim();
      break;
    }
    case '1password': {
      cmd = `op inject`;
      break;
    }
    case 'aws': {
      const secretId = options.vaultSecretId || options.project || 'app-secrets';
      cmd = `aws secretsmanager get-secret-value --secret-id ${secretId} --query SecretString --output text`;
      break;
    }
    case 'vault': {
      const path = options.vaultSecretId || 'secret/data/app';
      cmd = `vault kv get -format=json ${path}`;
      break;
    }
  }

  const executor = new ResilientExecutor(options.circuitBreakerOptions);

  try {
    const rawOutput = executor.executeSync(() => {
      return options.execFn
        ? options.execFn(cmd)
        : execSync(cmd, { cwd, stdio: 'pipe', encoding: 'utf8' });
    });

    let envContent = rawOutput;

    // If output is JSON (e.g. AWS or Vault), convert to KEY=VAL
    if (rawOutput.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(rawOutput);
        const data = parsed.data?.data || parsed;
        envContent = Object.entries(data)
          .map(([k, v]) => `${k}=${String(v)}`)
          .join('\n');
      } catch {
        // use raw output as-is
      }
    }

    const ast = parseEnv(envContent);
    return {
      provider: options.provider,
      variablesCount: ast.variables.size,
      envRaw: envContent,
      ast
    };
  } catch (err: any) {
    const sanitized = sanitizeErrorMessage(err.message || String(err));
    throw new Error(
      `Failed to pull secrets from ${options.provider} (Command: "${cmd}"): ${sanitized}`
    );
  }
}
