import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export class EnvGuardQuickFixProvider implements vscode.CodeActionProvider {
  public static readonly providedCodeActionKinds = [
    vscode.CodeActionKind.QuickFix
  ];

  public provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    for (const diagnostic of context.diagnostics) {
      if (diagnostic.source !== 'envguard' && diagnostic.source !== 'EnvGuard') {
        continue;
      }

      // 1. Framework Client Leak QuickFix
      if (diagnostic.code === 'framework-client-leak') {
        const text = document.getText(diagnostic.range);
        const match = text.match(/process\.env\.([A-Za-z0-9_]+)/) || text.match(/([A-Za-z0-9_]+)/);
        if (match) {
          const varName = match[1];
          // Check prefix
          let prefix = 'NEXT_PUBLIC_';
          if (document.fileName.includes('vite') || document.fileName.endsWith('.vue') || document.fileName.endsWith('.svelte')) {
            prefix = 'VITE_';
          }

          const action = new vscode.CodeAction(
            `Prefix with "${prefix}${varName}" for client exposure`,
            vscode.CodeActionKind.QuickFix
          );
          action.diagnostics = [diagnostic];
          action.isPreferred = true;

          const edit = new vscode.WorkspaceEdit();
          edit.replace(document.uri, diagnostic.range, `${prefix}${varName}`);
          action.edit = edit;
          actions.push(action);
        }
      }

      // 2. Undocumented / Missing Variable QuickFix -> Add to .env.example
      if (diagnostic.code === 'undocumented-env-variable' || diagnostic.code === 'missing-example-key') {
        const varName = document.getText(diagnostic.range).trim();
        if (varName && /^[A-Z0-9_]+$/.test(varName)) {
          const action = new vscode.CodeAction(
            `Add "${varName}" to .env.example with safe placeholder`,
            vscode.CodeActionKind.QuickFix
          );
          action.diagnostics = [diagnostic];
          action.isPreferred = true;

          action.command = {
            command: 'envguard.sync',
            title: 'Synchronize .env.example'
          };
          actions.push(action);
        }
      }

      // 3. Secret Leak QuickFix -> Mask or Move to .env
      if (typeof diagnostic.code === 'string' && diagnostic.code.includes('key') || diagnostic.code === 'secret-leak') {
        const action = new vscode.CodeAction(
          'Move hardcoded secret to .env file',
          vscode.CodeActionKind.QuickFix
        );
        action.diagnostics = [diagnostic];
        action.command = {
          command: 'envguard.check',
          title: 'Run EnvGuard Check'
        };
        actions.push(action);
      }
    }

    return actions;
  }
}
