import {
  EnvAnnotations,
  EnvAstEntry,
  EnvComment,
  EnvEmptyLine,
  EnvFileAst,
  EnvVariable,
  InferredType,
  ParseOptions
} from './types.js';

/**
 * Extracts schema annotations from a comment string.
 * Example: "# @type number @required @default 3000 @description Port for HTTP server"
 * Example: "# @type enum(dev,staging,prod)"
 */
export function parseAnnotations(commentText: string): EnvAnnotations {
  const annotations: EnvAnnotations = {};
  if (!commentText) return annotations;

  // Match @type <type> or @type enum(a,b,c)
  const typeMatch = commentText.match(/@type\s+([a-zA-Z0-9_]+(?:\([^)]+\))?)/i);
  if (typeMatch) {
    const rawType = typeMatch[1].trim();
    if (rawType.toLowerCase().startsWith('enum(') && rawType.endsWith(')')) {
      annotations.type = 'enum';
      annotations.enumValues = rawType
        .slice(5, -1)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (
      (rawType.toLowerCase().startsWith('regex(') || rawType.toLowerCase().startsWith('pattern(')) &&
      rawType.endsWith(')')
    ) {
      annotations.type = 'regex';
      annotations.pattern = rawType.slice(rawType.indexOf('(') + 1, -1).trim();
    } else {
      annotations.type = rawType.toLowerCase() as InferredType;
    }
  }

  // Match @required (true|false) / @optional
  const reqMatch = commentText.match(/@required(?:\s+(true|false))?/i);
  if (reqMatch) {
    annotations.required = reqMatch[1] ? reqMatch[1].toLowerCase() === 'true' : true;
  } else if (/@optional\b/i.test(commentText)) {
    annotations.required = false;
  }

  // Match @secret
  if (/@secret\b/i.test(commentText)) {
    annotations.secret = true;
  }

  // Match @default <val>
  const defaultMatch = commentText.match(/@default\s+([^\s@]+)/i);
  if (defaultMatch) {
    annotations.default = defaultMatch[1].trim();
  }

  // Match @pattern /regex/ or @pattern <pattern>
  const patternMatch = commentText.match(/@pattern\s+([^\s@]+)/i);
  if (patternMatch) {
    annotations.pattern = patternMatch[1].trim();
  }

  // Match @description <text> (everything after @description until next tag or end of string)
  const descMatch = commentText.match(/@description\s+([^@]+)/i);
  if (descMatch) {
    annotations.description = descMatch[1].trim();
  }

  return annotations;
}

/**
 * Parses raw .env file content into an AST preserving comments, empty lines, and schema annotations.
 */
