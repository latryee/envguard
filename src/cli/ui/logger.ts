import pc from 'picocolors';

export interface LoggerOptions {
  quiet?: boolean;
  verbose?: boolean;
}

export class Logger {
  private quiet = false;
  private verbose = false;

  constructor(options: LoggerOptions = {}) {
    this.quiet = !!options.quiet;
    this.verbose = !!options.verbose;
  }

  log(msg: string) {
    if (!this.quiet) console.log(msg);
  }

  info(msg: string) {
    if (!this.quiet) console.log(`${pc.cyan('ℹ')} ${msg}`);
  }

  success(msg: string) {
    if (!this.quiet) console.log(`${pc.green('✔')} ${msg}`);
  }

  warn(msg: string) {
    if (!this.quiet) console.warn(`${pc.yellow('⚠')} ${msg}`);
  }

  error(msg: string) {
    console.error(`${pc.red('✖')} ${msg}`);
  }

  debug(msg: string) {
    if (this.verbose && !this.quiet) {
      console.log(`${pc.dim('⚙')} ${pc.dim(msg)}`);
    }
  }

  blank() {
    if (!this.quiet) console.log('');
  }
}
