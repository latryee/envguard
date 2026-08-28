import { DiffResult } from '../core/diff/env-differ.js';

export function renderSarifReport(diff: DiffResult): string {
  const rulesMap = new Map<string, { id: string; name: string; description: string; level: 'error' | 'warning' }>();
  const results: any[] = [];

  // 1. Secret leaks
  for (const leak of diff.secretLeaks) {
    const ruleId = leak.ruleId;
    if (!rulesMap.has(ruleId)) {
      rulesMap.set(ruleId, {
        id: ruleId,
        name: leak.ruleName,
        description: leak.description,
        level: 'error'
      });
    }

    const fileUri = (leak.file || '.env').replace(/\\/g, '/');
    const startLine = leak.line && leak.line > 0 ? leak.line : 1;

    results.push({
      ruleId,
      level: 'error',
      message: {
        text: `[${leak.ruleName}] ${leak.description} Masked: ${leak.snippetMasked}. Fix: ${leak.remediation}`
      },
      locations: [
        {
          physicalLocation: {
            artifactLocation: {
              uri: fileUri,
              uriBaseId: '%SRCROOT%'
            },
            region: {
              startLine,
              startColumn: 1
            }
          }
        }
      ]
    });
  }

  // 2. Type mismatches
  if (diff.typeMismatches.length > 0) {
    rulesMap.set('env-type-mismatch', {
      id: 'env-type-mismatch',
      name: 'Environment Variable Type Mismatch',
      description: 'Environment variable value does not match the schema type specified in .env.example.',
      level: 'error'
    });

    for (const err of diff.typeMismatches) {
      const startLine = err.line && err.line > 0 ? err.line : 1;
      results.push({
        ruleId: 'env-type-mismatch',
        level: 'error',
        message: {
          text: `Variable "${err.key}": ${err.message} (Expected: ${err.expectedType}, got: "${err.value}")`
        },
        locations: [
          {
            physicalLocation: {
              artifactLocation: {
                uri: '.env',
                uriBaseId: '%SRCROOT%'
              },
              region: {
                startLine,
                startColumn: 1
              }
            }
          }
        ]
      });
    }
  }

  // 3. Missing required in .env
  const requiredMissing = diff.missingInEnv.filter((m) => m.required);
  if (requiredMissing.length > 0) {
    rulesMap.set('missing-required-env', {
      id: 'missing-required-env',
      name: 'Missing Required Environment Variable',
      description: 'A required environment variable referenced in code or documented in .env.example is missing in .env.',
      level: 'error'
    });

    for (const m of requiredMissing) {
      const firstRef = m.references && m.references.length > 0 ? m.references[0] : undefined;
      const fileUri = firstRef ? firstRef.file.replace(/\\/g, '/') : '.env';
      const startLine = firstRef?.line || 1;

      results.push({
        ruleId: 'missing-required-env',
        level: 'error',
        message: {
          text: `Required environment variable "${m.key}" is missing in .env.`
        },
        locations: [
          {
            physicalLocation: {
              artifactLocation: {
                uri: fileUri,
                uriBaseId: '%SRCROOT%'
              },
              region: {
                startLine,
                startColumn: firstRef?.column || 1
              }
            }
          }
        ]
      });
    }
  }

  // 4. Missing in .env.example (Drift)
  if (diff.missingInExample.length > 0) {
    rulesMap.set('undocumented-env-variable', {
      id: 'undocumented-env-variable',
      name: 'Undocumented Environment Variable (Drift)',
      description: 'An environment variable is used in source code or present in .env but missing in .env.example.',
      level: 'warning'
    });

    for (const m of diff.missingInExample) {
      const firstRef = m.references && m.references.length > 0 ? m.references[0] : undefined;
      const fileUri = firstRef ? firstRef.file.replace(/\\/g, '/') : '.env.example';
      const startLine = firstRef?.line || 1;

      results.push({
        ruleId: 'undocumented-env-variable',
        level: 'warning',
        message: {
          text: `Variable "${m.key}" is used in code or defined in .env but missing in .env.example.`
        },
        locations: [
          {
            physicalLocation: {
              artifactLocation: {
                uri: fileUri,
                uriBaseId: '%SRCROOT%'
              },
              region: {
                startLine,
                startColumn: firstRef?.column || 1
              }
            }
          }
        ]
      });
    }
  }

  const sarifDoc = {
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'envguard',
            version: '1.0.0',
            informationUri: 'https://github.com/latryee/envguard',
            rules: Array.from(rulesMap.values()).map((r) => ({
              id: r.id,
              name: r.name,
              shortDescription: { text: r.name },
              fullDescription: { text: r.description },
              defaultConfiguration: {
                level: r.level
              }
            }))
          }
        },
        results
      }
    ]
  };

  return JSON.stringify(sarifDoc, null, 2);
}
