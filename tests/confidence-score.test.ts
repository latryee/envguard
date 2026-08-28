import { describe, it, expect } from 'vitest';
import { detectSecretsInValue, maskSecret } from '../src/index.js';

describe('Confidence Scoring & Curated Rules System', () => {
  it('calculates HIGH confidence (>= 90%) for curated provider tokens', () => {
    // Anthropic
    const anthropicKey = ['sk-ant-', 'api03-abcdef1234567890abcdef1234567890abcdef1234567890'].join('');
    const anthropicFindings = detectSecretsInValue(anthropicKey, 'ANTHROPIC_API_KEY');
    expect(anthropicFindings.length).toBeGreaterThan(0);
    expect(anthropicFindings[0].confidence).toBeGreaterThanOrEqual(95);
    expect(anthropicFindings[0].confidenceLevel).toBe('HIGH');

    // OpenAI
    const openaiKey = ['sk-proj-', 'abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGH'].join('');
    const openaiFindings = detectSecretsInValue(openaiKey, 'OPENAI_KEY');
    expect(openaiFindings.length).toBeGreaterThan(0);
    expect(openaiFindings[0].confidence).toBeGreaterThanOrEqual(95);
    expect(openaiFindings[0].confidenceLevel).toBe('HIGH');

    // AWS
    const awsKey = ['AKIA', 'IOSFODNN7EXAMPLE'].join('');
    const awsFindings = detectSecretsInValue(awsKey, 'AWS_ACCESS_KEY_ID');
    expect(awsFindings.length).toBeGreaterThan(0);
    expect(awsFindings[0].confidence).toBeGreaterThanOrEqual(95);
    expect(awsFindings[0].confidenceLevel).toBe('HIGH');

    // GitHub PAT
    const ghp = ['ghp_', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890'].join('');
    const ghFindings = detectSecretsInValue(ghp, 'GITHUB_TOKEN');
    expect(ghFindings.length).toBeGreaterThan(0);
    expect(ghFindings[0].confidence).toBeGreaterThanOrEqual(95);
    expect(ghFindings[0].confidenceLevel).toBe('HIGH');
  });

  it('detects Google Cloud Service Account JSON keys', () => {
    const gcpServiceAccount = '{\n  "type": "service_account",\n  "project_id": "my-project",\n  "private_key_id": "1234567890abcdef1234567890abcdef12345678"\n}';
    const findings = detectSecretsInValue(gcpServiceAccount, 'GOOGLE_CREDENTIALS');
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].ruleId).toBe('gcp-service-account-key');
    expect(findings[0].confidence).toBeGreaterThanOrEqual(95);
  });

  it('detects Azure Storage Account Connection Strings and Azure Client Secrets', () => {
    const azureStorage = 'DefaultEndpointsProtocol=https;AccountName=myaccount;AccountKey=dGVzdF9rZXlfMTIzNDU2Nzg5MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMTIzNDU2Nzg5MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMTIzNDU2Nzg=;EndpointSuffix=core.windows.net';
    const storageFindings = detectSecretsInValue(azureStorage, 'AZURE_STORAGE_CONNECTION');
    expect(storageFindings.length).toBeGreaterThan(0);
    expect(storageFindings[0].ruleId).toBe('azure-storage-key');
    expect(storageFindings[0].confidence).toBeGreaterThanOrEqual(95);

    const azureSecret = 'azure_client_secret = "12345678-abcd-1234-abcd-1234567890ab~abcdef1234"';
    const secretFindings = detectSecretsInValue(azureSecret, 'AZURE_CLIENT_SECRET');
    expect(secretFindings.length).toBeGreaterThan(0);
    expect(secretFindings[0].ruleId).toBe('azure-client-secret');
  });

  it('detects PyPI and Docker Hub tokens', () => {
    const pypiToken = ['pypi-', 'AgEIcHlwaS5vcmcCJDEyMzQ1Njc4LTBhYmMtNGRlZi1naGlqLTEyMzQ1Njc4OTAxMgACIzEyMzQ1Njc4OTAxMjM0NTY3ODkwMTIzNDU2Nzg5MDEyMzQ1Njc4OTA'].join('');
    const pypiFindings = detectSecretsInValue(pypiToken, 'PYPI_TOKEN');
    expect(pypiFindings.length).toBeGreaterThan(0);
    expect(pypiFindings[0].ruleId).toBe('pypi-token');
    expect(pypiFindings[0].confidence).toBeGreaterThanOrEqual(95);

    const dckrToken = ['dckr_', 'pat_', '1234567890abcdef1234567890a'].join('');
    const dckrFindings = detectSecretsInValue(dckrToken, 'DOCKER_HUB_PAT');
    expect(dckrFindings.length).toBeGreaterThan(0);
    expect(dckrFindings[0].ruleId).toBe('docker-hub-token');
    expect(dckrFindings[0].confidence).toBeGreaterThanOrEqual(95);
  });

  it('detects generic private key blocks', () => {
    const rsaKey = '-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA0\n-----END RSA PRIVATE KEY-----';
    const findings = detectSecretsInValue(rsaKey, 'PRIVATE_KEY');
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].ruleId).toBe('private-key');
    expect(findings[0].confidence).toBe(100);
  });

  it('filters by paranoid vs default mode for medium-confidence findings', () => {
    // A high entropy token without explicit secret keyword
    const randomToken = 'k8J2m9P0qL3wX5yZ7vB1cE4rT6uN8iO0';

    // In standard mode (default), minConfidence is 80, so medium-confidence generic high-entropy strings are suppressed
    const defaultFindings = detectSecretsInValue(randomToken, 'SESSION_BLOB');
    expect(defaultFindings.length).toBe(0);

    // In paranoid mode, minConfidence is 50, so medium-confidence findings are surfaced
    const paranoidFindings = detectSecretsInValue(randomToken, 'SESSION_BLOB', undefined, {
      paranoid: true
    });
    expect(paranoidFindings.length).toBeGreaterThan(0);
    expect(paranoidFindings[0].confidenceLevel).toBe('MEDIUM');
  });

  it('masks secrets securely', () => {
    expect(maskSecret('')).toBe('***');
    expect(maskSecret('12345')).toBe('***');
    expect(maskSecret('sk-1234567890')).toBe('sk...90');
    expect(maskSecret('sk-ant-api03-abcdef1234567890')).toBe('sk-a...7890');
  });
});
