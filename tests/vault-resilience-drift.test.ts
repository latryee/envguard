import { describe, it, expect } from 'vitest';
import {
  ResilientExecutor,
  sanitizeErrorMessage,
  maskObjectSecrets,
  watchEnvironmentDrift,
  formatDriftReport,
  parseEnv
} from '../src/index.js';

describe('Vault Resilience, Secret Masking & Environment Drift Detection', () => {
  describe('ResilientExecutor & Circuit Breaker', () => {
    it('executes successful actions immediately without retrying', async () => {
      const executor = new ResilientExecutor({ maxRetries: 3, initialDelayMs: 10 });
      let calls = 0;

      const result = await executor.execute(() => {
        calls++;
        return 'SUCCESS_DATA';
      });

      expect(result).toBe('SUCCESS_DATA');
      expect(calls).toBe(1);
      expect(executor.getStats().state).toBe('CLOSED');
      expect(executor.getStats().successes).toBe(1);
      expect(executor.getStats().failures).toBe(0);
    });

    it('retries with exponential backoff on transient failures', async () => {
      const executor = new ResilientExecutor({ maxRetries: 3, initialDelayMs: 5, backoffFactor: 2 });
      let calls = 0;
      const sleepDelays: number[] = [];

      const customSleep = async (ms: number) => {
        sleepDelays.push(ms);
      };

      const result = await executor.execute(() => {
        calls++;
        if (calls < 3) {
          throw new Error('Transient network timeout');
        }
        return 'RECOVERED_VALUE';
      }, customSleep);

      expect(result).toBe('RECOVERED_VALUE');
      expect(calls).toBe(3);
      expect(sleepDelays.length).toBe(2);
      expect(executor.getStats().state).toBe('CLOSED');
    });

    it('trips circuit breaker to OPEN when failure threshold is exceeded', async () => {
      const executor = new ResilientExecutor({
        failureThreshold: 2,
        maxRetries: 0,
        resetTimeoutMs: 50
      });

      // 1st failure
      await expect(executor.execute(() => {
        throw new Error('500 Internal Server Error');
      })).rejects.toThrow(/500 Internal Server Error/);

      // 2nd failure -> trips breaker
      await expect(executor.execute(() => {
        throw new Error('500 Internal Server Error');
      })).rejects.toThrow(/500 Internal Server Error/);

      expect(executor.getStats().state).toBe('OPEN');

      // Subsequent call fails fast without calling action
      let called = false;
      await expect(executor.execute(() => {
        called = true;
        return 'DATA';
      })).rejects.toThrow(/Circuit breaker is OPEN/);

      expect(called).toBe(false);

      // Wait for reset timeout to test HALF_OPEN transition
      await new Promise((r) => setTimeout(r, 60));
      expect(executor.getStats().state).toBe('HALF_OPEN');

      // Successful call in HALF_OPEN resets breaker to CLOSED
      const recovered = await executor.execute(() => 'RECOVERED');
      expect(recovered).toBe('RECOVERED');
      expect(executor.getStats().state).toBe('CLOSED');
    });

    it('calculates backoff delay using full jitter within bounded ranges', () => {
      const executor = new ResilientExecutor({
        initialDelayMs: 100,
        maxDelayMs: 1000,
        backoffFactor: 2
      });

      for (let attempt = 0; attempt < 5; attempt++) {
        const delay = executor.calculateDelay(attempt);
        expect(delay).toBeGreaterThanOrEqual(0);
        expect(delay).toBeLessThanOrEqual(1000);
      }
    });
  });

  describe('In-Memory Secret Sanitization & Masking', () => {
    it('masks OpenAI, AWS, and Anthropic keys from error strings and stack traces', () => {
      const rawError = 'Failed to connect: sk-proj-1234567890abcdef1234567890abcdef1234567890 at AKIAIOSFODNN7EXAMPLE using sk-ant-api03-abcdef1234567890abcdef1234567890';
      const sanitized = sanitizeErrorMessage(rawError);

      expect(sanitized).not.toContain('sk-proj-1234567890abcdef');
      expect(sanitized).not.toContain('AKIAIOSFODNN7EXAMPLE');
      expect(sanitized).not.toContain('sk-ant-api03');
      expect(sanitized).toContain('sk-p...7890');
      expect(sanitized).toContain('AKIA...MPLE');
      expect(sanitized).toContain('sk-a...7890');
    });

    it('deep masks object fields with sensitive keys or leaked credentials', () => {
      const payload = {
        app: 'billing-api',
        config: {
          apiKey: 'sk-proj-1234567890abcdef1234567890abcdef1234567890',
          dbPassword: 'super_secret_db_password_123',
          normalHost: 'db.internal.local'
        },
        tokens: ['ghp_123456789012345678901234567890123456', 'safe-public-tag']
      };

      const masked = maskObjectSecrets(payload);
      expect(masked.config.apiKey).toContain('sk-p...7890');
      expect(masked.config.dbPassword).toContain('supe...');
      expect(masked.config.normalHost).toBe('db.internal.local');
      expect(masked.tokens[0]).toContain('ghp_...3456');
      expect(masked.tokens[1]).toBe('safe-public-tag');
    });
  });

  describe('Environment Drift Watchdog', () => {
    it('detects missing required runtime variables and type mismatches against schema', () => {
      const exampleContent = `
# @type port
# @required true
PORT=8080

# @type string
# @required true
DATABASE_URL=postgresql://localhost:5432/app

# @type boolean
# @required false
FEATURE_FLAG=true
`;
      const exampleAst = parseEnv(exampleContent);

      const runtimeEnv = {
        PORT: 'not-a-number', // Type mismatch
        // DATABASE_URL is missing
        UNTRACKED_KEY: 'extra_value' // Undocumented in schema
      };

      const report = watchEnvironmentDrift({
        runtimeEnv,
        exampleAst,
        strict: true
      });

      expect(report.isCompliant).toBe(false);
      expect(report.summary.missingInRuntimeCount).toBe(1); // DATABASE_URL
      expect(report.divergences.filter((d) => d.severity === 'CRITICAL').length).toBe(1);
      expect(report.summary.undocumentedCount).toBe(1); // UNTRACKED_KEY
      expect(report.summary.typeMismatchesCount).toBe(1); // PORT

      const portDivergence = report.divergences.find((d) => d.key === 'PORT');
      expect(portDivergence?.kind).toBe('TYPE_MISMATCH');
      expect(portDivergence?.severity).toBe('HIGH');

      const dbDivergence = report.divergences.find((d) => d.key === 'DATABASE_URL');
      expect(dbDivergence?.kind).toBe('MISSING_IN_RUNTIME');
      expect(dbDivergence?.severity).toBe('CRITICAL');

      const markdown = formatDriftReport(report, 'markdown');
      expect(markdown).toContain('Environment Drift');
      expect(markdown).toContain('DIVERGED');
      expect(markdown).toContain('DATABASE_URL');
    });

    it('reports 100% compliance when runtime matches schema perfectly', () => {
      const exampleContent = `
# @type port
PORT=3000
# @type url
API_URL=https://api.example.com
`;
      const exampleAst = parseEnv(exampleContent);

      const runtimeEnv = {
        PORT: '3000',
        API_URL: 'https://api.example.com'
      };

      const report = watchEnvironmentDrift({
        runtimeEnv,
        exampleAst
      });

      expect(report.isCompliant).toBe(true);
      expect(report.driftScore).toBe(0);
      expect(report.divergences.length).toBe(0);

      const markdown = formatDriftReport(report, 'markdown');
      expect(markdown).toContain('COMPLIANT');
      expect(markdown).toContain('100% synchronization');
    });
  });
});
