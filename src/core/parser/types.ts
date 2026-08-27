export type InferredType =
  | 'string'
  | 'number'
  | 'integer'
  | 'port'
  | 'boolean'
  | 'url'
  | 'email'
  | 'ip'
  | 'json'
  | 'enum'
  | 'uuid'
  | 'base64'
  | 'regex';

export interface EnvAnnotations {
  type?: InferredType | string;
  enumValues?: string[];
  required?: boolean;
  default?: string;
  description?: string;
  secret?: boolean;
  pattern?: string;
}

export interface EnvVariable {
  type: 'variable';
  key: string;
  value: string;
  raw: string;
  line: number;
  inlineComment?: string;
  annotations: EnvAnnotations;
  quotes?: '"' | "'" | null;
  exported?: boolean;
}

export interface EnvComment {
  type: 'comment';
  comment: string;
  line: number;
}

export interface EnvEmptyLine {
  type: 'empty';
  line: number;
}

export type EnvAstEntry = EnvVariable | EnvComment | EnvEmptyLine;

export interface EnvFileAst {
  filePath?: string;
  entries: EnvAstEntry[];
  variables: Map<string, EnvVariable>;
  rawContent: string;
}

export interface ParseOptions {
  filePath?: string;
}
