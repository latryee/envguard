import pc from 'picocolors';
import { generateCompletionScript, ShellType } from '../../core/completion/generator.js';

export interface CompletionCommandOptions {
  shell?: ShellType;
}

export function runCompletion(options: CompletionCommandOptions = {}): number {
  const shell = options.shell || 'bash';

  if (shell !== 'bash' && shell !== 'zsh' && shell !== 'fish' && shell !== 'powershell') {
    console.error(pc.red(`✖ Unsupported shell "${shell}". Choose: bash, zsh, fish, powershell.`));
    return 1;
  }

  const script = generateCompletionScript(shell);
  process.stdout.write(script.trimStart());
  return 0;
}
