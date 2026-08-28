import * as vscode from 'vscode';

export class EnvGuardStatusBarManager {
  private statusBarItem: vscode.StatusBarItem;

  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.statusBarItem.command = 'envguard.check';
  }

  public updateStatus(errors: number, warnings: number): void {
    const config = vscode.workspace.getConfiguration('envguard');
    if (!config.get<boolean>('showStatusBar', true)) {
      this.statusBarItem.hide();
      return;
    }

    if (errors > 0) {
      this.statusBarItem.text = `$(error) EnvGuard: ${errors} error${errors > 1 ? 's' : ''}`;
      this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
      this.statusBarItem.tooltip = `EnvGuard detected ${errors} critical error(s). Click to run audit.`;
    } else if (warnings > 0) {
      this.statusBarItem.text = `$(warning) EnvGuard: ${warnings} warning${warnings > 1 ? 's' : ''}`;
      this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
      this.statusBarItem.tooltip = `EnvGuard detected ${warnings} warning(s). Click to review.`;
    } else {
      this.statusBarItem.text = '$(shield) EnvGuard: OK';
      this.statusBarItem.backgroundColor = undefined;
      this.statusBarItem.tooltip = 'EnvGuard: Zero-Trust environment variables & secrets healthy.';
    }

    this.statusBarItem.show();
  }

  public dispose(): void {
    this.statusBarItem.dispose();
  }
}
