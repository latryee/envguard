import fs from 'node:fs';
import path from 'node:path';
import pc from 'picocolors';
import { parseEnv } from '../../core/parser/env-parser.js';
import { scanCodebase } from '../../core/scanner/code-scanner.js';
import { generateTypeDeclarations } from '../../core/generator/types-generator.js';
import { loadConfig } from '../../core/config/config-loader.js';

export interface GenTypesCommandOptions {
  env?: string;
  example?: string;
  output?: string;
  quiet?: boolean;
}

export async function runGenTypes(options: GenTypesCommandOptions = {}): Promise<number> {
  const cwd = process.cwd();
  const config = loadConfig(cwd);

  const envFilePath = path.resolve(cwd, options.env || config.envFile);
  const exampleFilePath = path.resolve(cwd, options.example || config.exampleFile);
  const outputPath = options.output || config.typesFile;

  let envAst = null;
  if (fs.existsSync(envFilePath)) {
    envAst = parseEnv(fs.readFileSync(envFilePath, 'utf8'), { filePath: envFilePath });
  }

  let exampleAst = null;
  if (fs.existsSync(exampleFilePath)) {
    exampleAst = parseEnv(fs.readFileSync(exampleFilePath, 'utf8'), { filePath: exampleFilePath });
  }

  const scanResult = await scanCodebase({ cwd });

  const result = generateTypeDeclarations({
    cwd,
    outputPath,
    envAst,
    exampleAst,
    codeKeys: scanResult.uniqueKeys
  });

  if (!options.quiet) {
    console.log(
      `${pc.green('✔')} Generated TypeScript ambient declarations in ${pc.bold(result.outputPath)} (${result.variablesCount} typed variables).`
    );
  }

  return 0;
}
