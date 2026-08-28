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
 * Checks if an AST expression represents a known environment object (process.env, import.meta.env, Bun.env) or an alias.
 */
function isEnvExpression(node: ts.Node, aliases: Set<string>): 'process.env' | 'import.meta.env' | 'Bun.env' | 'alias' | null {
  // Direct identifier alias (e.g. env.SECRET where const env = process.env)
  if (ts.isIdentifier(node) && aliases.has(node.text)) {
    return 'alias';
  }

  // Property access expression: process.env, Bun.env, import.meta.env
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
  const envAliases = new Set<string>();

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
        // Handle nested destructuring: { nested: { SECRET } }
        if (ts.isObjectBindingPattern(element.name)) {
          handleBindingPattern(element.name);
          continue;
        }

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
    // 0. Track aliased env wrappers: const env = process.env; or const myEnv = import.meta.env;
    if (ts.isVariableDeclaration(node) && node.initializer && ts.isIdentifier(node.name)) {
      if (isEnvExpression(node.initializer, envAliases)) {
        envAliases.add(node.name.text);
      }
    }

    // 1. Variable declaration with destructuring: const { FOO, BAR: b } = process.env;
    if (ts.isVariableDeclaration(node) && node.initializer && ts.isObjectBindingPattern(node.name)) {
      if (isEnvExpression(node.initializer, envAliases)) {
        handleBindingPattern(node.name);
      }
    }

    // 1b. Parameter destructuring with default: function test({ API_KEY } = process.env)
    if (ts.isParameter(node) && node.initializer && ts.isObjectBindingPattern(node.name)) {
      if (isEnvExpression(node.initializer, envAliases)) {
        handleBindingPattern(node.name);
      }
    }

    // 2. Binary assignment with destructuring: ({ FOO, BAR } = process.env);
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
      if (ts.isObjectLiteralExpression(node.left) && isEnvExpression(node.right, envAliases)) {
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

    // 3. Property access: process.env.FOO or env.FOO or process.env?.FOO
    if (ts.isPropertyAccessExpression(node)) {
      const envType = isEnvExpression(node.expression, envAliases);
      if (envType) {
        addReference(node.name.text, node.name);
      }
    }

    // 4. Element access: process.env['FOO'] or env['FOO'] or process.env?.['FOO']
    if (ts.isElementAccessExpression(node)) {
      const envType = isEnvExpression(node.expression, envAliases);
      if (envType && node.argumentExpression) {
        if (ts.isStringLiteral(node.argumentExpression)) {
          addReference(node.argumentExpression.text, node.argumentExpression);
        } else if (ts.isNoSubstitutionTemplateLiteral(node.argumentExpression)) {
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
