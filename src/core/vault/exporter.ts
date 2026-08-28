import { EnvFileAst } from '../parser/types.js';

export type ExportFormat =
  | 'k8s-secret'
  | 'docker-compose'
  | 'terraform'
  | 'helm'
  | 'json'
  | 'json-schema';

export interface ExporterOptions {
  name?: string;
  namespace?: string;
  service?: string;
}

/**
 * Exports variables as a Kubernetes Secret YAML manifest
 */
export function exportToK8sSecret(
  ast: EnvFileAst,
  options: ExporterOptions = {}
): string {
  const name = options.name || 'app-env-secret';
  const namespace = options.namespace || 'default';

  const stringDataLines = Array.from(ast.variables.values())
    .map((v) => `  ${v.key}: "${v.value.replace(/"/g, '\\"')}"`)
    .join('\n');

  return `apiVersion: v1
kind: Secret
metadata:
  name: ${name}
  namespace: ${namespace}
type: Opaque
stringData:
${stringDataLines}
`;
}

/**
 * Exports variables as a Docker Compose environment block
 */
export function exportToDockerCompose(
  ast: EnvFileAst,
  options: ExporterOptions = {}
): string {
  const service = options.service || 'web';

  const envLines = Array.from(ast.variables.values())
    .map((v) => `      - ${v.key}=${v.value}`)
    .join('\n');

  return `services:
  ${service}:
    environment:
${envLines}
`;
}

/**
 * Exports variables as a Terraform .tfvars file
 */
export function exportToTerraform(ast: EnvFileAst): string {
  return (
    Array.from(ast.variables.values())
      .map((v) => {
        // Check if number or boolean
        if (/^-?\d+$/.test(v.value) || /^-?\d+\.\d+$/.test(v.value)) {
          return `${v.key.toLowerCase()} = ${v.value}`;
        }
        if (v.value === 'true' || v.value === 'false') {
          return `${v.key.toLowerCase()} = ${v.value}`;
        }
        return `${v.key.toLowerCase()} = "${v.value.replace(/"/g, '\\"')}"`;
      })
      .join('\n') + '\n'
  );
}

/**
 * Exports variables as Helm values.yaml environment block
 */
export function exportToHelm(ast: EnvFileAst): string {
  const envLines = Array.from(ast.variables.values())
    .map((v) => `  - name: ${v.key}\n    value: "${v.value.replace(/"/g, '\\"')}"`)
    .join('\n');

  return `env:
${envLines}
`;
}

/**
 * Exports variables as standard JSON
 */
export function exportToJson(ast: EnvFileAst): string {
  const obj: Record<string, string> = {};
  for (const [key, v] of ast.variables) {
    obj[key] = v.value;
  }
  return JSON.stringify(obj, null, 2);
}

/**
 * Exports variables as a JSON Schema document
 */
export function exportToJsonSchema(ast: EnvFileAst): string {
  const properties: Record<string, any> = {};
  const required: string[] = [];

  for (const [key, v] of ast.variables) {
    const isRequired = v.annotations.required ?? true;
    if (isRequired) {
      required.push(key);
    }

    const typeDesc: Record<string, any> = {
      type: 'string',
      description: v.annotations.description || `Environment variable ${key}`
    };

    if (
      v.annotations.type === 'port' ||
      v.annotations.type === 'integer' ||
      v.annotations.type === 'number'
    ) {
      typeDesc.type = ['string', 'number'];
    } else if (v.annotations.type === 'boolean') {
      typeDesc.type = ['string', 'boolean'];
    }

    if (v.annotations.enumValues) {
      typeDesc.enum = v.annotations.enumValues;
    }
    if (v.annotations.default) {
      typeDesc.default = v.annotations.default;
    }

    properties[key] = typeDesc;
  }

  const schema = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'Environment Variables Schema',
    type: 'object',
    properties,
    required
  };

  return JSON.stringify(schema, null, 2);
}

/**
 * Main export entry point
 */
export function exportEnv(
  ast: EnvFileAst,
  format: ExportFormat,
  options: ExporterOptions = {}
): string {
  switch (format) {
    case 'k8s-secret':
      return exportToK8sSecret(ast, options);
    case 'docker-compose':
      return exportToDockerCompose(ast, options);
    case 'terraform':
      return exportToTerraform(ast);
    case 'helm':
      return exportToHelm(ast);
    case 'json':
      return exportToJson(ast);
    case 'json-schema':
      return exportToJsonSchema(ast);
    default:
      return exportToJson(ast);
  }
}
