import path from 'node:path';
import pc from 'picocolors';
import { setupVsCodeIntegration } from '../../core/ide/vscode.js';

export interface VsCodeCommandOptions {
  exampleFile?: string;
  quiet?: boolean;
}

export async function runVsCode(options: VsCodeCommandOptions = {}): Promise<number> {
  const cwd = process.cwd();

  try {
    const result = setupVsCodeIntegration(cwd, options.exampleFile);

    if (!options.quiet) {
      console.log(pc.bold(pc.green(`\n✨ VS Code & IDE Integration Configured!`)));
      console.log(`  • Configured settings: ${pc.cyan(path.relative(cwd, result.settingsPath))}`);
      if (result.schemaCreated) {
        console.log(`  • Generated JSON Schema: ${pc.cyan(path.relative(cwd, result.schemaPath))}`);
      }
      console.log(pc.dim(`  • File nesting (.env.* grouped under .env) and syntax associations applied.\n`));
    }
    return 0;
  } catch (err: any) {
    console.error(pc.red(`✖ Failed to setup VS Code configuration: ${err.message}`));
    return 1;
  }
}
