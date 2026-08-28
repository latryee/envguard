import fs from 'node:fs';
import path from 'node:path';
import { parseEnv } from '../../core/parser/env-parser.js';
import { EnvFileAst } from '../../core/parser/types.js';
import { scanCodebase } from '../../core/scanner/code-scanner.js';
import { computeEnvDiff } from '../../core/diff/env-differ.js';
import { renderTerminalReport } from '../../reporters/terminal-reporter.js';
import { renderJsonReport } from '../../reporters/json-reporter.js';
import { renderGitHubReport } from '../../reporters/github-reporter.js';
import { getStagedFileContent, getStagedFiles, isGitRepository } from '../../core/git/git-utils.js';
import { getBanner } from '../ui/banners.js';
import { loadConfig } from '../../core/config/config-loader.js';

export interface CheckCommandOptions {
  env?: string;
  example?: string;
  strict?: boolean;
  format?: 'terminal' | 'json' | 'github';
  quiet?: boolean;
  verbose?: boolean;
  staged?: boolean;
  noBanner?: boolean;
  fix?: boolean;
}

export async function runCheck(options: CheckCommandOptions = {}): Promise<number> {
  const cwd = process.cwd();
  const config = loadConfig(cwd);

  const envFilePath = path.resolve(cwd, options.env || config.envFile);
  const exampleFilePath = path.resolve(cwd, options.example || config.exampleFile);
  const isStrict = options.strict ?? config.strict;
  const format = options.format || 'terminal';

  if (format === 'terminal' && !options.quiet && !options.noBanner) {
    console.log(getBanner('1.0.0'));
  }

  // 1. Parse .env if exists
  let envAst: EnvFileAst | null = null;
  if (options.staged && isGitRepository(cwd)) {
    const stagedContent = getStagedFileContent(envFilePath, cwd);
    if (stagedContent !== null) {
      envAst = parseEnv(stagedContent, { filePath: envFilePath });
    } else if (fs.existsSync(envFilePath)) {
      const content = fs.readFileSync(envFilePath, 'utf8');
      envAst = parseEnv(content, { filePath: envFilePath });
    }
  } else if (fs.existsSync(envFilePath)) {
    const content = fs.readFileSync(envFilePath, 'utf8');
    envAst = parseEnv(content, { filePath: envFilePath });
  }

  // 2. Parse .env.example if exists
  let exampleAst: EnvFileAst | null = null;
  if (options.staged && isGitRepository(cwd)) {
    const stagedContent = getStagedFileContent(exampleFilePath, cwd);
    if (stagedContent !== null) {
      exampleAst = parseEnv(stagedContent, { filePath: exampleFilePath });
    } else if (fs.existsSync(exampleFilePath)) {
      const content = fs.readFileSync(exampleFilePath, 'utf8');
      exampleAst = parseEnv(content, { filePath: exampleFilePath });
    }
  } else if (fs.existsSync(exampleFilePath)) {
    const content = fs.readFileSync(exampleFilePath, 'utf8');
    exampleAst = parseEnv(content, { filePath: exampleFilePath });
  }

  // 3. Scan code references
  let customGlobs: string[] | undefined;
  if (options.staged) {
    customGlobs = isGitRepository(cwd) ? getStagedFiles(cwd) : [];
  } else if (config.customGlobs && config.customGlobs.length > 0) {
    customGlobs = config.customGlobs;
  }


  const scanResult = await scanCodebase({
    cwd,
    customGlobs,
    ignoredKeys: config.ignoredKeys,
    includeSystemVars: config.includeSystemVars,
    ignoreGlobs: config.ignoreGlobs,
    staged: !!options.staged
  });


  // 4. Compute full diff & leaks
  const diffResult = computeEnvDiff({
    envAst,
    exampleAst,
    codeKeys: scanResult.uniqueKeys,
    codeReferences: scanResult.keyLocations,
    sourceSecrets: scanResult.secretLeaks
  });


  // 5. Render report
  if (format === 'json') {
    console.log(renderJsonReport(diffResult));
  } else if (format === 'github') {
    console.log(renderGitHubReport(diffResult));
  } else {
    console.log(renderTerminalReport(diffResult, { verbose: options.verbose }));
  }

  // Return exit code
  if (diffResult.hasErrors) {
    return 1;
  }
  if (isStrict && diffResult.hasWarnings) {
    return 1;
  }

  return 0;
}
