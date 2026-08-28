import * as vscode from 'vscode';
import { EnvGuardDiagnosticsManager } from './diagnostics.js';
import { EnvGuardQuickFixProvider } from './quickfix.js';
import { EnvGuardHoverProvider } from './hover.js';
import { EnvGuardStatusBarManager } from './statusbar.js';
import { registerEnvGuardCommands } from './commands.js';

let diagnosticsManager: EnvGuardDiagnosticsManager;
let statusBarManager: EnvGuardStatusBarManager;

export function activate(context: vscode.ExtensionContext): void {
  console.log('[EnvGuard Extension] Activated.');

  diagnosticsManager = new EnvGuardDiagnosticsManager();
  statusBarManager = new EnvGuardStatusBarManager();

  context.subscriptions.push(diagnosticsManager);
  context.subscriptions.push(statusBarManager);

  // Register QuickFix code actions
  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      [
        { scheme: 'file', language: 'typescript' },
        { scheme: 'file', language: 'typescriptreact' },
        { scheme: 'file', language: 'javascript' },
        { scheme: 'file', language: 'javascriptreact' },
        { scheme: 'file', language: 'vue' },
        { scheme: 'file', language: 'svelte' },
        { scheme: 'file', language: 'dotenv' },
        { scheme: 'file', pattern: '**/.env*' }
      ],
      new EnvGuardQuickFixProvider(),
      {
        providedCodeActionKinds: EnvGuardQuickFixProvider.providedCodeActionKinds
      }
    )
  );

  // Register Hover Provider
  context.subscriptions.push(
    vscode.languages.registerHoverProvider(
      [
        { scheme: 'file', language: 'typescript' },
        { scheme: 'file', language: 'typescriptreact' },
        { scheme: 'file', language: 'javascript' },
        { scheme: 'file', language: 'javascriptreact' },
        { scheme: 'file', language: 'vue' },
        { scheme: 'file', language: 'svelte' },
        { scheme: 'file', language: 'dotenv' },
        { scheme: 'file', pattern: '**/.env*' }
      ],
      new EnvGuardHoverProvider()
    )
  );

  // Register Commands
  registerEnvGuardCommands(context, diagnosticsManager);

  // File system watcher & document event triggers
  const runDiagnostics = async () => {
    const { totalErrors, totalWarnings } = await diagnosticsManager.updateDiagnostics();
    statusBarManager.updateStatus(totalErrors, totalWarnings);
  };

  // Watch for .env, .env.example, and code changes
  const watcher = vscode.workspace.createFileSystemWatcher('**/{.env*,*.ts,*.tsx,*.js,*.jsx,*.vue,*.svelte}');
  watcher.onDidChange(runDiagnostics);
  watcher.onDidCreate(runDiagnostics);
  watcher.onDidDelete(runDiagnostics);
  context.subscriptions.push(watcher);

  vscode.workspace.onDidSaveTextDocument(runDiagnostics, null, context.subscriptions);
  vscode.workspace.onDidOpenTextDocument(runDiagnostics, null, context.subscriptions);

  // Initial scan on startup
  runDiagnostics();
}

export function deactivate(): void {
  if (diagnosticsManager) {
    diagnosticsManager.dispose();
  }
  if (statusBarManager) {
    statusBarManager.dispose();
  }
}
