import { InferredType } from '../parser/types.js';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const IPV4_REGEX = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
const IPV6_REGEX = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
const BASE64_REGEX = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

/**
 * Infers the high-level semantic type of a string value.
 */
export function inferType(value: string, key?: string): InferredType {
  const trimmed = value.trim();
  if (!trimmed) return 'string';

  // Key heuristics for PORT
  if (key && (key === 'PORT' || key.endsWith('_PORT'))) {
    const num = Number(trimmed);
    if (Number.isInteger(num) && num >= 1 && num <= 65535) {
      return 'port';
    }
  }

  // Boolean
  const lower = trimmed.toLowerCase();
  if (lower === 'true' || lower === 'false') {
    return 'boolean';
  }

  // Integer / Number / Port
  if (/^-?\d+$/.test(trimmed)) {
    const num = Number(trimmed);
    if (Number.isInteger(num)) {
      if (num >= 1 && num <= 65535 && (key?.toLowerCase().includes('port') || num === 3000 || num === 8080 || num === 5000 || num === 8000)) {
        return 'port';
      }
      return 'integer';
    }
  }

  if (/^-?\d+\.\d+$/.test(trimmed)) {
    return 'number';
  }

  // URLs (HTTP, WS, Database URIs)
  if (
    /^(https?|wss?|postgres|postgresql|mongodb(?:\+srv)?|redis|rediss|mysql|sqlite|grpc):\/\//i.test(trimmed) &&
    !trimmed.includes(' ') &&
    !trimmed.includes('\n')
  ) {
    return 'url';
  }

  // Emails
  if (EMAIL_REGEX.test(trimmed)) {
    return 'email';
  }

  // IP addresses
  if (IPV4_REGEX.test(trimmed) || IPV6_REGEX.test(trimmed)) {
    return 'ip';
  }

  // JSON Object or Array
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      JSON.parse(trimmed);
      return 'json';
    } catch {
      // not valid JSON
    }
  }

  // UUID
  if (UUID_REGEX.test(trimmed)) {
    return 'uuid';
  }

  // Base64 (only if long enough and matches)
  if (trimmed.length >= 24 && BASE64_REGEX.test(trimmed) && (trimmed.endsWith('=') || /^[A-Za-z0-9+/]+$/.test(trimmed))) {
    return 'base64';
  }

  return 'string';
}
