import fs from 'node:fs';
import path from 'node:path';

export type SupportedFramework =
  | 'nextjs'
  | 'vite'
  | 'nuxt'
  | 'remix'
  | 'astro'
  | 'sveltekit'
  | 'nestjs'
  | 'django'
  | 'fastapi'
  | 'generic';

export interface FrameworkInfo {
  name: SupportedFramework;
  displayName: string;
  publicPrefixes: string[];
  defaultEnvFiles: string[];
  clientFilePatterns: string[];
}

const FRAMEWORK_DEFINITIONS: Record<SupportedFramework, FrameworkInfo> = {
  nextjs: {
    name: 'nextjs',
    displayName: 'Next.js',
    publicPrefixes: ['NEXT_PUBLIC_'],
    defaultEnvFiles: ['.env.development.local', '.env.local', '.env.development', '.env'],
    clientFilePatterns: ['app/**/page.{tsx,jsx,ts,js}', 'components/**', 'src/components/**', 'pages/**']
  },
  vite: {
    name: 'vite',
    displayName: 'Vite',
    publicPrefixes: ['VITE_'],
    defaultEnvFiles: ['.env.local', '.env.development', '.env'],
    clientFilePatterns: ['src/**/*.{tsx,jsx,vue,svelte}', 'index.html']
  },
  nuxt: {
    name: 'nuxt',
    displayName: 'Nuxt',
    publicPrefixes: ['NUXT_PUBLIC_'],
    defaultEnvFiles: ['.env'],
    clientFilePatterns: ['pages/**', 'components/**', 'layouts/**']
  },
  remix: {
    name: 'remix',
    displayName: 'Remix',
    publicPrefixes: ['REMIX_PUBLIC_', 'PUBLIC_'],
    defaultEnvFiles: ['.env'],
    clientFilePatterns: ['app/routes/**', 'app/components/**']
  },
  astro: {
    name: 'astro',
    displayName: 'Astro',
    publicPrefixes: ['PUBLIC_'],
    defaultEnvFiles: ['.env'],
    clientFilePatterns: ['src/pages/**', 'src/components/**']
  },
  sveltekit: {
    name: 'sveltekit',
    displayName: 'SvelteKit',
    publicPrefixes: ['PUBLIC_'],
    defaultEnvFiles: ['.env'],
    clientFilePatterns: ['src/routes/**', 'src/lib/**']
  },
  nestjs: {
    name: 'nestjs',
    displayName: 'NestJS',
    publicPrefixes: [],
    defaultEnvFiles: ['.env.development', '.env'],
    clientFilePatterns: []
  },
  django: {
    name: 'django',
    displayName: 'Django',
    publicPrefixes: [],
    defaultEnvFiles: ['.env', 'local_settings.py'],
    clientFilePatterns: []
  },
  fastapi: {
    name: 'fastapi',
    displayName: 'FastAPI',
    publicPrefixes: [],
    defaultEnvFiles: ['.env'],
    clientFilePatterns: []
  },
  generic: {
    name: 'generic',
    displayName: 'Generic',
    publicPrefixes: [],
    defaultEnvFiles: ['.env.local', '.env'],
    clientFilePatterns: []
  }
};

/**
 * Detects the active framework in the specified project directory.
 */
export function detectFramework(cwd = process.cwd()): FrameworkInfo {
  // Check package.json dependencies
  const pkgPath = path.join(cwd, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const raw = fs.readFileSync(pkgPath, 'utf8');
      const pkg = JSON.parse(raw);
      const allDeps = {
        ...pkg.dependencies,
        ...pkg.devDependencies
      };

      if (allDeps.next) return FRAMEWORK_DEFINITIONS.nextjs;
      if (allDeps.vite) return FRAMEWORK_DEFINITIONS.vite;
      if (allDeps.nuxt) return FRAMEWORK_DEFINITIONS.nuxt;
      if (allDeps['@remix-run/react'] || allDeps['@remix-run/node']) return FRAMEWORK_DEFINITIONS.remix;
      if (allDeps.astro) return FRAMEWORK_DEFINITIONS.astro;
      if (allDeps['@sveltejs/kit']) return FRAMEWORK_DEFINITIONS.sveltekit;
      if (allDeps['@nestjs/core']) return FRAMEWORK_DEFINITIONS.nestjs;
    } catch {
      // ignore
    }
  }

  // Check Python indicators
  if (fs.existsSync(path.join(cwd, 'manage.py'))) {
    return FRAMEWORK_DEFINITIONS.django;
  }
  if (fs.existsSync(path.join(cwd, 'main.py')) || fs.existsSync(path.join(cwd, 'app', 'main.py'))) {
    return FRAMEWORK_DEFINITIONS.fastapi;
  }

  return FRAMEWORK_DEFINITIONS.generic;
}

export function getFrameworkInfo(framework: SupportedFramework): FrameworkInfo {
  return FRAMEWORK_DEFINITIONS[framework] || FRAMEWORK_DEFINITIONS.generic;
}
