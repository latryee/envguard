import { describe, it, expect } from 'vitest';
import {
  computeEnvDiff,
  renderTerminalReport,
  renderSarifReport,
  renderGitHubReport,
  renderPrCommentReport,
  renderJsonReport,
  generateLspDiagnostics,
  isClientContext,
  getFrameworkInfo,
  detectFramework,
  checkClientSideExposures,
  parseEnv
} from '../src/index.js';

describe('Framework Client Leak Boundaries & Reporter Coverage', () => {
  it('tests client context across Vite, Remix, Nuxt, SvelteKit, Astro and API paths', () => {
    const viteFw = getFrameworkInfo('vite');
    const remixFw = getFrameworkInfo('remix');
    const nuxtFw = getFrameworkInfo('nuxt');
    const sveltekitFw = getFrameworkInfo('sveltekit');
    const astroFw = getFrameworkInfo('astro');
    const nextFw = getFrameworkInfo('nextjs');

    // Vite
    expect(isClientContext('src/App.vue', '', viteFw)).toBe(true);
    expect(isClientContext('vite.config.ts', '', viteFw)).toBe(false);
    expect(isClientContext('src/server/api.ts', '', viteFw)).toBe(false);

    // Remix
    expect(isClientContext('app/routes/index.client.tsx', '', remixFw)).toBe(true);
    expect(isClientContext('app/routes/data.server.ts', '', remixFw)).toBe(false);

    // Nuxt
    expect(isClientContext('pages/index.vue', '', nuxtFw)).toBe(true);
    expect(isClientContext('server/api/user.ts', '', nuxtFw)).toBe(false);

    // SvelteKit
    expect(isClientContext('src/routes/+page.svelte', '', sveltekitFw)).toBe(true);
    expect(isClientContext('src/routes/+server.ts', '', sveltekitFw)).toBe(false);

    // Astro
    expect(isClientContext('src/components/Card.astro', '', astroFw)).toBe(true);

    // Next.js
    expect(isClientContext('app/api/auth/route.ts', '', nextFw)).toBe(false);
    expect(isClientContext('src/hooks/useUser.ts', '', nextFw)).toBe(true);
  });

  it('renders all reporters with client leaks, secret leaks, type mismatches, and drift', () => {
    const envAst = parseEnv(`
PORT=invalid
AWS_KEY=AKIAIOSFODNN7EXAMPLE
`);
    const exampleAst = parseEnv(`
# @type port
PORT=3000
# @required true
REQUIRED_VAR=secret_val
# @optional
OPTIONAL_VAR=demo
OBSOLETE_KEY=value
`);

    const clientLeaks = [
      {
        key: 'STRIPE_SECRET_KEY',
        filePath: 'src/components/Checkout.tsx',
        line: 14,
        column: 20,
        framework: 'Next.js',
        expectedPrefix: 'NEXT_PUBLIC_',
        severity: 'critical' as const,
        message: 'Private variable "STRIPE_SECRET_KEY" referenced in client component.'
      }
    ];

    const diff = computeEnvDiff({
      envAst,
      exampleAst,
      codeKeys: new Set(['PORT', 'REQUIRED_VAR', 'UNMAPPED_CODE_VAR']),
      codeReferences: new Map([
        ['REQUIRED_VAR', [{ key: 'REQUIRED_VAR', file: 'src/server.ts', line: 10, column: 5, snippet: 'process.env.REQUIRED_VAR', language: 'typescript' }]],
        ['UNMAPPED_CODE_VAR', [{ key: 'UNMAPPED_CODE_VAR', file: 'src/index.ts', line: 20, column: 1, snippet: 'process.env.UNMAPPED_CODE_VAR', language: 'typescript' }]]
      ]),
      clientLeaks
    });

    // Terminal
    const term = renderTerminalReport(diff, { verbose: true });
    expect(term).toContain('FRAMEWORK CLIENT-SIDE LEAK DETECTED');
    expect(term).toContain('STRIPE_SECRET_KEY');
    expect(term).toContain('Missing in .env (Optional / Has Default)');

    // SARIF
    const sarif = renderSarifReport(diff);
    const parsedSarif = JSON.parse(sarif);
    expect(parsedSarif.version).toBe('2.1.0');
    expect(parsedSarif.runs[0].results.some((r: any) => r.ruleId === 'framework-client-leak')).toBe(true);
    expect(parsedSarif.runs[0].results.some((r: any) => r.ruleId === 'missing-required-env')).toBe(true);
    expect(parsedSarif.runs[0].results.some((r: any) => r.ruleId === 'undocumented-env-variable')).toBe(true);

    // GitHub Annotations
    const gh = renderGitHubReport(diff);
    expect(gh).toContain('::error file=src/components/Checkout.tsx line=14,title=Client Bundle Secret Leak::');

    // PR Comment
    const pr = renderPrCommentReport(diff);
    expect(pr).toContain('Client Bundle Secret Leaks');
    expect(pr).toContain('STRIPE_SECRET_KEY');

    // JSON
    const json = renderJsonReport(diff);
    const parsedJson = JSON.parse(json);
    expect(parsedJson.clientLeaks.length).toBe(1);

    // LSP Diagnostics
    const lspMap = generateLspDiagnostics(diff);
    const checkoutLsp = lspMap.get('file:///src/components/Checkout.tsx');
    expect(checkoutLsp).toBeDefined();
    expect(checkoutLsp![0].code).toBe('framework-client-leak');

    const serverLsp = lspMap.get('file:///src/server.ts');
    expect(serverLsp).toBeDefined();
    expect(serverLsp![0].code).toBe('missing-required-env');

    const indexLsp = lspMap.get('file:///src/index.ts');
    expect(indexLsp).toBeDefined();
    expect(indexLsp!.some((d) => d.code === 'undocumented-env-variable')).toBe(true);
  });
});
