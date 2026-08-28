import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_CONFIG, EnvGuardConfig } from './defaults.js';

export function loadConfig(cwd = process.cwd()): Required<EnvGuardConfig> {
  const config = { ...DEFAULT_CONFIG };

  // 1. Check envguard.config.json or .envguardrc.json
  const jsonPaths = [
    path.join(cwd, 'envguard.config.json'),
    path.join(cwd, '.envguardrc.json'),
    path.join(cwd, '.envguardrc')
  ];

  for (const p of jsonPaths) {
    if (fs.existsSync(p)) {
      try {
        const raw = fs.readFileSync(p, 'utf8');
        const parsed = JSON.parse(raw);
        return Object.assign(config, parsed);
      } catch (err) {
        console.warn(
          `[envguard] Warning: Failed to parse configuration file "${p}": ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }
  }

  // 2. Check package.json "envguard" key
  const pkgPath = path.join(cwd, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const raw = fs.readFileSync(pkgPath, 'utf8');
      const pkg = JSON.parse(raw);
      if (pkg.envguard && typeof pkg.envguard === 'object') {
        return Object.assign(config, pkg.envguard);
      }
    } catch (err) {
      console.warn(
        `[envguard] Warning: Failed to parse configuration file "${pkgPath}": ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  return config;
}

