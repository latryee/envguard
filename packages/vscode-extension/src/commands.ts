import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import {
  parseEnv,
  syncEnvExample,
  formatEnv,
  generateTypeDeclarations,
  encryptEnv,
  decryptEnv,
  generateEncryptionKey
} from '../../../src/index.js';
import { EnvGuardDiagnosticsManager } from './diagnostics.js';

export function registerEnvGuardCommands(
  context: vscode.ExtensionContext,
  diagnosticsManager: EnvGuardDiagnosticsManager
): void {
  const getRoot = (): string | undefined => {
    return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  };

  // 1. EnvGuard Check
  context.subscriptions.push(
    vscode.commands.registerCommand('envguard.check', async () => {
      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'EnvGuard: Scanning environment & secrets...',
          cancellable: false
        },
        async () => {
          const { totalErrors, totalWarnings } = await diagnosticsManager.updateDiagnostics();
          if (totalErrors > 0) {
            vscode.window.showErrorMessage(
              `EnvGuard Check Failed: ${totalErrors} error(s), ${totalWarnings} warning(s). Check Problems tab.`,
              'Show Problems'
            ).then((sel) => {
              if (sel === 'Show Problems') {
                vscode.commands.executeCommand('workbench.actions.view.problems');
              }
            });
          } else if (totalWarnings > 0) {
            vscode.window.showWarningMessage(
              `EnvGuard Check Passed with ${totalWarnings} warning(s).`,
              'Show Problems'
            ).then((sel) => {
              if (sel === 'Show Problems') {
                vscode.commands.executeCommand('workbench.actions.view.problems');
              }
            });
          } else {
            vscode.window.showInformationMessage('🛡️ EnvGuard: All environment checks and secret scans passed!');
          }
        }
      );
    })
  );

  // 2. EnvGuard Sync .env.example
  context.subscriptions.push(
    vscode.commands.registerCommand('envguard.sync', async () => {
      const root = getRoot();
      if (!root) return;

      const envPath = path.resolve(root, '.env');
      const examplePath = path.resolve(root, '.env.example');

      if (!fs.existsSync(envPath)) {
        vscode.window.showErrorMessage('No .env file found in workspace root.');
        return;
      }

      const envContent = fs.readFileSync(envPath, 'utf8');
      const exampleContent = fs.existsSync(examplePath) ? fs.readFileSync(examplePath, 'utf8') : '';

      const envAst = parseEnv(envContent);
      const exampleAst = parseEnv(exampleContent);

      const syncResult = syncEnvExample({
        envAst,
        exampleAst
      });

      fs.writeFileSync(examplePath, syncResult.updatedContent, 'utf8');
      await diagnosticsManager.updateDiagnostics();

      vscode.window.showInformationMessage(
        `🛡️ EnvGuard: Successfully synchronized .env.example (${syncResult.addedKeys.length} added, ${syncResult.updatedKeys.length} updated).`
      );
    })
  );

  // 3. EnvGuard Format
  context.subscriptions.push(
    vscode.commands.registerCommand('envguard.format', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const content = editor.document.getText();
      const formatted = formatEnv(content, { alignEquals: true, sort: 'case-insensitive' });

      const fullRange = new vscode.Range(
        editor.document.positionAt(0),
        editor.document.positionAt(content.length)
      );

      await editor.edit((editBuilder) => {
        editBuilder.replace(fullRange, formatted);
      });

      vscode.window.showInformationMessage('🛡️ EnvGuard: Formatted and organized .env file.');
    })
  );

  // 4. EnvGuard Generate Types
  context.subscriptions.push(
    vscode.commands.registerCommand('envguard.generateTypes', async () => {
      const root = getRoot();
      if (!root) return;

      const examplePath = path.resolve(root, '.env.example');
      const envPath = path.resolve(root, '.env');

      let content = '';
      if (fs.existsSync(examplePath)) {
        content = fs.readFileSync(examplePath, 'utf8');
      } else if (fs.existsSync(envPath)) {
        content = fs.readFileSync(envPath, 'utf8');
      } else {
        vscode.window.showErrorMessage('No .env or .env.example file found to generate types.');
        return;
      }

      const ast = parseEnv(content);
      const typesResult = generateTypeDeclarations({ ast });

      const outputPath = path.resolve(root, 'env.d.ts');
      fs.writeFileSync(outputPath, typesResult.content, 'utf8');

      vscode.window.showInformationMessage(
        `🛡️ EnvGuard: Generated ambient TypeScript declarations in env.d.ts (${typesResult.variableCount} variables).`
      );
    })
  );

  // 5. EnvGuard Encrypt (AES-256-GCM)
  context.subscriptions.push(
    vscode.commands.registerCommand('envguard.encrypt', async () => {
      const root = getRoot();
      if (!root) return;

      const envPath = path.resolve(root, '.env');
      if (!fs.existsSync(envPath)) {
        vscode.window.showErrorMessage('No .env file found to encrypt.');
        return;
      }

      const envContent = fs.readFileSync(envPath, 'utf8');
      const key = generateEncryptionKey();
      const encrypted = encryptEnv(envContent, key);

      const encPath = path.resolve(root, '.env.vault');
      fs.writeFileSync(encPath, encrypted, 'utf8');

      vscode.window.showInformationMessage(
        `🛡️ EnvGuard: Encrypted .env -> .env.vault. Key: ${key}`,
        'Copy Key'
      ).then((sel) => {
        if (sel === 'Copy Key') {
          vscode.env.clipboard.writeText(key);
        }
      });
    })
  );
}
