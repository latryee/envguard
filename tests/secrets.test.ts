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

  it('detects Private Key Blocks (PKCS#1, PKCS#8, OpenSSH, PGP)', () => {
    const rsaKey = `-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA0Y+u4n...
-----END RSA PRIVATE KEY-----`;
    const rsa = detectSecretsInValue(rsaKey, 'RSA_KEY');
    expect(rsa.length).toBeGreaterThan(0);
    expect(rsa[0].ruleId).toBe('private-key');

    const pkcs8Key = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC6...
-----END PRIVATE KEY-----`;
    const pkcs8 = detectSecretsInValue(pkcs8Key, 'PKCS8_KEY');
    expect(pkcs8.length).toBeGreaterThan(0);
    expect(pkcs8[0].ruleId).toBe('private-key');

    const pgpKey = `-----BEGIN PGP PRIVATE KEY BLOCK-----
Version: GnuPG v2
lQOYBF2...
-----END PGP PRIVATE KEY BLOCK-----`;
    const pgp = detectSecretsInValue(pgpKey, 'PGP_KEY');
    expect(pgp.length).toBeGreaterThan(0);
    expect(pgp[0].ruleId).toBe('private-key');
  });

  it('detects GitLab, npm, Slack Webhook, Discord, HuggingFace, Twilio, and Resend secrets', () => {
    const gitlabSample = ['glpat-', '1234567890abcdefghij'].join('');
    const gitlab = detectSecretsInValue(gitlabSample, 'GITLAB_TOKEN');
    expect(gitlab).toHaveLength(1);
    expect(gitlab[0].ruleId).toBe('gitlab-pat');

    const npmSample = ['npm_', '1234567890abcdefghijklmnopqrstuvwxyz'].join('');
    const npm = detectSecretsInValue(npmSample, 'NPM_TOKEN');
    expect(npm).toHaveLength(1);
    expect(npm[0].ruleId).toBe('npm-token');

    const slackWebhookSample = 'https://hooks.slack.com/services/T12345678/B12345678/123456789012345678901234';
    const slackWh = detectSecretsInValue(slackWebhookSample, 'SLACK_WEBHOOK');
    expect(slackWh).toHaveLength(1);
    expect(slackWh[0].ruleId).toBe('slack-webhook');

    const discordSample = ['MTIzNDU2Nzg5MDEyMzQ1Njc4OTA', 'ABCDEF', '1234567890abcdefghijklmnopqrstuvwx'].join('.');
    const discord = detectSecretsInValue(discordSample, 'DISCORD_TOKEN');
    expect(discord).toHaveLength(1);
    expect(discord[0].ruleId).toBe('discord-bot-token');

    const hfSample = ['hf_', '1234567890abcdefghijklmnopqrstuvwxyz12'].join('');
    const hf = detectSecretsInValue(hfSample, 'HF_TOKEN');
    expect(hf).toHaveLength(1);
    expect(hf[0].ruleId).toBe('huggingface-token');

    const twilioSample = ['SK', '1234567890abcdef1234567890abcdef'].join('');
    const twilio = detectSecretsInValue(twilioSample, 'TWILIO_KEY');
    expect(twilio).toHaveLength(1);
    expect(twilio[0].ruleId).toBe('twilio-api-key');

    const resendSample = ['re_', '1234567890abcdefghijklmnopqr'].join('');
    const resend = detectSecretsInValue(resendSample, 'RESEND_KEY');
    expect(resend).toHaveLength(1);
    expect(resend[0].ruleId).toBe('resend-api-key');
  });

  it('detects unclassified high-entropy random secrets', () => {
    const randomSecret = 'N3wY0rk$3cr3tT0k3n_v4Lu3#987!xYzQpL91';
    const findings = detectSecretsInValue(randomSecret, 'MY_CUSTOM_SECRET');
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].ruleId).toBe('high-entropy-secret');
  });

  it('allows tuning entropy threshold and minLength for borderline strings', () => {
    // String with entropy around 4.39 and length 22
    const borderlineString = 'a1B2c3D4e5F6g7H8i9J0kL';
    const entropy = calculateShannonEntropy(borderlineString);
    expect(entropy).toBeGreaterThan(4.3);
    expect(entropy).toBeLessThan(4.5);

    // Default threshold (4.3) detects it
    const defaultFindings = detectSecretsInValue(borderlineString, 'BORDERLINE_KEY');
    expect(defaultFindings).toHaveLength(1);
    expect(defaultFindings[0].ruleId).toBe('high-entropy-secret');

    // Custom higher threshold (4.5) avoids false positive on borderline string
    const relaxedFindings = detectSecretsInValue(borderlineString, 'BORDERLINE_KEY', undefined, {
      entropyThreshold: 4.5
    });
    expect(relaxedFindings).toHaveLength(0);

    // Custom higher minLength (30) avoids false positive on borderline string
    const minLengthFindings = detectSecretsInValue(borderlineString, 'BORDERLINE_KEY', undefined, {
      minLength: 30
    });
    expect(minLengthFindings).toHaveLength(0);
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
