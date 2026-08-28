import { SECRET_RULES, SecretRule } from './rules.js';
import { isSafePlaceholder } from './whitelist.js';
import { calculateShannonEntropy, isHighEntropyString } from './entropy.js';

export interface SecretFinding {
  ruleId: string;
  ruleName: string;
  category: SecretRule['category'];
  severity: SecretRule['severity'];
  description: string;
  remediation: string;
  variableKey?: string;
  file?: string;
  line?: number;
  snippetMasked: string;
  entropy?: number;
}

export interface DetectSecretsOptions {
  file?: string;
  allowHighEntropy?: boolean;
  entropyThreshold?: number;
}

/**
 * Masks a secret string keeping minimal characters visible for recognition without exposing the secret.
 */
export function maskSecret(secret: string): string {
  if (!secret) return '***';
  if (secret.length <= 8) return '***';
  if (secret.length <= 16) {
    return `${secret.slice(0, 2)}...${secret.slice(-2)}`;
  }
  return `${secret.slice(0, 4)}...${secret.slice(-4)}`;
}

/**
 * Scans a single key-value pair or arbitrary text for secret leaks.
 */
export function detectSecretsInValue(
  value: string,
  key?: string,
  line?: number,
  options: DetectSecretsOptions = {}
): SecretFinding[] {
  const findings: SecretFinding[] = [];
  if (!value || isSafePlaceholder(value)) {
    return findings;
  }

  // 1. Check against curated high-precision rules
  for (const rule of SECRET_RULES) {
    rule.regex.lastIndex = 0;
    const match = rule.regex.exec(value);
    if (match) {
      const matchedStr = match[0];
      if (!isSafePlaceholder(matchedStr)) {
        findings.push({
          ruleId: rule.id,
          ruleName: rule.name,
          category: rule.category,
          severity: rule.severity,
          description: rule.description,
          remediation: rule.remediation,
          variableKey: key,
          file: options.file,
          line,
          snippetMasked: maskSecret(matchedStr),
          entropy: Number(calculateShannonEntropy(matchedStr).toFixed(2))
        });
      }
    }
  }

  // 2. High Shannon entropy check for arbitrary high-randomness tokens
  if (findings.length === 0 && !options.allowHighEntropy) {
    const threshold = options.entropyThreshold || 4.4;
    if (isHighEntropyString(value, threshold, 24)) {
      const entropy = Number(calculateShannonEntropy(value).toFixed(2));
      findings.push({
        ruleId: 'high-entropy-secret',
        ruleName: 'High-Entropy Secret String',
        category: 'generic',
        severity: 'high',
        description: `Potential unclassified secret detected (Shannon entropy: ${entropy} > ${threshold}).`,
        remediation: 'Verify if this is an API key/token. Use a placeholder (e.g. your_key_here) in template files.',
        variableKey: key,
        file: options.file,
        line,
        snippetMasked: maskSecret(value),
        entropy
      });
    }
  }

  return findings;
}
