import { maskSecret } from '../secrets/detector.js';

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  resetTimeoutMs?: number;
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffFactor?: number;
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
}

/**
 * Sanitizes an error message or stack trace by masking detected secrets and credentials.
 */
export function sanitizeErrorMessage(message: string): string {
  if (!message) return '';

  let sanitized = message;

  // Mask OpenAI keys
  sanitized = sanitized.replace(/\b(sk-(?:proj-|none-|admin-|svcacct-)?[a-zA-Z0-9_-]{30,80})\b/g, (m) => maskSecret(m));

  // Mask Anthropic keys
  sanitized = sanitized.replace(/\b(sk-ant-[a-zA-Z0-9_-]{30,90})\b/g, (m) => maskSecret(m));

  // Mask AWS access keys
  sanitized = sanitized.replace(/\b((?:AKIA|ASIA|ABIA|ACCA)[0-9A-Z]{16})\b/g, (m) => maskSecret(m));

  // Mask GitHub tokens
  sanitized = sanitized.replace(/\b((?:ghp|gho|ghu|ghs|ghr)_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9_]{82})\b/g, (m) => maskSecret(m));

  // Mask Stripe keys
  sanitized = sanitized.replace(/\b((?:sk|rk)_(?:live|test)_[0-9a-zA-Z]{24,99})\b/g, (m) => maskSecret(m));

  // Mask Slack tokens
  sanitized = sanitized.replace(/\b(xox[baprs]-[0-9]{10,13}-[0-9]{10,13}-[a-zA-Z0-9]{24,32})\b/g, (m) => maskSecret(m));

  // Mask generic password/token key-value assignments in logs
  sanitized = sanitized.replace(/((?:password|secret|token|api_key|apiKey|authToken)\s*[:=]\s*['"]?)([^\s'",;]+)(['"]?)/gi, (_, prefix, val, suffix) => {
    return `${prefix}${maskSecret(val)}${suffix}`;
  });

  return sanitized;
}

/**
 * Deep masks secrets in JavaScript objects for safe in-memory logging and crash dumps.
 */
export function maskObjectSecrets<T extends Record<string, any>>(obj: T): T {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const result: any = Array.isArray(obj) ? [] : {};
  const secretKeyRegex = /secret|password|token|key|auth|credential|private/i;

  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string') {
      if (secretKeyRegex.test(k)) {
        result[k] = maskSecret(v);
      } else {
        result[k] = sanitizeErrorMessage(v);
      }
    } else if (v && typeof v === 'object') {
      result[k] = maskObjectSecrets(v);
    } else {
      result[k] = v;
    }
  }

  return result;
}

/**
 * Circuit Breaker pattern implementation with Exponential Backoff and Full Jitter.
 */
export class ResilientExecutor {
  private state: CircuitState = 'CLOSED';
  private failures = 0;
  private successes = 0;
  private lastFailureTime: number | null = null;
  private lastSuccessTime: number | null = null;

  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;
  private readonly maxRetries: number;
  private readonly initialDelayMs: number;
  private readonly maxDelayMs: number;
  private readonly backoffFactor: number;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold ?? 3;
    this.resetTimeoutMs = options.resetTimeoutMs ?? 10000;
    this.maxRetries = options.maxRetries ?? 3;
    this.initialDelayMs = options.initialDelayMs ?? 100;
    this.maxDelayMs = options.maxDelayMs ?? 2000;
    this.backoffFactor = options.backoffFactor ?? 2;
  }

  public getStats(): CircuitBreakerStats {
    this.checkState();
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime
    };
  }

  public reset(): void {
    this.state = 'CLOSED';
    this.failures = 0;
    this.successes = 0;
    this.lastFailureTime = null;
  }

  private checkState(): void {
    if (this.state === 'OPEN' && this.lastFailureTime) {
      const now = Date.now();
      if (now - this.lastFailureTime >= this.resetTimeoutMs) {
        this.state = 'HALF_OPEN';
      }
    }
  }

  /**
   * Calculates backoff delay with full jitter.
   * T_jitter = random(0, min(maxDelay, initialDelay * (backoffFactor ^ attempt)))
   */
  public calculateDelay(attempt: number): number {
    const rawDelay = this.initialDelayMs * Math.pow(this.backoffFactor, attempt);
    const cappedDelay = Math.min(this.maxDelayMs, rawDelay);
    return Math.floor(Math.random() * cappedDelay);
  }

  private async sleep(ms: number): Promise<void> {
    if (ms <= 0) return;
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  public getState(): CircuitState {
    return this.state;
  }

  /**
   * Executes a synchronous or asynchronous operation with circuit breaker and retry logic.
   */
  public async execute<T>(action: () => T | Promise<T>, sleepFn?: (ms: number) => Promise<void>): Promise<T> {
    this.checkState();

    if (this.getState() === 'OPEN') {
      throw new Error('Circuit breaker is OPEN. Fast failing network request to prevent cascading failure.');
    }

    let lastError: any = null;
    const sleeper = sleepFn || this.sleep.bind(this);

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await Promise.resolve(action());
        this.onSuccess();
        return result;
      } catch (err: any) {
        lastError = err;
        this.onFailure();

        if (this.getState() === 'OPEN') {
          break;
        }

        if (attempt < this.maxRetries) {
          const delay = this.calculateDelay(attempt);
          await sleeper(delay);
        }
      }
    }

    const sanitizedMsg = sanitizeErrorMessage(lastError?.message || String(lastError));
    throw new Error(`Operation failed after ${this.maxRetries + 1} attempts: ${sanitizedMsg}`);
  }

  /**
   * Synchronous execution with circuit breaker protection.
   */
  public executeSync<T>(action: () => T): T {
    this.checkState();

    if (this.state === 'OPEN') {
      throw new Error('Circuit breaker is OPEN. Fast failing network request to prevent cascading failure.');
    }

    try {
      const result = action();
      this.onSuccess();
      return result;
    } catch (err: any) {
      this.onFailure();
      const sanitizedMsg = sanitizeErrorMessage(err?.message || String(err));
      throw new Error(`Execution failed: ${sanitizedMsg}`);
    }
  }

  private onSuccess(): void {
    this.successes++;
    this.lastSuccessTime = Date.now();
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
      this.failures = 0;
    }
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    if (this.state === 'HALF_OPEN' || this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }
}
