import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { parseEnv } from '../../../src/index.js';

export class EnvGuardHoverProvider implements vscode.HoverProvider {
  public provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.Hover> {
    const range = document.getWordRangeAtPosition(position, /[A-Za-z0-9_]+/);
    if (!range) return null;

    const word = document.getText(range);
    if (!word || !/^[A-Z][A-Z0-9_]+$/.test(word)) {
      return null;
    }

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) return null;

    const rootPath = workspaceFolders[0].uri.fsPath;
    const examplePath = path.resolve(rootPath, '.env.example');
    const envPath = path.resolve(rootPath, '.env');

    if (!fs.existsSync(examplePath) && !fs.existsSync(envPath)) {
      return null;
    }

    let exampleContent = '';
    if (fs.existsSync(examplePath)) {
      exampleContent = fs.readFileSync(examplePath, 'utf8');
    }
    const exampleAst = parseEnv(exampleContent);
    const schemaVar = exampleAst.variables.get(word);

    let isDefinedInEnv = false;
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const envAst = parseEnv(envContent);
      isDefinedInEnv = envAst.variables.has(word);
    }

    if (!schemaVar && !isDefinedInEnv) {
      return null;
    }

    const md = new vscode.MarkdownString();
    md.isTrusted = true;
    md.appendMarkdown(`### 🛡️ EnvGuard: \`${word}\`\n\n`);

    if (schemaVar) {
      const type = schemaVar.annotations.type || 'string';
      const isReq = schemaVar.annotations.required !== false;
      const isSecret = schemaVar.annotations.secret === true;
      const desc = schemaVar.annotations.description || 'No description provided';
      const defVal = schemaVar.annotations.default;

      md.appendMarkdown(`| Property | Value |\n`);
      md.appendMarkdown(`|:---|:---|\n`);
      md.appendMarkdown(`| **Inferred Type** | \`${type}\` |\n`);
      md.appendMarkdown(`| **Required** | ${isReq ? '🔴 Yes' : '🟢 Optional'} |\n`);
      md.appendMarkdown(`| **Secret / Sensitive** | ${isSecret ? '🔒 Yes' : '⚪ Public'} |\n`);
      if (defVal) {
        md.appendMarkdown(`| **Default Value** | \`${defVal}\` |\n`);
      }
      md.appendMarkdown(`| **Active in \`.env\`** | ${isDefinedInEnv ? '✅ Configured' : '⚠️ Missing'} |\n\n`);
      md.appendMarkdown(`> **Description**: ${desc}\n`);
    } else {
      md.appendMarkdown(`⚠️ *Variable is defined in \`.env\` but missing from \`.env.example\` schema template.*\n\n`);
      md.appendMarkdown(`[Run \`envguard sync\`](command:envguard.sync "Sync .env.example") to automatically document this variable.`);
    }

    return new vscode.Hover(md, range);
  }
}
