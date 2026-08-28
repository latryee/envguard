import { EnvFieldSchema } from './schema.js';
import { inferType } from './type-inference.js';

export interface ValidationError {
  key: string;
  value: string;
  expectedType: string;
  actualType: string;
  message: string;
  line?: number;
}

/**
 * Validates a value against an expected EnvFieldSchema.
 */
export function validateFieldValue(
  value: string,
  schema: EnvFieldSchema,
  line?: number
): ValidationError | null {
  const trimmed = value.trim();

  // If empty and required
  if (!trimmed) {
    if (schema.required && schema.default === undefined) {
      return {
        key: schema.key,
        value,
        expectedType: schema.type,
        actualType: 'empty',
        message: `Value for required variable "${schema.key}" cannot be empty.`,
        line
      };
    }
    return null;
  }

  const expected = schema.type.toLowerCase();
  const actualInferred = inferType(trimmed, schema.key);

  switch (expected) {
    case 'port': {
      const num = Number(trimmed);
      if (!Number.isInteger(num) || num < 1 || num > 65535) {
        return {
          key: schema.key,
          value: trimmed,
          expectedType: 'port (1-65535)',
          actualType: actualInferred,
          message: `Expected valid port number (1-65535), got "${trimmed}".`,
          line
        };
      }
      break;
    }

    case 'integer': {
      const num = Number(trimmed);
      if (!Number.isInteger(num)) {
        return {
          key: schema.key,
          value: trimmed,
          expectedType: 'integer',
          actualType: actualInferred,
          message: `Expected integer value, got "${trimmed}".`,
          line
        };
      }
      break;
    }

    case 'number':
    case 'float': {
      const num = Number(trimmed);
      if (isNaN(num)) {
        return {
          key: schema.key,
          value: trimmed,
          expectedType: 'number',
          actualType: actualInferred,
          message: `Expected numeric value, got "${trimmed}".`,
          line
        };
      }
      break;
    }

    case 'boolean':
    case 'bool': {
      const lower = trimmed.toLowerCase();
      if (!['true', 'false', '1', '0', 'yes', 'no'].includes(lower)) {
        return {
          key: schema.key,
          value: trimmed,
          expectedType: 'boolean (true|false)',
          actualType: actualInferred,
          message: `Expected boolean value (true|false|1|0), got "${trimmed}".`,
          line
        };
      }
      break;
    }

    case 'url':
    case 'uri': {
      let isValidUrl = false;
      if (!trimmed.includes(' ') && !trimmed.includes('\n')) {
        if (/^(https?|wss?):\/\//i.test(trimmed)) {
          try {
            new URL(trimmed);
            isValidUrl = true;
          } catch {
            isValidUrl = false;
          }
        } else if (/^(postgres|postgresql|mongodb(?:\+srv)?|redis|rediss|mysql|sqlite|grpc):\/\/.+$/i.test(trimmed)) {
          isValidUrl = true;
        }
      }

      if (!isValidUrl) {
        return {
          key: schema.key,
          value: trimmed,
          expectedType: 'url (e.g. https://... or postgres://...)',
          actualType: actualInferred,
          message: `Expected valid URL format, got "${trimmed}".`,
          line
        };
      }
      break;
    }

    case 'email': {
      if (actualInferred !== 'email') {
        return {
          key: schema.key,
          value: trimmed,
          expectedType: 'email',
          actualType: actualInferred,
          message: `Expected valid email address, got "${trimmed}".`,
          line
        };
      }
      break;
    }

    case 'ip': {
      if (actualInferred !== 'ip') {
        return {
          key: schema.key,
          value: trimmed,
          expectedType: 'ip address',
          actualType: actualInferred,
          message: `Expected valid IPv4/IPv6 address, got "${trimmed}".`,
          line
        };
      }
      break;
    }

    case 'json': {
      if (actualInferred !== 'json') {
        return {
          key: schema.key,
          value: trimmed,
          expectedType: 'json string',
          actualType: actualInferred,
          message: `Expected valid JSON string format, got "${trimmed}".`,
          line
        };
      }
      break;
    }

    case 'enum': {
      if (schema.enumValues && schema.enumValues.length > 0) {
        if (!schema.enumValues.includes(trimmed)) {
          return {
            key: schema.key,
            value: trimmed,
            expectedType: `enum(${schema.enumValues.join(', ')})`,
            actualType: trimmed,
            message: `Value "${trimmed}" is not one of allowed enum values [${schema.enumValues.join(', ')}].`,
            line
          };
        }
      }
      break;
    }

    case 'uuid': {
      if (actualInferred !== 'uuid') {
        return {
          key: schema.key,
          value: trimmed,
          expectedType: 'uuid',
          actualType: actualInferred,
          message: `Expected valid UUID string, got "${trimmed}".`,
          line
        };
      }
      break;
    }

    default: {
      // Custom pattern check if specified
      if (schema.pattern) {
        try {
          const regex = new RegExp(schema.pattern);
          if (!regex.test(trimmed)) {
            return {
              key: schema.key,
              value: trimmed,
              expectedType: `pattern(${schema.pattern})`,
              actualType: trimmed,
              message: `Value does not match required regex pattern "${schema.pattern}".`,
              line
            };
          }
        } catch {
          // invalid regex
        }
      }
      break;
    }
  }

  return null;
}
