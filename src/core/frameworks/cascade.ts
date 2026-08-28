import fs from 'node:fs';
import path from 'node:path';
import { FrameworkInfo, detectFramework } from './detector.js';
import { parseEnv } from '../parser/env-parser.js';
import { EnvFileAst, EnvVariable } from '../parser/types.js';

export interface CascadingEnvResult {
  framework: FrameworkInfo;
  loadedFiles: string[];
  mergedVariables: Map<string, EnvVariable>;
  ast: EnvFileAst;
}

/**
 * Discovers and merges cascading environment files (.env.local, .env.development, etc.)
 * in order of precedence according to the active framework.
 */
export function loadCascadingEnv(
  cwd = process.cwd(),
  mode = process.env.NODE_ENV || 'development'
): CascadingEnvResult {
  const framework = detectFramework(cwd);

  const potentialFiles: string[] = [];

  if (framework.name === 'nextjs') {
    potentialFiles.push(
      `.env.${mode}.local`,
      mode !== 'test' ? '.env.local' : '',
      `.env.${mode}`,
      '.env'
    );
  } else if (framework.name === 'vite') {
    potentialFiles.push(
      `.env.${mode}.local`,
      `.env.${mode}`,
      '.env.local',
      '.env'
    );
  } else {
    potentialFiles.push(
      `.env.${mode}.local`,
      '.env.local',
      `.env.${mode}`,
      '.env'
    );
  }

  const validFiles = potentialFiles
    .filter(Boolean)
    .map((f) => path.join(cwd, f))
    .filter((f) => fs.existsSync(f));

  // Reverse list so lower priority files are applied first, overridden by higher priority
  const filesAscending = [...validFiles].reverse();
  const mergedVariables = new Map<string, EnvVariable>();
  const loadedFileNames: string[] = [];

  let finalRaw = '';

  for (const filePath of filesAscending) {
    const raw = fs.readFileSync(filePath, 'utf8');
    finalRaw += `\n# Loaded from ${path.basename(filePath)}\n` + raw;
    const ast = parseEnv(raw);
    loadedFileNames.push(path.basename(filePath));

    for (const [key, v] of ast.variables) {
      mergedVariables.set(key, v);
    }
  }

  // Create unified AST
  const unifiedAst = parseEnv(finalRaw);

  return {
    framework,
    loadedFiles: validFiles.map((f) => path.basename(f)),
    mergedVariables,
    ast: unifiedAst
  };
}
