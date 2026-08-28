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
  'CERT'
];

/**
 * Checks if a file is executed in client-side runtime context.
 */
export function isClientContext(filePath: string, fileContent: string, framework: FrameworkInfo): boolean {
  const normPath = (filePath || '').replace(/\\/g, '/');

  // Next.js: explicit 'use client' directive
  if (framework.name === 'nextjs') {
    if (fileContent.includes("'use client'") || fileContent.includes('"use client"')) {
      return true;
    }
    // Component directory heuristics
    if (normPath.includes('/components/') || normPath.includes('/hooks/')) {
      return true;
    }
  }

  // Vite: default client-side SPA bundle in src/
  if (framework.name === 'vite') {
    if (normPath.includes('/src/') && (normPath.endsWith('.tsx') || normPath.endsWith('.jsx') || normPath.endsWith('.vue') || normPath.endsWith('.svelte'))) {
      return true;
    }
  }

  // Remix: .client.tsx or components
  if (framework.name === 'remix') {
    if (normPath.endsWith('.client.tsx') || normPath.endsWith('.client.jsx') || normPath.includes('/components/')) {
      return true;
    }
  }

  // Astro / Nuxt / SvelteKit client components
  if (normPath.includes('/components/') || normPath.includes('/ui/')) {
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

    // If key already starts with public prefix, it's explicitly public
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
        message: `Private variable "${key}" is referenced in a client-side component in ${framework.displayName}. In ${framework.displayName}, client-accessible variables must be prefixed with "${primaryPrefix}".`
      });
    }
  }

  return findings;
}
