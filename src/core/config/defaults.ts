export interface SecretDetectionConfig {
  entropyThreshold?: number;
  minLength?: number;
  allowHighEntropy?: boolean;
}

export interface EnvGuardConfig {
  envFile?: string;
  exampleFile?: string;
  typesFile?: string;
  strict?: boolean;
  allowHighEntropy?: boolean;
  entropyThreshold?: number;
  secretDetection?: SecretDetectionConfig;
  ignoredKeys?: string[];
  includeSystemVars?: boolean;
  customGlobs?: string[];
  ignoreGlobs?: string[];
}

export const DEFAULT_CONFIG: Required<Omit<EnvGuardConfig, 'secretDetection'>> & {
  secretDetection: Required<SecretDetectionConfig>;
} = {
  envFile: '.env',
  exampleFile: '.env.example',
  typesFile: 'env.d.ts',
  strict: false,
  allowHighEntropy: false,
  entropyThreshold: 4.3,
  secretDetection: {
    entropyThreshold: 4.3,
    minLength: 20,
    allowHighEntropy: false
  },
  ignoredKeys: [],
  includeSystemVars: false,
  customGlobs: [],
  ignoreGlobs: []
};
