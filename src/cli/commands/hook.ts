import pc from 'picocolors';
import { installPreCommitHook } from '../../core/git/hooks.js';

export function runHookInstall(): number {
  const result = installPreCommitHook(process.cwd());
  if (result.success) {
    console.log(`${pc.green('✔')} ${result.message}`);
    return 0;
  } else {
    console.error(`${pc.red('✖')} ${result.message}`);
    return 1;
  }
}
