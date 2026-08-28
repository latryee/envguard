export interface SecretDetectionConfig {
  entropyThreshold?: number;
  minLength?: number;
  allowHighEntropy?: boolean;
  paranoid?: boolean;
  minConfidence?: number;
}

export interface EnvGuardConfig {
  envFile?: string;
  exampleFile?: string;
  typesFile?: string;
  strict?: boolean;
  allowHighEntropy?: boolean;
  entropyThreshold?: number;
  paranoid?: boolean;
  minConfidence?: number;
  workspaces?: boolean;
  scanHistory?: boolean;
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
  paranoid: false,
  minConfidence: 80,
  workspaces: false,
  scanHistory: false,
  secretDetection: {
    entropyThreshold: 4.3,
    minLength: 20,
    allowHighEntropy: false,
    paranoid: false,
    minConfidence: 80
  },
  ignoredKeys: [],
  includeSystemVars: false,
  customGlobs: [],
  ignoreGlobs: []
};
