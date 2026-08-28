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
      /\bprocess\.env(?:\?\.)?\[['"`]([A-Za-z_][A-Za-z0-9_]*)['"`]\]/g,
      /\bimport\.meta\.env(?:\.|\?\.)([A-Za-z_][A-Za-z0-9_]*)\b/g,
      /\bimport\.meta\.env(?:\?\.)?\[['"`]([A-Za-z_][A-Za-z0-9_]*)['"`]\]/g,
      /\bBun\.env(?:\.|\?\.)([A-Za-z_][A-Za-z0-9_]*)\b/g,
      /\bBun\.env(?:\?\.)?\[['"`]([A-Za-z_][A-Za-z0-9_]*)['"`]\]/g,
      /\bDeno\.env\.get\(['"`]([A-Za-z_][A-Za-z0-9_]*)['"`]\)/g
    ]
  },
  // Python
  {
    extensions: ['.py'],
    language: 'python',
    regexes: [
      /\bos\.environ\[['"`]([A-Za-z_][A-Za-z0-9_]*)['"`]\]/g,
      /\bos\.environ\.get\(['"`]([A-Za-z_][A-Za-z0-9_]*)['"`]/g,
      /\bos\.getenv\(['"`]([A-Za-z_][A-Za-z0-9_]*)['"`]/g,
      /\bgetenv\(['"`]([A-Za-z_][A-Za-z0-9_]*)['"`]/g
    ]
  },
  // Go
  {
    extensions: ['.go'],
    language: 'go',
    regexes: [
      /\bos\.Getenv\(['"`]([A-Za-z_][A-Za-z0-9_]*)['"`]\)/g,
      /\bos\.LookupEnv\(['"`]([A-Za-z_][A-Za-z0-9_]*)['"`]\)/g
    ]
  },
  // Rust
  {
    extensions: ['.rs'],
    language: 'rust',
    regexes: [
      /\bstd::env::var(?:_os)?\(['"`]([A-Za-z_][A-Za-z0-9_]*)['"`]\)/g,
      /\benv::var(?:_os)?\(['"`]([A-Za-z_][A-Za-z0-9_]*)['"`]\)/g,
      /\bdotenvy::var\(['"`]([A-Za-z_][A-Za-z0-9_]*)['"`]\)/g
    ]
  },
  // PHP
  {
    extensions: ['.php'],
    language: 'php',
    regexes: [
      /\$_ENV\[['"`]([A-Z_][A-Z0-9_]*)['"`]\]/g,
      /\bgetenv\(['"`]([A-Z_][A-Z0-9_]*)['"`]\)/g
    ]
  },
  // Ruby
  {
    extensions: ['.rb'],
    language: 'ruby',
    regexes: [
      /\bENV\[['"`]([A-Z_][A-Z0-9_]*)['"`]\]/g,
      /\bENV\.fetch\(['"`]([A-Z_][A-Z0-9_]*)['"`]/g
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
