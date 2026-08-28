import fs from 'node:fs';
import path from 'node:path';
import { parseEnv } from '../../core/parser/env-parser.js';
import { EnvFileAst } from '../../core/parser/types.js';
import { scanCodebase } from '../../core/scanner/code-scanner.js';
import { computeEnvDiff } from '../../core/diff/env-differ.js';
import { renderTerminalReport } from '../../reporters/terminal-reporter.js';
import { renderJsonReport } from '../../reporters/json-reporter.js';
import { renderGitHubReport } from '../../reporters/github-reporter.js';
import { renderSarifReport } from '../../reporters/sarif-reporter.js';
import { renderPrCommentReport } from '../../reporters/pr-comment-reporter.js';
import { getStagedFileContent, getStagedFiles, isGitRepository, scanGitHistory } from '../../core/git/git-utils.js';
import { getBanner } from '../ui/banners.js';
import { loadConfig } from '../../core/config/config-loader.js';
import { findWorkspaces } from '../../core/monorepo/workspaces.js';

export interface CheckCommandOptions {
  env?: string;
  example?: string;
  strict?: boolean;
  format?: 'terminal' | 'json' | 'github' | 'sarif' | 'pr-comment' | 'summary';
  quiet?: boolean;
  verbose?: boolean;
  staged?: boolean;
  paranoid?: boolean;
  scanHistory?: boolean;
  workspaces?: boolean;
  noBanner?: boolean;
  fix?: boolean;
}

export async function runCheck(options: CheckCommandOptions = {}): Promise<number> {
  const cwd = process.cwd();
  const config = loadConfig(cwd);

  const isStrict = options.strict ?? config.strict;
  const isParanoid = options.paranoid ?? config.paranoid ?? false;
  const shouldScanHistory = options.scanHistory ?? config.scanHistory ?? false;
  const isWorkspaces = options.workspaces ?? config.workspaces ?? false;
  const format = options.format || 'terminal';

  if (format === 'terminal' && !options.quiet && !options.noBanner) {
    console.log(getBanner('1.0.0'));
  }

  // Workspaces mode
  if (isWorkspaces) {
    const wsPackages = await findWorkspaces(cwd);
    if (wsPackages.length > 0) {
      let anyErrors = false;
      let anyWarnings = false;

      for (const ws of wsPackages) {
        if (!options.quiet && format === 'terminal') {
          console.log(`\n📦 Checking workspace package: ${ws.name} (${ws.relPath})`);
        }

        let envAst: EnvFileAst | null = null;
        if (fs.existsSync(ws.envPath)) {
          envAst = parseEnv(fs.readFileSync(ws.envPath, 'utf8'), { filePath: ws.envPath });
        }

        let exampleAst: EnvFileAst | null = null;
        if (fs.existsSync(ws.examplePath)) {
          exampleAst = parseEnv(fs.readFileSync(ws.examplePath, 'utf8'), { filePath: ws.examplePath });
        }

        const scanResult = await scanCodebase({
          cwd: ws.packageDir,
          ignoredKeys: config.ignoredKeys,
          includeSystemVars: config.includeSystemVars,
          ignoreGlobs: config.ignoreGlobs,
          paranoid: isParanoid,
          staged: !!options.staged
        });

        const diffResult = computeEnvDiff({
          envAst,
          exampleAst,
          codeKeys: scanResult.uniqueKeys,
          codeReferences: scanResult.keyLocations,
          sourceSecrets: scanResult.secretLeaks,
          secretDetection: {
            ...config.secretDetection,
            paranoid: isParanoid
          }
        });

        if (diffResult.hasErrors) anyErrors = true;
        if (diffResult.hasWarnings) anyWarnings = true;

        if (format === 'json') {
          console.log(renderJsonReport(diffResult));
        } else if (format === 'github') {
          console.log(renderGitHubReport(diffResult));
        } else if (format === 'sarif') {
          console.log(renderSarifReport(diffResult));
        } else {
          console.log(renderTerminalReport(diffResult, { verbose: options.verbose }));
        }
      }

      if (anyErrors) return 1;
      if (isStrict && anyWarnings) return 1;
      return 0;
    }
  }

  const envFilePath = path.resolve(cwd, options.env || config.envFile);
  const exampleFilePath = path.resolve(cwd, options.example || config.exampleFile);

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
    paranoid: isParanoid,
    staged: !!options.staged
  });

  // 4. Git history scanning if requested
  if (shouldScanHistory && isGitRepository(cwd)) {
    const historySecrets = scanGitHistory({
      cwd,
      detectOptions: {
        ...config.secretDetection,
        paranoid: isParanoid
      }
    });
    scanResult.secretLeaks.push(...historySecrets);
  }

  // 5. Compute full diff & leaks
  const diffResult = computeEnvDiff({
    envAst,
    exampleAst,
    codeKeys: scanResult.uniqueKeys,
    codeReferences: scanResult.keyLocations,
    sourceSecrets: scanResult.secretLeaks,
    secretDetection: {
      ...config.secretDetection,
      paranoid: isParanoid
    }
  });

  // 6. Render report
  if (format === 'json') {
    console.log(renderJsonReport(diffResult));
  } else if (format === 'github') {
    console.log(renderGitHubReport(diffResult));
  } else if (format === 'sarif') {
    console.log(renderSarifReport(diffResult));
  } else if (format === 'pr-comment' || format === 'summary') {
    console.log(renderPrCommentReport(diffResult));
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
