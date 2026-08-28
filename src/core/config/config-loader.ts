import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_CONFIG, EnvGuardConfig, SecretDetectionConfig } from './defaults.js';

export type LoadedConfig = Required<Omit<EnvGuardConfig, 'secretDetection'>> & {
  secretDetection: Required<SecretDetectionConfig>;
};

function mergeConfig(
  base: LoadedConfig,
  override: Partial<EnvGuardConfig>
): LoadedConfig {
  const secretDetection: Required<SecretDetectionConfig> = {
    entropyThreshold:
      override.secretDetection?.entropyThreshold ??
      override.entropyThreshold ??
      base.secretDetection.entropyThreshold,
    minLength:
      override.secretDetection?.minLength ??
      base.secretDetection.minLength,
    allowHighEntropy:
      override.secretDetection?.allowHighEntropy ??
      override.allowHighEntropy ??
      base.secretDetection.allowHighEntropy
  };

  return {
    ...base,
    ...override,
    entropyThreshold: secretDetection.entropyThreshold,
    allowHighEntropy: secretDetection.allowHighEntropy,
    secretDetection
  };
}

export function loadConfig(cwd = process.cwd()): LoadedConfig {
  let config: LoadedConfig = {
    ...DEFAULT_CONFIG,
    secretDetection: { ...DEFAULT_CONFIG.secretDetection }
  };

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
        config = mergeConfig(config, parsed);
        return config;
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
        config = mergeConfig(config, pkg.envguard);
        return config;
      }
    } catch (err) {
      console.warn(
        `[envguard] Warning: Failed to parse configuration file "${pkgPath}": ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  return config;
}

