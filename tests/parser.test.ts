import { describe, it, expect } from 'vitest';
import { parseEnv, serializeEnv, parseAnnotations } from '../src/core/parser/env-parser.js';

describe('EnvParser & Schema Annotation Engine', () => {
  it('parses standard KEY=value pairs and trims values', () => {
    const raw = `
PORT=3000
HOST=localhost
DATABASE_URL=postgres://user:pass@localhost:5432/db
`;
    const ast = parseEnv(raw);
    expect(ast.variables.size).toBe(3);
    expect(ast.variables.get('PORT')?.value).toBe('3000');
    expect(ast.variables.get('HOST')?.value).toBe('localhost');
    expect(ast.variables.get('DATABASE_URL')?.value).toBe('postgres://user:pass@localhost:5432/db');
  });

  it('handles quotes, escapes, and inline comments', () => {
    const raw = `
# Server Configuration
PORT="8080" # @type port @required
APP_NAME='My Application' # single quotes
MESSAGE="Hello \\"world\\"\\nSecond Line"
export SECRET_KEY="xyz123"
`;
    const ast = parseEnv(raw);
    expect(ast.variables.get('PORT')?.value).toBe('8080');
    expect(ast.variables.get('PORT')?.annotations.type).toBe('port');
    expect(ast.variables.get('PORT')?.annotations.required).toBe(true);

    expect(ast.variables.get('APP_NAME')?.value).toBe('My Application');
    expect(ast.variables.get('APP_NAME')?.quotes).toBe("'");

    expect(ast.variables.get('MESSAGE')?.value).toBe('Hello "world"\nSecond Line');
    expect(ast.variables.get('SECRET_KEY')?.exported).toBe(true);
    expect(ast.variables.get('SECRET_KEY')?.value).toBe('xyz123');
  });

  it('parses multiline quoted values spanning multiple lines', () => {
    const raw = `
PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA0Y+u4n...
-----END RSA PRIVATE KEY-----"
`;
    const ast = parseEnv(raw);
    expect(ast.variables.has('PRIVATE_KEY')).toBe(true);
    expect(ast.variables.get('PRIVATE_KEY')?.value).toContain('BEGIN RSA PRIVATE KEY');
    expect(ast.variables.get('PRIVATE_KEY')?.value).toContain('END RSA PRIVATE KEY');
  });

  it('extracts rich schema annotations (@type, @enum, @default, @description, @pattern)', () => {
    const comment = '# @type enum(development, staging, production) @default development @description App environment @required @pattern ^[a-z]+$';
    const ann = parseAnnotations(comment);
    expect(ann.type).toBe('enum');
    expect(ann.enumValues).toEqual(['development', 'staging', 'production']);
    expect(ann.default).toBe('development');
    expect(ann.description).toBe('App environment');
    expect(ann.required).toBe(true);
    expect(ann.pattern).toBe('^[a-z]+$');
  });

  it('preserves structure and comments when serializing AST back to string', () => {
    const raw = `# Header Comment
PORT=3000 # @type port

# Database Block
DATABASE_URL=postgresql://localhost:5432/db`;

    const ast = parseEnv(raw);
    const serialized = serializeEnv(ast);
    expect(serialized).toContain('# Header Comment');
    expect(serialized).toContain('PORT=3000 # @type port');
    expect(serialized).toContain('DATABASE_URL=postgresql://localhost:5432/db');
  });
});