export function parseEnv(content: string, options: ParseOptions = {}): EnvFileAst {
  const entries: EnvAstEntry[] = [];
  const variables = new Map<string, EnvVariable>();
  const lines = content.split(/\r?\n/);

  let currentCommentGroup: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Empty line
    if (!trimmed) {
      currentCommentGroup = [];
      entries.push({
        type: 'empty',
        line: lineNum
      } satisfies EnvEmptyLine);
      continue;
    }

    // Comment line
    if (trimmed.startsWith('#')) {
      currentCommentGroup.push(trimmed);
      entries.push({
        type: 'comment',
        comment: trimmed,
        line: lineNum
      } satisfies EnvComment);
      continue;
    }

    // Possible variable definition
    // Check for 'export ' prefix
    let isExported = false;
    let lineToParse = trimmed;
    if (lineToParse.startsWith('export ')) {
      isExported = true;
      lineToParse = lineToParse.slice(7).trim();
    }

    // Match KEY=...
    const eqIdx = lineToParse.indexOf('=');
    if (eqIdx > 0) {
      const key = lineToParse.slice(0, eqIdx).trim();
      let rawVal = lineToParse.slice(eqIdx + 1);

      // Validate key format (alphanumeric and underscore)
      if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
        let value = '';
        let quotes: '"' | "'" | null = null;
        let inlineComment = '';

        // Check if value starts with quotes
        const trimmedVal = rawVal.trim();
        if (trimmedVal.startsWith('"') || trimmedVal.startsWith("'")) {
          quotes = trimmedVal[0] as '"' | "'";
          const rest = trimmedVal.slice(1);
          
          let closingQuoteIdx = -1;
          let escaped = false;
          
          for (let c = 0; c < rest.length; c++) {
            if (escaped) {
              escaped = false;
              continue;
            }
            if (rest[c] === '\\') {
              escaped = true;
              continue;
            }
            if (rest[c] === quotes) {
              closingQuoteIdx = c;
              break;
            }
          }

          if (closingQuoteIdx !== -1) {
            value = rest.slice(0, closingQuoteIdx);
            const afterQuote = rest.slice(closingQuoteIdx + 1).trim();
            if (afterQuote.startsWith('#')) {
              inlineComment = afterQuote;
            }
          } else {
            // Multiline string spanning across subsequent lines
            let multilineContent = rest;
            let foundClosing = false;
            let j = i + 1;

            while (j < lines.length) {
              const nextLine = lines[j];
              const quotePos = nextLine.indexOf(quotes);
              if (quotePos !== -1) {
                multilineContent += '\n' + nextLine.slice(0, quotePos);
                const after = nextLine.slice(quotePos + 1).trim();
                if (after.startsWith('#')) {
                  inlineComment = after;
                }
                foundClosing = true;
                i = j;
                break;
              } else {
                multilineContent += '\n' + nextLine;
                j++;
              }
            }

            value = multilineContent;
            if (!foundClosing) {
              // Unclosed quote fallback
              value = trimmedVal.slice(1);
            }
          }

          // Unescape if double quotes
          if (quotes === '"') {
            value = value
              .replace(/\\n/g, '\n')
              .replace(/\\r/g, '\r')
              .replace(/\\t/g, '\t')
              .replace(/\\"/g, '"')
              .replace(/\\\\/g, '\\');
          }
        } else {
          // Unquoted value: check for inline comment
          const commentIdx = rawVal.indexOf('#');
          if (commentIdx !== -1) {
            value = rawVal.slice(0, commentIdx).trim();
            inlineComment = rawVal.slice(commentIdx).trim();
          } else {
            value = rawVal.trim();
          }
        }

        // Combine preceding comments and inline comments for schema annotations
        const combinedComments = [...currentCommentGroup, inlineComment].join(' ');
        const annotations = parseAnnotations(combinedComments);

        const envVar: EnvVariable = {
          type: 'variable',
          key,
          value,
          raw: rawLine,
          line: lineNum,
          inlineComment: inlineComment || undefined,
          annotations,
          quotes,
          exported: isExported || undefined
        };

        entries.push(envVar);
        variables.set(key, envVar);
        currentCommentGroup = [];
        continue;
      }
    }

    // Fallback: treat unrecognized line as comment/raw
    entries.push({
      type: 'comment',
      comment: rawLine,
      line: lineNum
    });
    currentCommentGroup = [];
  }

  return {
    filePath: options.filePath,
    entries,
    variables,
    rawContent: content
  };
}

/**
 * Serializes an EnvFileAst back to string format with preserved structure.
 */
export function serializeEnv(ast: EnvFileAst): string {
  const result: string[] = [];

  for (const entry of ast.entries) {
    if (entry.type === 'empty') {
      result.push('');
    } else if (entry.type === 'comment') {
      result.push(entry.comment);
    } else if (entry.type === 'variable') {
      const exportPrefix = entry.exported ? 'export ' : '';
      let formattedVal = entry.value;

      if (entry.quotes) {
        if (entry.quotes === '"') {
          formattedVal = `"${formattedVal.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
        } else {
          formattedVal = `'${formattedVal}'`;
        }
      } else if (formattedVal.includes(' ') || formattedVal.includes('#')) {
        formattedVal = `"${formattedVal}"`;
      }

      const commentSuffix = entry.inlineComment ? ` ${entry.inlineComment}` : '';
      result.push(`${exportPrefix}${entry.key}=${formattedVal}${commentSuffix}`);
    }
  }

  return result.join('\n');
}
