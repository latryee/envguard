import { describe, it, expect } from 'vitest';
import { calculateShannonEntropy, isHighEntropyString } from '../src/core/secrets/entropy.js';
import { detectSecretsInValue, maskSecret } from '../src/core/secrets/detector.js';

describe('Secret Leak & Shannon Entropy Detection Engine', () => {
  it('calculates Shannon entropy correctly', () => {
    // Low entropy (repeating characters)
    const low = calculateShannonEntropy('aaaaaaaaaaaa');
    expect(low).toBe(0);

    // High entropy (cryptographic key / random base64)
    const high = calculateShannonEntropy('N3wY0rk$3cr3tT0k3n_v4Lu3#987!xYzQ');
    expect(high).toBeGreaterThan(4.0);
  });

  it('masks secrets safely without leaking short token contents', () => {
    expect(maskSecret('')).toBe('***');
    expect(maskSecret('12345')).toBe('***');
    expect(maskSecret('12345678')).toBe('***');
    expect(maskSecret('123456789012')).toBe('12...12');
    expect(maskSecret('sk-proj-1234567890abcdef123456')).toBe('sk-p...3456');
  });

  it('detects AWS Access Keys and Secret Keys', () => {
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

  it('detects Slack Tokens, Google API Keys, SendGrid Keys, and JWTs', () => {
    const slackSample = ['xoxb', '123456789012', '123456789012', 'abcdefghijklmnopqrstuvwx'].join('-');
    const slack = detectSecretsInValue(slackSample, 'SLACK_TOKEN');
    expect(slack).toHaveLength(1);
    expect(slack[0].ruleId).toBe('slack-token');

    // Standard Google API key is 39 chars: AIza + 35 chars
    const googleSample = ['AIza', 'SyD1234567890abcdefghijklmnopqrstuv'].join('');
    const google = detectSecretsInValue(googleSample, 'GOOGLE_KEY');
    expect(google).toHaveLength(1);
    expect(google[0].ruleId).toBe('google-api-key');

    const sendgridSample = ['SG', '1234567890123456789012', '1234567890123456789012345678901234567890123'].join('.');
    const sendgrid = detectSecretsInValue(sendgridSample, 'SENDGRID_KEY');
    expect(sendgrid).toHaveLength(1);
    expect(sendgrid[0].ruleId).toBe('sendgrid-api-key');

    const jwtSample = [
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
      'eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ',
      'SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
    ].join('.');
    const jwt = detectSecretsInValue(jwtSample, 'JWT_TOKEN');
    expect(jwt).toHaveLength(1);
    expect(jwt[0].ruleId).toBe('jwt-token');
  });

  it('detects Private Key Blocks', () => {
    const privKey = `-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA0Y+u4n...
-----END RSA PRIVATE KEY-----`;
    const findings = detectSecretsInValue(privKey, 'PRIVATE_KEY');
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].ruleId).toBe('private-key');
  });

  it('detects unclassified high-entropy random secrets', () => {
    const randomSecret = 'N3wY0rk$3cr3tT0k3n_v4Lu3#987!xYzQpL91';
    const findings = detectSecretsInValue(randomSecret, 'MY_CUSTOM_SECRET');
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].ruleId).toBe('high-entropy-secret');
  });

  it('does NOT trigger false positives on UUIDs or safe dummy placeholders', () => {
    const uuid = '123e4567-e89b-12d3-a456-426614174000';
    expect(isHighEntropyString(uuid)).toBe(false);
    expect(detectSecretsInValue(uuid, 'SESSION_ID')).toHaveLength(0);

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
