import { describe, it, expect } from 'vitest';
import { detectSecretsInValue, isHighEntropyString } from '../src/index.js';

describe('Negative Test Corpus - False Positive Measurement', () => {
  const NEGATIVE_CORPUS: Array<{ name: string; value: string; contextKey?: string }> = [
    // 1. Base64 Data URIs & image buffers
    {
      name: 'PNG Base64 1x1 Pixel Data URI',
      value: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    },
    {
      name: 'SVG Base64 Data URI',
      value: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PC9zdmc+'
    },

    // 2. Standard UUIDs (v4, v5, nil, urn)
    {
      name: 'UUID v4 standard format',
      value: 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
    },
    {
      name: 'URN UUID format',
      value: 'urn:uuid:6ba7b810-9dad-11d1-80b4-00c04fd430c8'
    },
    {
      name: 'Uppercase UUID',
      value: 'E621E1F8-C36C-495A-93FC-0C247A3E6E5F'
    },

    // 3. Git commit & object SHA hashes
    {
      name: 'Git commit 40-char SHA-1 hash',
      value: '4b825dc642cb6eb9a060e54bf8d69288fbee4904',
      contextKey: 'GIT_COMMIT_HASH'
    },
    {
      name: 'SHA-256 Checksum hash',
      value: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      contextKey: 'BUILD_CHECKSUM'
    },

    // 4. Webpack / Vite / Rollup build asset chunk filenames
    {
      name: 'Vite JS asset chunk filename',
      value: 'chunk-2d1f7c89a0b1.js',
      contextKey: 'BUNDLE_FILE'
    },
    {
      name: 'CSS bundle asset filename',
      value: 'app-a89c7d6e12f0.css',
      contextKey: 'CSS_ASSET'
    },

    // 5. Complex URLs with high-entropy query parameters & tokens
    {
      name: 'OAuth redirect URL with state query param',
      value: 'https://auth.example.com/oauth/callback?state=xyz987abc654&scope=read%20write'
    },
    {
      name: 'PostgreSQL connection URL template with mock credentials',
      value: 'postgresql://postgres:postgres@localhost:5432/production_db'
    },
    {
      name: 'Redis local URL',
      value: 'redis://localhost:6379'
    },

    // 6. Safe placeholders & documentation mocks
    {
      name: 'Explicit placeholder key',
      value: 'your_openai_api_key_here',
      contextKey: 'OPENAI_API_KEY'
    },
    {
      name: 'Sample placeholder token',
      value: 'your-stripe-secret-key-here',
      contextKey: 'STRIPE_SECRET_KEY'
    },
    {
      name: 'Replace-me token',
      value: 'replace_me_with_production_key'
    },
    {
      name: 'Changeme password',
      value: 'changeme_in_production'
    },

    // 7. HTML / CSS classes / Nonce identifiers
    {
      name: 'Tailwind / CSS random class name',
      value: 'css-module-ab89cf129e018d47'
    },
    {
      name: 'CSP nonce header',
      value: 'nonce-rAnd0m1234567890'
    },

    // 8. Unsigned / Mock JWT header/payload test strings
    {
      name: 'Unsigned Mock JWT header',
      value: 'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIn0.'
    }
  ];

  it('measures 0% false-positive rate across the entire negative test corpus', () => {
    let falsePositives = 0;
    const failures: string[] = [];

    for (const item of NEGATIVE_CORPUS) {
      const findings = detectSecretsInValue(item.value, item.contextKey);
      if (findings.length > 0) {
        falsePositives++;
        failures.push(`${item.name} (${item.value.slice(0, 30)}...): matched ${findings.map((f) => f.ruleName).join(', ')}`);
      }
    }

    const total = NEGATIVE_CORPUS.length;
    const fpRate = (falsePositives / total) * 100;

    // Report for CI visibility
    console.log(`\n📊 Negative Test Corpus Benchmark:`);
    console.log(`   Total Non-Secret Items Tested: ${total}`);
    console.log(`   False Positives Detected:     ${falsePositives}`);
    console.log(`   False Positive Rate:          ${fpRate.toFixed(2)}%\n`);

    if (failures.length > 0) {
      console.warn('False positive items:\n' + failures.join('\n'));
    }

    expect(falsePositives).toBe(0);
    expect(fpRate).toBe(0);
  });

  it('filters out UUIDs and data URIs from isHighEntropyString', () => {
    expect(isHighEntropyString('f47ac10b-58cc-4372-a567-0e02b2c3d479')).toBe(false);
    expect(isHighEntropyString('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==')).toBe(false);
    expect(isHighEntropyString('4b825dc642cb6eb9a060e54bf8d69288fbee4904')).toBe(false);
  });
});
