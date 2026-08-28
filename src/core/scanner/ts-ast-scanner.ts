import ts from 'typescript';
import { CodeReference } from './patterns.js';

export interface TsAstScanOptions {
  filePath: string;
  relFilePath: string;
  content: string;
  ignoredKeys?: Set<string>;
  ignoredLines?: Set<number>;
}

/**
 * Checks if an AST expression represents a known environment object (process.env, import.meta.env, Bun.env).
 */
function isEnvObject(node: ts.Node): 'process.env' | 'import.meta.env' | 'Bun.env' | null {
  // process.env or process?.env
  if (ts.isPropertyAccessExpression(node)) {
    const expr = node.expression;
    const name = node.name.text;
    if (name === 'env') {
      if (ts.isIdentifier(expr) && expr.text === 'process') {
        return 'process.env';
      }
      if (ts.isIdentifier(expr) && expr.text === 'Bun') {
        return 'Bun.env';
      }
      // import.meta.env
      if (
        ts.isMetaProperty(expr) &&
        expr.keywordToken === ts.SyntaxKind.ImportKeyword &&
        expr.name.text === 'meta'
      ) {
        return 'import.meta.env';
      }
    }
  }
  return null;
}

/**
 * Extracts environment variable references from JavaScript/TypeScript source code using the TypeScript Compiler AST.
 */
export function scanTsAst(options: TsAstScanOptions): CodeReference[] {
  const { filePath, relFilePath, content, ignoredKeys, ignoredLines } = options;
  const isTsx = filePath.endsWith('.tsx') || filePath.endsWith('.jsx');
  const isJs = filePath.endsWith('.js') || filePath.endsWith('.mjs') || filePath.endsWith('.cjs');

  const scriptKind = isTsx
    ? ts.ScriptKind.TSX
    : isJs
      ? ts.ScriptKind.JS
      : ts.ScriptKind.TS;

  let sourceFile: ts.SourceFile;
  try {
    sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true,
      scriptKind
    );
  } catch {
    return [];
  }

  const references: CodeReference[] = [];
  const lines = content.split(/\r?\n/);

  function addReference(key: string, node: ts.Node) {
    if (!key || (ignoredKeys && ignoredKeys.has(key))) {
      return;
    }
    const { line: zeroLine, character: zeroCol } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    const line = zeroLine + 1;
    const column = zeroCol + 1;

    if (ignoredLines && ignoredLines.has(line)) {
      return;
    }

    const snippet = lines[zeroLine] ? lines[zeroLine].trim() : '';

    references.push({
      key,
      file: relFilePath,
      line,
      column,
      snippet,
      language: isJs ? 'javascript' : 'typescript'
    });
  }

  function handleBindingPattern(pattern: ts.BindingPattern) {
    for (const element of pattern.elements) {
      if (ts.isBindingElement(element)) {
        // e.g. { FOO } or { FOO: renamed } or { FOO = 'default' }
        if (element.propertyName && ts.isIdentifier(element.propertyName)) {
          // Destructured with rename: { FOO: renamed } -> key is FOO
          addReference(element.propertyName.text, element.propertyName);
        } else if (element.propertyName && ts.isStringLiteral(element.propertyName)) {
          // Destructured with string literal: { 'FOO': renamed }
          addReference(element.propertyName.text, element.propertyName);
        } else if (ts.isIdentifier(element.name)) {
          // Standard destructuring: { FOO } -> key is FOO
          addReference(element.name.text, element.name);
        }
      }
    }
  }

  function visit(node: ts.Node) {
    // 1. Variable declaration with destructuring: const { FOO, BAR: b } = process.env;
    if (ts.isVariableDeclaration(node) && node.initializer && ts.isObjectBindingPattern(node.name)) {
      if (isEnvObject(node.initializer)) {
        handleBindingPattern(node.name);
      }
    }

    // 2. Binary assignment with destructuring: ({ FOO, BAR } = process.env);
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
      if (ts.isObjectLiteralExpression(node.left) && isEnvObject(node.right)) {
        for (const prop of node.left.properties) {
          if (ts.isShorthandPropertyAssignment(prop)) {
            addReference(prop.name.text, prop.name);
          } else if (ts.isPropertyAssignment(prop)) {
            if (ts.isIdentifier(prop.name)) {
              addReference(prop.name.text, prop.name);
            } else if (ts.isStringLiteral(prop.name)) {
              addReference(prop.name.text, prop.name);
            }
          }
        }
      }
    }

    // 3. Property access: process.env.FOO or process.env?.FOO
    if (ts.isPropertyAccessExpression(node)) {
      const envType = isEnvObject(node.expression);
      if (envType) {
        addReference(node.name.text, node.name);
      }
    }

    // 4. Element access: process.env['FOO'] or process.env?.['FOO']
    if (ts.isElementAccessExpression(node)) {
      const envType = isEnvObject(node.expression);
      if (envType && node.argumentExpression) {
        if (ts.isStringLiteral(node.argumentExpression)) {
          addReference(node.argumentExpression.text, node.argumentExpression);
        } else if (
          ts.isNoSubstitutionTemplateLiteral(node.argumentExpression)
        ) {
          addReference(node.argumentExpression.text, node.argumentExpression);
        }
      }
    }

    // 5. Deno.env.get('FOO') / Deno.env.has('FOO')
    if (ts.isCallExpression(node)) {
      const expr = node.expression;
      if (ts.isPropertyAccessExpression(expr)) {
        const method = expr.name.text;
        if (method === 'get' || method === 'has') {
          if (ts.isPropertyAccessExpression(expr.expression)) {
            const denoObj = expr.expression.expression;
            const envProp = expr.expression.name.text;
            if (ts.isIdentifier(denoObj) && denoObj.text === 'Deno' && envProp === 'env') {
              const firstArg = node.arguments[0];
              if (firstArg && ts.isStringLiteral(firstArg)) {
                addReference(firstArg.text, firstArg);
              } else if (firstArg && ts.isNoSubstitutionTemplateLiteral(firstArg)) {
                addReference(firstArg.text, firstArg);
              }
            }
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return references;
}
