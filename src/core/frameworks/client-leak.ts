import { CodeReference } from '../scanner/patterns.js';
import { FrameworkInfo, detectFramework } from './detector.js';

export interface ClientExposureFinding {
  key: string;
  filePath: string;
  line: number;
  column: number;
  framework: string;
  expectedPrefix: string;
  message: string;
  severity: 'critical' | 'high' | 'warning';
}

const PRIVATE_SECRET_KEYWORDS = [
  'SECRET',
  'KEY',
  'TOKEN',
  'PASSWORD',
  'PASS',
  'AUTH',
  'DATABASE',
  'DB_',
  'PRIVATE',
  'CREDENTIAL',
  'CERT',
  'SIGNING'
];

/**
 * Checks if a file is executed in client-side runtime context.
 */
export function isClientContext(filePath: string, fileContent: string, framework: FrameworkInfo): boolean {
  let normPath = (filePath || '').replace(/\\/g, '/');
  if (!normPath.startsWith('/')) {
    normPath = '/' + normPath;
  }

  // Next.js: explicit 'use client' directive, or component/hooks directories
  if (framework.name === 'nextjs') {
    if (fileContent.includes("'use client'") || fileContent.includes('"use client"')) {
      return true;
    }
    // App Router Server API / Route handlers are server context
    if (normPath.includes('/api/') || normPath.endsWith('/route.ts') || normPath.endsWith('/route.js')) {
      return false;
    }
    // Component directory heuristics
    if (normPath.includes('/components/') || normPath.includes('/hooks/') || normPath.includes('/ui/')) {
      return true;
    }
    // Pages router (non-API)
    if (normPath.includes('/pages/') && !normPath.includes('/pages/api/')) {
      return true;
    }
  }

  // Vite: default client-side SPA bundle in src/ (except build config or server files)
  if (framework.name === 'vite') {
    if (normPath.includes('vite.config.') || normPath.includes('/server/') || normPath.includes('/api/')) {
      return false;
    }
    if (normPath.includes('/src/') && (normPath.endsWith('.tsx') || normPath.endsWith('.jsx') || normPath.endsWith('.vue') || normPath.endsWith('.svelte') || normPath.endsWith('.ts') || normPath.endsWith('.js'))) {
      return true;
    }
  }

  // Remix: .client.tsx or components or client routes
  if (framework.name === 'remix') {
    if (normPath.endsWith('.server.ts') || normPath.endsWith('.server.js')) {
      return false;
    }
    if (normPath.endsWith('.client.tsx') || normPath.endsWith('.client.jsx') || normPath.includes('/components/') || normPath.includes('/app/routes/')) {
      return true;
    }
  }

  // Nuxt: pages, components, layouts, composables (except server directory)
  if (framework.name === 'nuxt') {
    if (normPath.includes('/server/')) {
      return false;
    }
    if (normPath.includes('/pages/') || normPath.includes('/components/') || normPath.includes('/layouts/') || normPath.includes('/composables/')) {
      return true;
    }
  }

  // SvelteKit: client routes and lib (except server endpoints +server.ts or .server.ts)
  if (framework.name === 'sveltekit') {
    if (normPath.endsWith('+server.ts') || normPath.endsWith('+server.js') || normPath.includes('.server.')) {
      return false;
    }
    if (normPath.includes('/src/routes/') || normPath.includes('/src/lib/')) {
      return true;
    }
  }

  // Astro: client components & UI
  if (framework.name === 'astro') {
    if (normPath.includes('/src/components/') || normPath.includes('/src/ui/')) {
      return true;
    }
  }

  // Generic client components directory
  if (normPath.includes('/components/') || normPath.includes('/ui/') || normPath.includes('/hooks/')) {
    return true;
  }

  return false;
}

/**
 * Validates code references against framework public prefix rules.
 */
export function checkClientSideExposures(
  references: CodeReference[],
  fileContents: Map<string, string>,
  cwd = process.cwd()
): ClientExposureFinding[] {
  const framework = detectFramework(cwd);
  if (framework.publicPrefixes.length === 0) {
    return [];
  }

  const primaryPrefix = framework.publicPrefixes[0];
  const findings: ClientExposureFinding[] = [];

  for (const ref of references) {
    const key = ref.key;

    // If key already starts with public prefix, it's explicitly allowed for client bundles
    if (framework.publicPrefixes.some((prefix) => key.startsWith(prefix))) {
      continue;
    }

    // Check if the variable looks sensitive or private
    const upperKey = key.toUpperCase();
    const isSensitive = PRIVATE_SECRET_KEYWORDS.some((kw) => upperKey.includes(kw));

    if (!isSensitive) {
      continue;
    }

    // Check if file is client context
    const content = fileContents.get(ref.file) || '';
    if (isClientContext(ref.file, content, framework)) {
      findings.push({
        key,
        filePath: ref.file,
        line: ref.line,
        column: ref.column,
        framework: framework.displayName,
        expectedPrefix: primaryPrefix,
        severity: 'critical',
        message: `Private variable "${key}" is referenced in a client-side component in ${framework.displayName}. In ${framework.displayName}, client-accessible variables must be prefixed with "${primaryPrefix}".`
      });
    }
  }

  return findings;
}
