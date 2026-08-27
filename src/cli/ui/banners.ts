import pc from 'picocolors';

export function getBanner(version = '1.0.0'): string {
  const line1 = pc.bold(pc.cyan('  ███████╗███╗   ██╗██╗   ██╗ ██████╗ ██╗   ██╗ █████╗ ██████╗ ██████╗ '));
  const line2 = pc.bold(pc.cyan('  ██╔════╝████╗  ██║██║   ██║██╔════╝ ██║   ██║██╔══██╗██╔══██╗██╔══██╗'));
  const line3 = pc.bold(pc.cyan('  █████╗  ██╔██╗ ██║██║   ██║██║  ███╗██║   ██║███████║██████╔╝██║  ██║'));
  const line4 = pc.bold(pc.cyan('  ██╔══╝  ██║╚██╗██║╚██╗ ██╔╝██║   ██║██║   ██║██╔══██║██╔══██╗██║  ██║'));
  const line5 = pc.bold(pc.cyan('  ███████╗██║ ╚████║ ╚████╔╝ ╚██████╔╝╚██████╔╝██║  ██║██║  ██║██████╔╝'));
  const line6 = pc.bold(pc.cyan('  ╚══════╝╚═╝  ╚═══╝  ╚═══╝   ╚═════╝  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝ '));
  const tag = `  ${pc.dim('v' + version)} ${pc.dim('—')} ${pc.green('Zero-Config Git Secret Leaks & Type Validator')}\n`;

  return `\n${line1}\n${line2}\n${line3}\n${line4}\n${line5}\n${line6}\n${tag}`;
}

export function formatHeader(title: string, count?: number): string {
  const badge = count !== undefined ? pc.bold(` (${count})`) : '';
  return `${pc.bold(title)}${badge}`;
}
