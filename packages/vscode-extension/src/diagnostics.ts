import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import {
  parseEnv,
  computeEnvDiff,
  generateLspDiagnostics,
  LspDiagnosticSeverity,
  LspDiagnosticTag,
  scanCodebase
} from '../../../src/index.js';

export class EnvGuardDiagnosticsManager {
  private diagnosticCollection: vscode.DiagnosticCollection;
  private isScanning = false;

  constructor() {
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection('envguard');
  }

  public getCollection(): vscode.DiagnosticCollection {
    return this.diagnosticCollection;
  }

  /**
   * Performs full workspace environment and AST scan, updating the diagnostics collection.
   */
  public async updateDiagnostics(): Promise<{ totalErrors: number; totalWarnings: number }> {
    if (this.isScanning) {
      return { totalErrors: 0, totalWarnings: 0 };
    }

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      this.diagnosticCollection.clear();
      return { totalErrors: 0, totalWarnings: 0 };
    }

    this.isScanning = true;
    let totalErrors = 0;
    let totalWarnings = 0;

    try {
      const config = vscode.workspace.getConfiguration('envguard');
      if (!config.get<boolean>('enable', true)) {
        this.diagnosticCollection.clear();
        return { totalErrors: 0, totalWarnings: 0 };
      }

      const rootPath = workspaceFolders[0].uri.fsPath;
      const envRel = config.get<string>('envPath', '.env');
      const exampleRel = config.get<string>('examplePath', '.env.example');

      const envFullPath = path.resolve(rootPath, envRel);
      const exampleFullPath = path.resolve(rootPath, exampleRel);

      let envContent = '';
      let exampleContent = '';

      if (fs.existsSync(envFullPath)) {
        envContent = fs.readFileSync(envFullPath, 'utf8');
      }
      if (fs.existsSync(exampleFullPath)) {
        exampleContent = fs.readFileSync(exampleFullPath, 'utf8');
      }

      const envAst = parseEnv(envContent, { filePath: envRel });
      const exampleAst = parseEnv(exampleContent, { filePath: exampleRel });

      // Scan source codebase for references and client-side exposures
      const scanRes = await scanCodebase({
        cwd: rootPath,
        detectSecrets: true
      });

      const diff = computeEnvDiff({
        envAst,
        exampleAst,
        codeKeys: scanRes.uniqueKeys,
        codeReferences: scanRes.keyLocations,
        clientLeaks: scanRes.clientLeaks,
        secretLeaks: scanRes.secretLeaks,
        strict: config.get<boolean>('strict', false)
      });

      const lspMap = generateLspDiagnostics(diff);

      // Clear previous diagnostics
      this.diagnosticCollection.clear();

      // Convert LSP Diagnostics to vscode.Diagnostic
      for (const [rawUri, lspDiags] of lspMap.entries()) {
        let fileUri: vscode.Uri;
        if (rawUri.startsWith('file:///')) {
          fileUri = vscode.Uri.parse(rawUri);
        } else if (rawUri.startsWith('file://')) {
          fileUri = vscode.Uri.file(rawUri.replace('file://', ''));
        } else {
          fileUri = vscode.Uri.file(path.resolve(rootPath, rawUri));
        }

        const vsDiags: vscode.Diagnostic[] = [];

        for (const d of lspDiags) {
          const startPos = new vscode.Position(d.range.start.line, d.range.start.character);
          const endPos = new vscode.Position(d.range.end.line, d.range.end.character);
          const range = new vscode.Range(startPos, endPos);

          let severity = vscode.DiagnosticSeverity.Warning;
          if (d.severity === LspDiagnosticSeverity.Error) {
            severity = vscode.DiagnosticSeverity.Error;
            totalErrors++;
          } else if (d.severity === LspDiagnosticSeverity.Warning) {
            severity = vscode.DiagnosticSeverity.Warning;
            totalWarnings++;
          } else if (d.severity === LspDiagnosticSeverity.Information) {
            severity = vscode.DiagnosticSeverity.Information;
          } else if (d.severity === LspDiagnosticSeverity.Hint) {
            severity = vscode.DiagnosticSeverity.Hint;
          }

          const vsDiag = new vscode.Diagnostic(range, d.message, severity);
          vsDiag.source = d.source || 'EnvGuard';
          vsDiag.code = d.code;

          if (d.tags && d.tags.includes(LspDiagnosticTag.Unnecessary)) {
            vsDiag.tags = [vscode.DiagnosticTag.Unnecessary];
          }

          vsDiags.push(vsDiag);
        }

        this.diagnosticCollection.set(fileUri, vsDiags);
      }
    } catch (err) {
      console.error('[EnvGuard Extension] Error scanning workspace diagnostics:', err);
    } finally {
      this.isScanning = false;
    }

    return { totalErrors, totalWarnings };
  }

  public dispose(): void {
    this.diagnosticCollection.dispose();
  }
}
