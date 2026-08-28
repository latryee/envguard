import { parseEnv } from '../parser/env-parser.js';

export interface FormatterOptions {
  sort?: 'alphabetical' | 'prefix' | false;
  quoteStyle?: 'as-needed' | 'always-double' | 'always-single';
  trimTrailingWhitespace?: boolean;
}

export function formatEnv(content: string, options: FormatterOptions = {}): string {
  const ast = parseEnv(content);
  const sort = options.sort ?? false;
  const quoteStyle = options.quoteStyle ?? 'as-needed';

  let variables = Array.from(ast.variables.values());

  if (sort === 'alphabetical') {
    variables.sort((a, b) => a.key.localeCompare(b.key));
  } else if (sort === 'prefix') {
    variables.sort((a, b) => {
      const prefixA = a.key.split('_')[0] || '';
      const prefixB = b.key.split('_')[0] || '';
      const prefixCmp = prefixA.localeCompare(prefixB);
      if (prefixCmp !== 0) return prefixCmp;
      return a.key.localeCompare(b.key);
    });
  }

  // Format each variable line
  const lines: string[] = [];
  let lastPrefix = '';

  for (const v of variables) {
    const currentPrefix = v.key.split('_')[0] || '';

    // Add extra newline when prefix changes in prefix sort mode
    if (sort === 'prefix' && lastPrefix && currentPrefix !== lastPrefix) {
      lines.push('');
    }
    lastPrefix = currentPrefix;

    // Build annotations comment if any
    const annotationsList: string[] = [];
    if (v.annotations.type) {
      annotationsList.push(`@type ${v.annotations.type}`);
    }
    if (v.annotations.enumValues && v.annotations.enumValues.length > 0) {
      annotationsList.push(`@type enum(${v.annotations.enumValues.join(', ')})`);
    }
    if (v.annotations.required !== undefined) {
      annotationsList.push(v.annotations.required ? '@required' : '@optional');
    }
    if (v.annotations.default) {
      annotationsList.push(`@default ${v.annotations.default}`);
    }
    if (v.annotations.description) {
      annotationsList.push(`@description ${v.annotations.description}`);
    }

    if (annotationsList.length > 0) {
      lines.push(`# ${annotationsList.join(' ')}`);
    }

    // Format value and quotes
    let formattedVal = v.value;
    const needsQuotes =
      /\s/.test(v.value) ||
      v.value.includes('#') ||
      v.value.includes('\n') ||
      v.value.includes('"') ||
      v.value.includes("'");

    if (quoteStyle === 'always-double') {
      formattedVal = `"${v.value.replace(/"/g, '\\"')}"`;
    } else if (quoteStyle === 'always-single') {
      formattedVal = `'${v.value.replace(/'/g, "\\'")}'`;
    } else {
      // as-needed
      if (needsQuotes) {
        formattedVal = `"${v.value.replace(/"/g, '\\"')}"`;
      }
    }

    const inlineComment = v.inlineComment
      ? (v.inlineComment.startsWith('#') ? ` ${v.inlineComment}` : ` # ${v.inlineComment}`)
      : '';
    lines.push(`${v.key}=${formattedVal}${inlineComment}`);
  }

  return lines.join('\n') + '\n';
}
