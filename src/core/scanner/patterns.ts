export interface CodeReference {
  key: string;
  file: string;
  line: number;
  column: number;
  snippet: string;
  language: 'javascript' | 'typescript' | 'python' | 'go' | 'rust' | 'php' | 'ruby' | 'docker' | 'shell' | 'other';
}

export interface LanguagePattern {
  extensions: string[];
  language: CodeReference['language'];
  regexes: RegExp[];
}

export const LANGUAGE_PATTERNS: LanguagePattern[] = [
  // JavaScript & TypeScript (Node, Next.js, Vite, Bun, Deno)
  {
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.vue', '.svelte', '.astro'],
    language: 'typescript',
    regexes: [
      /\bprocess\.env(?:\.|\?\.)([A-Za-z_][A-Za-z0-9_]*)\b/g,
      /\bprocess\.env(?:\?\.)?\[\s*['"`]([A-Za-z_][A-Za-z0-9_]*)['"`]\s*\]/g,
      /\bimport\.meta\.env(?:\.|\?\.)([A-Za-z_][A-Za-z0-9_]*)\b/g,
      /\bimport\.meta\.env(?:\?\.)?\[\s*['"`]([A-Za-z_][A-Za-z0-9_]*)['"`]\s*\]/g,
      /\bBun\.env(?:\.|\?\.)([A-Za-z_][A-Za-z0-9_]*)\b/g,
      /\bBun\.env(?:\?\.)?\[\s*['"`]([A-Za-z_][A-Za-z0-9_]*)['"`]\s*\]/g,
      /\bDeno\.env\.get\(\s*['"`]([A-Za-z_][A-Za-z0-9_]*)['"`]\s*\)/g
    ]
  },
  // Python
  {
    extensions: ['.py'],
    language: 'python',
    regexes: [
      /\bos\.environ\[\s*['"`]([A-Za-z_][A-Za-z0-9_]*)['"`]\s*\]/g,
      /\bos\.environ\.get\(\s*['"`]([A-Za-z_][A-Za-z0-9_]*)['"`]/g,
      /\bos\.getenv\(\s*['"`]([A-Za-z_][A-Za-z0-9_]*)['"`]/g,
      /\bgetenv\(\s*['"`]([A-Za-z_][A-Za-z0-9_]*)['"`]/g
    ]
  },
  // Go
  {
    extensions: ['.go'],
    language: 'go',
    regexes: [
      /\bos\.Getenv\(\s*['"`]([A-Za-z_][A-Za-z0-9_]*)['"`]\s*\)/g,
      /\bos\.LookupEnv\(\s*['"`]([A-Za-z_][A-Za-z0-9_]*)['"`]\s*\)/g
    ]
  },
  // Rust
  {
    extensions: ['.rs'],
    language: 'rust',
    regexes: [
      /\bstd::env::var(?:_os)?\(\s*['"`]([A-Za-z_][A-Za-z0-9_]*)['"`]\s*\)/g,
      /\benv::var(?:_os)?\(\s*['"`]([A-Za-z_][A-Za-z0-9_]*)['"`]\s*\)/g,
      /\bdotenvy::var\(\s*['"`]([A-Za-z_][A-Za-z0-9_]*)['"`]\s*\)/g
    ]
  },
  // PHP
  {
    extensions: ['.php'],
    language: 'php',
    regexes: [
      /\$_ENV\[\s*['"`]([A-Z_][A-Z0-9_]*)['"`]\s*\]/g,
      /\bgetenv\(\s*['"`]([A-Z_][A-Z0-9_]*)['"`]\s*\)/g
    ]
  },
  // Ruby
  {
    extensions: ['.rb'],
    language: 'ruby',
    regexes: [
      /\bENV\[\s*['"`]([A-Z_][A-Z0-9_]*)['"`]\s*\]/g,
      /\bENV\.fetch\(\s*['"`]([A-Z_][A-Z0-9_]*)['"`]/g
    ]
  },
  // Docker & Compose
  {
    extensions: ['Dockerfile', '.dockerfile', 'docker-compose.yml', 'docker-compose.yaml', 'compose.yml', 'compose.yaml'],
    language: 'docker',
    regexes: [
      /\bENV\s+([A-Z_][A-Z0-9_]*)=/g,
      /\$\{([A-Z_][A-Z0-9_]*)(?::-[^}]*)?\}/g
    ]
  }
];

// Common system variables to ignore to prevent false alerts
export const SYSTEM_ENV_VARS = new Set([
  'NODE_ENV',
  'PATH',
  'HOME',
  'USER',
  'SHELL',
  'PWD',
  'TERM',
  'TZ',
  'CI',
  'npm_config_user_agent',
  'npm_package_version',
  'npm_package_name'
]);
