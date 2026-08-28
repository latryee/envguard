import fs from 'node:fs';
import path from 'node:path';
import pc from 'picocolors';
import { parseEnv } from '../../core/parser/env-parser.js';
import { exportEnv, ExportFormat } from '../../core/vault/exporter.js';

export interface ExportCommandOptions {
  envFile?: string;
  format?: ExportFormat;
  output?: string;
  name?: string;
  namespace?: string;
  service?: string;
  quiet?: boolean;
}

export async function runExport(options: ExportCommandOptions = {}): Promise<number> {
  const cwd = process.cwd();
  const envFile = options.envFile || '.env';
  const format: ExportFormat = options.format || 'json';
  const envPath = path.resolve(cwd, envFile);

  if (!fs.existsSync(envPath)) {
    console.error(pc.red(`✖ File "${envFile}" does not exist.`));
    return 1;
  }

  const raw = fs.readFileSync(envPath, 'utf8');
  const ast = parseEnv(raw);

  const exported = exportEnv(ast, format, {
    name: options.name,
    namespace: options.namespace,
    service: options.service
  });

  if (options.output) {
    const outPath = path.resolve(cwd, options.output);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, exported, 'utf8');
    if (!options.quiet) {
      console.log(pc.green(`✔ Exported ${ast.variables.size} variables to ${options.output} in ${format} format.`));
    }
  } else {
    // Print to stdout
    process.stdout.write(exported);
  }

  return 0;
}
