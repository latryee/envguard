import { SECRET_RULES, SecretRule } from './rules.js';
import { isSafePlaceholder } from './whitelist.js';
import {
  calculateNormalizedShannonEntropy,
  isHighEntropyString,
  CharacterSetType
} from './entropy.js';

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
  normalizedEntropy?: number;
  charset?: CharacterSetType;
  confidence: number; // 0 - 100
  confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  commitHash?: string;
  author?: string;
  date?: string;
}

export interface DetectSecretsOptions {
  file?: string;
  allowHighEntropy?: boolean;
  entropyThreshold?: number;
  minLength?: number;
  paranoid?: boolean;
  minConfidence?: number;
  commitHash?: string;
  author?: string;
  date?: string;
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

export function calculateFindingConfidence(
  baseScore: number,
  entropy: number,
  key?: string,
  ruleId?: string,
  normalizedEntropy = 0
): { confidence: number; confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW' } {
  let score = baseScore;

  const upperKey = (key || '').toUpperCase();
  const isSecretKey =
    upperKey.includes('SECRET') ||
    upperKey.includes('KEY') ||
    upperKey.includes('TOKEN') ||
    upperKey.includes('AUTH') ||
    upperKey.includes('PASS') ||
    upperKey.includes('PRIVATE') ||
    upperKey.includes('CREDENTIAL') ||
    upperKey.includes('API') ||
    upperKey.includes('SIGNING');

  const isNonSecretKey =
    upperKey.includes('HASH') ||
    upperKey.includes('NONCE') ||
    upperKey.includes('ID') ||
    upperKey.includes('CSS') ||
    upperKey.includes('CHUNK') ||
    upperKey.includes('BUILD') ||
    upperKey.includes('ASSET') ||
    upperKey.includes('COLOR');

  if (ruleId === 'high-entropy-secret') {
    if (isSecretKey) {
      score += 25;
    } else if (isNonSecretKey) {
      score -= 20;
    }
    if (normalizedEntropy >= 0.80 || entropy >= 4.8) {
      score += 10;
    } else if (normalizedEntropy < 0.60 && entropy < 4.0) {
      score -= 15;
    }
  } else {
    if (isSecretKey) {
      score += 5;
    } else if (isNonSecretKey) {
      score -= 10;
    }
    if (normalizedEntropy >= 0.75 || entropy >= 4.5) {
      score += 5;
    }
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  let confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
  if (score >= 80) {
    confidenceLevel = 'HIGH';
  } else if (score >= 50) {
    confidenceLevel = 'MEDIUM';
  }

  return { confidence: score, confidenceLevel };
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
        const entropyInfo = calculateNormalizedShannonEntropy(matchedStr);
        const { confidence, confidenceLevel } = calculateFindingConfidence(
          rule.confidenceBase ?? 90,
          entropyInfo.entropy,
          key,
          rule.id,
          entropyInfo.normalizedEntropy
        );

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
          entropy: entropyInfo.entropy,
          normalizedEntropy: entropyInfo.normalizedEntropy,
          charset: entropyInfo.charset,
          confidence,
          confidenceLevel,
          commitHash: options.commitHash,
          author: options.author,
          date: options.date
        });
      }
    }
  }

  // 2. High Shannon entropy check for arbitrary high-randomness tokens
  if (findings.length === 0 && !options.allowHighEntropy) {
    const threshold = options.entropyThreshold ?? 4.3;
    const minLength = options.minLength ?? 20;
    if (isHighEntropyString(value, threshold, minLength)) {
      const entropyInfo = calculateNormalizedShannonEntropy(value);
      const { confidence, confidenceLevel } = calculateFindingConfidence(
        55,
        entropyInfo.entropy,
        key,
        'high-entropy-secret',
        entropyInfo.normalizedEntropy
      );

      findings.push({
        ruleId: 'high-entropy-secret',
        ruleName: 'High-Entropy Secret String',
        category: 'generic',
        severity: 'high',
        description: `Potential unclassified secret detected (Shannon entropy: ${entropyInfo.entropy} > ${threshold}).`,
        remediation: 'Verify if this is an API key/token. Use a placeholder (e.g. your_key_here) in template files.',
        variableKey: key,
        file: options.file,
        line,
        snippetMasked: maskSecret(value),
        entropy: entropyInfo.entropy,
        normalizedEntropy: entropyInfo.normalizedEntropy,
        charset: entropyInfo.charset,
        confidence,
        confidenceLevel,
        commitHash: options.commitHash,
        author: options.author,
        date: options.date
      });
    }
  }

  // Filter based on confidence threshold
  // In standard mode: only HIGH confidence (>= 80)
  // In paranoid mode: MEDIUM and HIGH confidence (>= 50)
  const minScore = options.minConfidence ?? (options.paranoid ? 50 : 80);
  return findings.filter((f) => f.confidence >= minScore);
}
