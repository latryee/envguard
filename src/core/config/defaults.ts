export interface EnvGuardConfig {
  envFile?: string;
  exampleFile?: string;
  typesFile?: string;
  strict?: boolean;
  allowHighEntropy?: boolean;
  entropyThreshold?: number;
  ignoredKeys?: string[];
  includeSystemVars?: boolean;
  customGlobs?: string[];
  ignoreGlobs?: string[];
}

export const DEFAULT_CONFIG: Required<EnvGuardConfig> = {
  envFile: '.env',
  exampleFile: '.env.example',
  typesFile: 'env.d.ts',
  strict: false,
  allowHighEntropy: false,
  entropyThreshold: 4.4,
  ignoredKeys: [],
  includeSystemVars: false,
  customGlobs: [],
  ignoreGlobs: []
};
