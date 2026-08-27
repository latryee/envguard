import { describe, it, expect } from 'vitest';
import { calculateShannonEntropy } from '../src/core/secrets/entropy.js';
import { detectSecretsInValue } from '../src/core/secrets/detector.js';

describe('Secret Leak & Shannon Entropy Detection Engine', () => {
  it('calculates Shannon entropy correctly', () => {
    // Low entropy (repeating characters)
    const low = calculateShannonEntropy('aaaaaaaaaaaa');
    expect(low).toBe(0);

    // High entropy (cryptographic key / random base64)
    const high = calculateShannonEntropy('7f8a9e2b1c4d5e6f8a9b0c1d2e3f4a5b');
    expect(high).toBeGreaterThan(3.5);
  });

  it('detects AWS Access Keys', () => {
    const awsSample = ['AKIA', 'IOSFODNN7EXAMPLE'].join('');
    const findings = detectSecretsInValue(awsSample, 'AWS_ACCESS_KEY_ID');
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].ruleId).toBe('aws-access-key');
    expect(findings[0].severity).toBe('critical');
  });

  it('detects OpenAI and Anthropic API Keys', () => {
    const openaiSample = ['sk-proj-', 'aBcDeFgHiJkLmNoPqRsTuVwXyZ1234567890abcdef'].join('');
    const openai = detectSecretsInValue(openaiSample, 'OPENAI_KEY');
    expect(openai.length).toBeGreaterThan(0);
    expect(openai[0].ruleId).toBe('openai-api-key');

    const claudeSample = ['sk-ant-', 'api03-abcdefghijklmnopqrstuvwxyz1234567890'].join('');
    const claude = detectSecretsInValue(claudeSample, 'ANTHROPIC_KEY');
    expect(claude.length).toBeGreaterThan(0);
    expect(claude[0].ruleId).toBe('anthropic-api-key');
  });

  it('detects GitHub Personal Access Tokens and Stripe Secret Keys', () => {
    const ghpSample = ['ghp_', '1234567890abcdefghijklmnopqrstuvwxyz'].join('');
    const ghp = detectSecretsInValue(ghpSample, 'GH_TOKEN');
    expect(ghp.length).toBeGreaterThan(0);
    expect(ghp[0].ruleId).toBe('github-pat');

    const stripeSample = ['sk_test_', '51AbCdEfGhIjKlMnOpQrStUvWxYz'].join('');
    const stripe = detectSecretsInValue(stripeSample, 'STRIPE_SECRET');
    expect(stripe.length).toBeGreaterThan(0);
    expect(stripe[0].ruleId).toBe('stripe-secret-key');
  });

  it('detects Private Key Blocks', () => {
    const privKey = `-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA0Y+u4n...
-----END RSA PRIVATE KEY-----`;
    const findings = detectSecretsInValue(privKey, 'PRIVATE_KEY');
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].ruleId).toBe('private-key');
  });

  it('does NOT trigger false positives on safe dummy placeholders', () => {
    const placeholders = [
      'your_api_key_here',
      'your-stripe-secret-key',
      'dummy',
      'example',
      'localhost',
      '127.0.0.1',
      'changeme',
      'postgres://user:password@localhost:5432/mydb',
      '***',
      'xxxx-xxxx-xxxx',
      'REPLACE_ME'
    ];

    for (const ph of placeholders) {
      const findings = detectSecretsInValue(ph, 'KEY');
      expect(findings.length).toBe(0);
    }
  });
});
