import { EnvAnnotations, InferredType } from '../parser/types.js';
import { inferType } from './type-inference.js';

export interface EnvFieldSchema {
  key: string;
  type: InferredType | string;
  enumValues?: string[];
  required: boolean;
  default?: string;
  description?: string;
  secret?: boolean;
  pattern?: string;
}

/**
 * Builds a validated schema map from parsed annotations and inferred types.
 */
export function createSchemaFromAnnotations(
  key: string,
  annotations: EnvAnnotations,
  exampleValue?: string
): EnvFieldSchema {
  let type: InferredType | string = annotations.type || 'string';

  if (!annotations.type && exampleValue) {
    type = inferType(exampleValue, key);
  }

  return {
    key,
    type,
    enumValues: annotations.enumValues,
    required: annotations.required !== false, // default to true unless @optional
    default: annotations.default,
    description: annotations.description,
    secret: annotations.secret,
    pattern: annotations.pattern
  };
}
