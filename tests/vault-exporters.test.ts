import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  parseEnv,
  exportToK8sSecret,
  exportToDockerCompose,
  exportToTerraform,
  exportToHelm,
  exportToJson,
  exportToJsonSchema,
  exportEnv
} from '../src/index.js';
import { runExport } from '../src/cli/commands/export.js';

describe('Secret Vault & Infrastructure Exporters', () => {
  const sampleEnv = `
# @type port @required
PORT=3000
# @type boolean
ENABLE_LOGS=true
# @type url
DATABASE_URL=postgresql://localhost:5432/mydb
`;

  it('exports to Kubernetes Secret YAML format', () => {
    const ast = parseEnv(sampleEnv);
    const k8s = exportToK8sSecret(ast, { name: 'my-k8s-secret', namespace: 'prod' });

    expect(k8s).toContain('apiVersion: v1');
    expect(k8s).toContain('kind: Secret');
    expect(k8s).toContain('name: my-k8s-secret');
    expect(k8s).toContain('namespace: prod');
    expect(k8s).toContain('PORT: "3000"');
    expect(k8s).toContain('ENABLE_LOGS: "true"');
  });

  it('exports to Docker Compose environment format', () => {
    const ast = parseEnv(sampleEnv);
    const compose = exportToDockerCompose(ast, { service: 'api' });

    expect(compose).toContain('services:');
    expect(compose).toContain('api:');
    expect(compose).toContain('- PORT=3000');
    expect(compose).toContain('- ENABLE_LOGS=true');
  });

  it('exports to Terraform tfvars format', () => {
    const ast = parseEnv(sampleEnv);
    const tf = exportToTerraform(ast);

    expect(tf).toContain('port = 3000');
    expect(tf).toContain('enable_logs = true');
    expect(tf).toContain('database_url = "postgresql://localhost:5432/mydb"');
  });

  it('exports to Helm values format', () => {
    const ast = parseEnv(sampleEnv);
    const helm = exportToHelm(ast);

    expect(helm).toContain('env:');
    expect(helm).toContain('- name: PORT');
    expect(helm).toContain('value: "3000"');
  });

  it('exports to JSON and JSON Schema formats', () => {
    const ast = parseEnv(sampleEnv);

    const jsonStr = exportToJson(ast);
    const parsedJson = JSON.parse(jsonStr);
    expect(parsedJson.PORT).toBe('3000');
    expect(parsedJson.ENABLE_LOGS).toBe('true');

    const schemaStr = exportToJsonSchema(ast);
    const parsedSchema = JSON.parse(schemaStr);
    expect(parsedSchema.$schema).toContain('json-schema.org');
    expect(parsedSchema.properties.PORT).toBeDefined();
    expect(parsedSchema.required).toContain('PORT');
  });

  it('runs CLI export command to output file', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envguard-cli-export-'));
    const oldCwd = process.cwd();
    try {
      fs.writeFileSync(path.join(tempDir, '.env'), 'PORT=8080\n');
      process.chdir(tempDir);

      const outFile = path.join(tempDir, 'k8s.yaml');
      const exitCode = await runExport({
        envFile: '.env',
        format: 'k8s-secret',
        output: 'k8s.yaml',
        quiet: true
      });

      expect(exitCode).toBe(0);
      expect(fs.existsSync(outFile)).toBe(true);

      const content = fs.readFileSync(outFile, 'utf8');
      expect(content).toContain('PORT: "8080"');
    } finally {
      process.chdir(oldCwd);
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
