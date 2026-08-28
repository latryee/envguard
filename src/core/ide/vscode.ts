import fs from 'node:fs';
import path from 'node:path';
import { parseEnv } from '../parser/env-parser.js';
import { exportToJsonSchema } from '../vault/exporter.js';

export interface VsCodeSetupResult {
  settingsCreated: boolean;
  schemaCreated: boolean;
  settingsPath: string;
  schemaPath: string;
}

/**
 * Generates .vscode configuration and JSON Schema for environment variables.
 */
export function setupVsCodeIntegration(
  cwd = process.cwd(),
  exampleFile = '.env.example'
): VsCodeSetupResult {
  const vscodeDir = path.join(cwd, '.vscode');
  const settingsPath = path.join(vscodeDir, 'settings.json');
  const schemaPath = path.join(cwd, '.envguard.schema.json');
  const examplePath = path.join(cwd, exampleFile);

  if (!fs.existsSync(vscodeDir)) {
    fs.mkdirSync(vscodeDir, { recursive: true });
  }

  // 1. Generate .envguard.schema.json
  let schemaCreated = false;
  if (fs.existsSync(examplePath)) {
    const raw = fs.readFileSync(examplePath, 'utf8');
    const ast = parseEnv(raw);
    const jsonSchema = exportToJsonSchema(ast);
    fs.writeFileSync(schemaPath, jsonSchema, 'utf8');
    schemaCreated = true;
  }

  // 2. Update .vscode/settings.json
  let settings: Record<string, any> = {};
  if (fs.existsSync(settingsPath)) {
    try {
      settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    } catch {
      settings = {};
    }
  }

  // Add file nesting
  settings['explorer.fileNesting.enabled'] = true;
  settings['explorer.fileNesting.patterns'] = {
    ...(settings['explorer.fileNesting.patterns'] || {}),
    '.env': '.env.*, env.d.ts, .envguard*, .envguardrc*'
  };

  // Add file associations
  settings['files.associations'] = {
    ...(settings['files.associations'] || {}),
    '.env*': 'dotenv',
    '.envguardrc': 'json',
    '.envguardignore': 'ignore'
  };

  // Add JSON schema mapping if schema exists
  if (schemaCreated) {
    const existingSchemas = settings['json.schemas'] || [];
    const schemaEntry = {
      fileMatch: ['envguard.config.json', '.envguardrc.json'],
      url: './.envguard.schema.json'
    };

    const hasEntry = existingSchemas.some((s: any) => s.url === './.envguard.schema.json');
    if (!hasEntry) {
      settings['json.schemas'] = [...existingSchemas, schemaEntry];
    }
  }

  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');

  return {
    settingsCreated: true,
    schemaCreated,
    settingsPath,
    schemaPath
  };
}
