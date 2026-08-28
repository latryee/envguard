import { DiffResult } from '../core/diff/env-differ.js';

interface SarifRuleMeta {
  id: string;
  name: string;
  shortDescription: { text: string };
  fullDescription: { text: string };
  helpUri?: string;
  help?: { text: string; markdown: string };
  defaultConfiguration: {
    level: 'error' | 'warning' | 'note';
  };
  properties?: {
    precision?: 'very-high' | 'high' | 'medium' | 'low';
    'security-severity'?: string;
    tags?: string[];
  };
}

export function renderSarifReport(diff: DiffResult): string {
  const rulesMap = new Map<string, SarifRuleMeta>();
  const results: any[] = [];

  // 1. Secret leaks
  for (const leak of diff.secretLeaks) {
    const ruleId = leak.ruleId;
    if (!rulesMap.has(ruleId)) {
      rulesMap.set(ruleId, {
        id: ruleId,
        name: leak.ruleName,
        shortDescription: { text: leak.ruleName },
        fullDescription: { text: leak.description },
        helpUri: 'https://github.com/latryee/envguard#secrets-detection',
        help: {
          text: `${leak.description} Remediation: ${leak.remediation}`,
          markdown: `### ${leak.ruleName}\n\n${leak.description}\n\n**Remediation:** ${leak.remediation}`
        },
        defaultConfiguration: {
          level: 'error'
        },
        properties: {
          precision: 'very-high',
          'security-severity': leak.severity === 'critical' ? '9.5' : leak.severity === 'high' ? '8.0' : '6.0',
          tags: ['security', 'secrets', 'credential-leak']
        }
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

  // 1b. Framework client-side leaks
  if (diff.clientLeaks && diff.clientLeaks.length > 0) {
    rulesMap.set('framework-client-leak', {
      id: 'framework-client-leak',
      name: 'Framework Client Bundle Secret Leak',
      shortDescription: { text: 'Private server secret referenced in client-side component bundle' },
      fullDescription: { text: 'A private server secret without the required framework public prefix was detected inside a client-side component or AST boundary.' },
      helpUri: 'https://github.com/latryee/envguard#framework-leak-prevention',
      help: {
        text: 'Client bundle components must only reference environment variables with the designated public prefix.',
        markdown: '### Framework Client Bundle Secret Leak\n\nClient components are compiled into public browser JavaScript bundles. Referencing un-prefixed server secrets will expose credentials to end-users.\n\n**Remediation:** Prefix the variable or move sensitive logic to a Server Component or API Route.'
      },
      defaultConfiguration: {
        level: 'error'
      },
      properties: {
        precision: 'very-high',
        'security-severity': '9.0',
        tags: ['security', 'client-leak', 'zero-trust']
      }
    });

    for (const cl of diff.clientLeaks) {
      const fileUri = cl.filePath.replace(/\\/g, '/');
      const startLine = cl.line && cl.line > 0 ? cl.line : 1;
      const startColumn = cl.column && cl.column > 0 ? cl.column : 1;

      results.push({
        ruleId: 'framework-client-leak',
        level: 'error',
        message: {
          text: `Private variable "${cl.key}" referenced in client context in ${cl.framework}. Expected prefix: "${cl.expectedPrefix}".`
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
                startColumn
              }
            }
          }
        ]
      });
    }
  }

  // 2. Type mismatches
  if (diff.typeMismatches.length > 0) {
    rulesMap.set('env-type-mismatch', {
      id: 'env-type-mismatch',
      name: 'Environment Variable Type Mismatch',
      shortDescription: { text: 'Environment variable value does not match schema type' },
      fullDescription: { text: 'Environment variable value does not match the schema type specified in .env.example.' },
      helpUri: 'https://github.com/latryee/envguard#type-validation',
      help: {
        text: 'Ensure the variable value complies with the annotated type in .env.example.',
        markdown: '### Environment Variable Type Mismatch\n\nEnsure the variable value matches the type annotation (e.g. # @type number) in .env.example.'
      },
      defaultConfiguration: {
        level: 'error'
      },
      properties: {
        precision: 'high',
        'security-severity': '6.0',
        tags: ['reliability', 'validation']
      }
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
      shortDescription: { text: 'Required environment variable is missing in .env' },
      fullDescription: { text: 'A required environment variable referenced in code or documented in .env.example is missing in .env.' },
      helpUri: 'https://github.com/latryee/envguard#environment-validation',
      help: {
        text: 'Define the missing required environment variable in your .env file.',
        markdown: '### Missing Required Environment Variable\n\nA variable needed by the application is not set in `.env`.'
      },
      defaultConfiguration: {
        level: 'error'
      },
      properties: {
        precision: 'high',
        'security-severity': '7.0',
        tags: ['reliability', 'runtime-crash']
      }
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
      shortDescription: { text: 'Environment variable missing in .env.example schema' },
      fullDescription: { text: 'An environment variable is used in source code or present in .env but missing in .env.example.' },
      helpUri: 'https://github.com/latryee/envguard#schema-drift',
      help: {
        text: 'Document the variable in .env.example or run `npx envguard sync`.',
        markdown: '### Undocumented Environment Variable (Drift)\n\nRun `npx envguard sync` to automatically synchronize `.env.example`.'
      },
      defaultConfiguration: {
        level: 'warning'
      },
      properties: {
        precision: 'high',
        tags: ['documentation', 'schema-drift']
      }
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
            rules: Array.from(rulesMap.values())
          }
        },
        results
      }
    ]
  };

  return JSON.stringify(sarifDoc, null, 2);
}
