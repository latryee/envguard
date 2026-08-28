import { describe, it, expect } from 'vitest';
import { generateCompletionScript } from '../src/index.js';
import { runCompletion } from '../src/cli/commands/completion.js';

describe('Shell Autocompletion Generator', () => {
  it('generates completion scripts for all major shells', () => {
    const bashScript = generateCompletionScript('bash');
    expect(bashScript).toContain('complete -F _envguard_completions');

    const zshScript = generateCompletionScript('zsh');
    expect(zshScript).toContain('#compdef envguard');
    expect(zshScript).toContain('_arguments');

    const fishScript = generateCompletionScript('fish');
    expect(fishScript).toContain('complete -c envguard');

    const psScript = generateCompletionScript('powershell');
    expect(psScript).toContain('Register-ArgumentCompleter');
  });

  it('runs CLI completion command', () => {
    const exitBash = runCompletion({ shell: 'bash' });
    expect(exitBash).toBe(0);

    const exitInvalid = runCompletion({ shell: 'unknown' as any });
    expect(exitInvalid).toBe(1);
  });
});
