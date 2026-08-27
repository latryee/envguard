import { describe, it, expect } from 'vitest';
import { parseEnv } from '../src/core/parser/env-parser.js';
import { computeEnvDiff } from '../src/core/diff/env-differ.js';

describe('Diff & Drift Computation Engine', () => {
  it('identifies missing variables in .env that are required by .env.example', () => {
    const exampleRaw = `PORT=3000 # @type port @required\nDATABASE_URL=postgres://...\nOPTIONAL_VAR=foo # @optional`;
    const envRaw = `DATABASE_URL=postgres://localhost/mydb`;

    const exampleAst = parseEnv(exampleRaw);
    const envAst = parseEnv(envRaw);

    const diff = computeEnvDiff({ envAst, exampleAst });

    expect(diff.missingInEnv.length).toBe(2);
    const portMissing = diff.missingInEnv.find((m) => m.key === 'PORT');
    expect(portMissing).toBeDefined();
    expect(portMissing?.required).toBe(true);

    const optMissing = diff.missingInEnv.find((m) => m.key === 'OPTIONAL_VAR');
    expect(optMissing?.required).toBe(false);
    expect(diff.hasErrors).toBe(true);
  });

  it('identifies missing documentation drift in .env.example', () => {
    const exampleRaw = `PORT=3000`;
    const envRaw = `PORT=3000\nNEW_FEATURE_FLAG=true`;

    const diff = computeEnvDiff({
      envAst: parseEnv(envRaw),
      exampleAst: parseEnv(exampleRaw)
    });

    expect(diff.missingInExample.length).toBe(1);
    expect(diff.missingInExample[0].key).toBe('NEW_FEATURE_FLAG');
    expect(diff.hasWarnings).toBe(true);
  });

  it('detects type mismatches between .env and .env.example', () => {
    const exampleRaw = `PORT=3000 # @type port\nDEBUG=false # @type boolean`;
    const envRaw = `PORT=not_a_number\nDEBUG=invalid_bool`;

    const diff = computeEnvDiff({
      envAst: parseEnv(envRaw),
      exampleAst: parseEnv(exampleRaw)
    });

    expect(diff.typeMismatches.length).toBe(2);
    expect(diff.typeMismatches.some((e) => e.key === 'PORT')).toBe(true);
    expect(diff.typeMismatches.some((e) => e.key === 'DEBUG')).toBe(true);
    expect(diff.hasErrors).toBe(true);
  });

  it('detects real secret leaks checked into .env.example', () => {
    const fakeKey = ['sk_test_', '51AbCdEfGhIjKlMnOpQrStUvWxYz'].join('');
    const exampleRaw = `
# Leaked simulated key
STRIPE_KEY=${fakeKey}
`;
    const diff = computeEnvDiff({
      exampleAst: parseEnv(exampleRaw)
    });

    expect(diff.secretLeaks.length).toBe(1);
    expect(diff.secretLeaks[0].ruleId).toBe('stripe-secret-key');
    expect(diff.hasErrors).toBe(true);
  });

  it('detects stale variables in .env.example not present in code or .env', () => {
    const exampleRaw = `PORT=3000\nDEAD_VARIABLE=123`;
    const envRaw = `PORT=3000`;
    const codeKeys = new Set(['PORT']);

    const diff = computeEnvDiff({
      envAst: parseEnv(envRaw),
      exampleAst: parseEnv(exampleRaw),
      codeKeys
    });

    expect(diff.staleInExample.length).toBe(1);
    expect(diff.staleInExample[0].key).toBe('DEAD_VARIABLE');
  });
});
