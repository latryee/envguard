import { InferredType } from '../parser/types.js';
import { inferType } from '../validator/type-inference.js';

/**
 * Generates an intelligent, safe placeholder for an environment variable.
 */
export function generateSafePlaceholder(
  key: string,
  currentValue?: string,
  explicitType?: InferredType | string
): { value: string; inferredType: InferredType } {
  const upperKey = key.toUpperCase();
  const inferred = (explicitType as InferredType) || (currentValue ? inferType(currentValue, key) : inferTypeFromKeyName(upperKey));

  // Common specific well-known keys
  if (upperKey === 'PORT' || upperKey.endsWith('_PORT')) {
    return { value: '3000', inferredType: 'port' };
  }
  if (upperKey === 'NODE_ENV') {
    return { value: 'development', inferredType: 'string' };
  }
  if (upperKey.includes('DATABASE_URL') || upperKey.includes('DB_URI') || upperKey.includes('POSTGRES_URL')) {
    return { value: 'postgresql://postgres:postgres@localhost:5432/mydb', inferredType: 'url' };
  }
  if (upperKey.includes('MONGODB_URI') || upperKey.includes('MONGO_URL')) {
    return { value: 'mongodb://localhost:27017/mydb', inferredType: 'url' };
  }
  if (upperKey.includes('REDIS_URL') || upperKey.includes('REDIS_URI')) {
    return { value: 'redis://localhost:6379', inferredType: 'url' };
  }
  if (upperKey.includes('OPENAI_API_KEY')) {
    return { value: 'your_openai_api_key_here', inferredType: 'string' };
  }
  if (upperKey.includes('ANTHROPIC_API_KEY')) {
    return { value: 'your_anthropic_api_key_here', inferredType: 'string' };
  }
  if (upperKey.includes('STRIPE_SECRET_KEY') || upperKey.includes('STRIPE_KEY')) {
    return { value: 'sk_test_your_stripe_key_here', inferredType: 'string' };
  }
  if (upperKey.includes('JWT_SECRET') || upperKey.includes('SESSION_SECRET') || upperKey.includes('AUTH_SECRET')) {
    return { value: 'your_super_secret_jwt_key_change_in_production', inferredType: 'string' };
  }
  if (upperKey.includes('AWS_ACCESS_KEY_ID')) {
    return { value: 'AKIAIOSFODNN7EXAMPLE', inferredType: 'string' };
  }
  if (upperKey.includes('AWS_SECRET_ACCESS_KEY')) {
    return { value: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY', inferredType: 'string' };
  }

  // Type-based fallbacks
  switch (inferred) {
    case 'port':
      return { value: '3000', inferredType: 'port' };
    case 'duration':
      return { value: '30s', inferredType: 'duration' };
    case 'cron':
      return { value: '0 0 * * *', inferredType: 'cron' };
    case 'semver':
      return { value: '1.0.0', inferredType: 'semver' };
    case 'hostname':
      return { value: 'api.example.com', inferredType: 'hostname' };
    case 'boolean':
      return { value: 'false', inferredType: 'boolean' };
    case 'integer':
    case 'number':
      return { value: '100', inferredType: 'integer' };
    case 'url':
      return { value: 'https://api.example.com', inferredType: 'url' };
    case 'email':
      return { value: 'user@example.com', inferredType: 'email' };
    case 'ip':
      return { value: '127.0.0.1', inferredType: 'ip' };
    case 'uuid':
      return { value: '123e4567-e89b-12d3-a456-426614174000', inferredType: 'uuid' };
    case 'base64':
      return { value: 'c29tZV9zYWZlX2Jhc2U2NF9kYXRh', inferredType: 'base64' };
    case 'json':
      return { value: '{"key": "value"}', inferredType: 'json' };
    default:
      if (
        upperKey.includes('KEY') ||
        upperKey.includes('SECRET') ||
        upperKey.includes('TOKEN') ||
        upperKey.includes('PASSWORD') ||
        upperKey.includes('PASS') ||
        upperKey.includes('AUTH')
      ) {
        return { value: `your_${key.toLowerCase()}_here`, inferredType: 'string' };
      }
      return { value: `your_${key.toLowerCase()}_here`, inferredType: 'string' };
  }
}

function inferTypeFromKeyName(upperKey: string): InferredType {
  if (upperKey.endsWith('_PORT') || upperKey === 'PORT') return 'port';
  if (
    upperKey.startsWith('ENABLE_') ||
    upperKey.startsWith('IS_') ||
    upperKey.startsWith('USE_') ||
    upperKey === 'DEBUG'
  ) {
    return 'boolean';
  }
  if (
    upperKey.endsWith('_TIMEOUT') ||
    upperKey.endsWith('_TTL') ||
    upperKey.endsWith('_INTERVAL') ||
    upperKey.endsWith('_DURATION') ||
    upperKey.endsWith('_EXPIRY')
  ) {
    return 'duration';
  }
  if (upperKey.endsWith('_CRON') || upperKey.endsWith('_SCHEDULE')) {
    return 'cron';
  }
  if (upperKey.endsWith('_VERSION') || upperKey === 'APP_VERSION') {
    return 'semver';
  }
  if (upperKey.endsWith('_HOST') || upperKey.endsWith('_HOSTNAME') || upperKey === 'HOST') {
    return 'hostname';
  }
  if (upperKey.endsWith('_URL') || upperKey.endsWith('_URI') || upperKey.endsWith('_ENDPOINT')) {
    return 'url';
  }
  if (upperKey.endsWith('_EMAIL')) {
    return 'email';
  }
  if (
    upperKey.endsWith('_COUNT') ||
    upperKey.endsWith('_LIMIT') ||
    upperKey.endsWith('_RETRIES')
  ) {
    return 'integer';
  }
  return 'string';
}
