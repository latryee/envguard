import { describe, it, expect } from 'vitest';
import { inferType } from '../src/core/validator/type-inference.js';
import { validateFieldValue } from '../src/core/validator/type-validator.js';

describe('Type Inference & Validation Engine', () => {
  it('infers types accurately', () => {
    expect(inferType('3000', 'PORT')).toBe('port');
    expect(inferType('8080', 'APP_PORT')).toBe('port');
    expect(inferType('true')).toBe('boolean');
    expect(inferType('false')).toBe('boolean');
    expect(inferType('42')).toBe('integer');
    expect(inferType('3.14159')).toBe('number');
    expect(inferType('https://api.github.com')).toBe('url');
    expect(inferType('postgres://user:pass@localhost:5432/db')).toBe('url');
    expect(inferType('user@example.com')).toBe('email');
    expect(inferType('192.168.1.1')).toBe('ip');
    expect(inferType('{"theme":"dark"}')).toBe('json');
    expect(inferType('c29tZSByYW5kb20gYmFzZTY0IHN0cmluZyB2YWx1ZQ==')).toBe('base64');
  });

  it('validates port number bounds (1-65535)', () => {
    const valid = validateFieldValue('3000', { key: 'PORT', type: 'port', required: true });
    expect(valid).toBeNull();

    const tooHigh = validateFieldValue('70000', { key: 'PORT', type: 'port', required: true });
    expect(tooHigh).not.toBeNull();
    expect(tooHigh?.message).toContain('port number');

    const zeroPort = validateFieldValue('0', { key: 'PORT', type: 'port', required: true });
    expect(zeroPort).not.toBeNull();

    const notNum = validateFieldValue('three_thousand', { key: 'PORT', type: 'port', required: true });
    expect(notNum).not.toBeNull();
  });

  it('validates integer and number values', () => {
    expect(validateFieldValue('42', { key: 'RETRIES', type: 'integer', required: true })).toBeNull();
    expect(validateFieldValue('3.14', { key: 'RETRIES', type: 'integer', required: true })).not.toBeNull();
    expect(validateFieldValue('abc', { key: 'RETRIES', type: 'integer', required: true })).not.toBeNull();

    expect(validateFieldValue('3.14', { key: 'RATE', type: 'number', required: true })).toBeNull();
    expect(validateFieldValue('not_a_num', { key: 'RATE', type: 'number', required: true })).not.toBeNull();
  });

  it('validates boolean values', () => {
    expect(validateFieldValue('true', { key: 'DEBUG', type: 'boolean', required: true })).toBeNull();
    expect(validateFieldValue('false', { key: 'DEBUG', type: 'boolean', required: true })).toBeNull();
    expect(validateFieldValue('1', { key: 'DEBUG', type: 'boolean', required: true })).toBeNull();
    expect(validateFieldValue('0', { key: 'DEBUG', type: 'boolean', required: true })).toBeNull();
    expect(validateFieldValue('yes', { key: 'DEBUG', type: 'boolean', required: true })).toBeNull();
    expect(validateFieldValue('no', { key: 'DEBUG', type: 'boolean', required: true })).toBeNull();

    const invalid = validateFieldValue('maybe', { key: 'DEBUG', type: 'boolean', required: true });
    expect(invalid).not.toBeNull();
  });

  it('validates enum values', () => {
    const schema = {
      key: 'NODE_ENV',
      type: 'enum',
      enumValues: ['development', 'staging', 'production'],
      required: true
    };

    expect(validateFieldValue('production', schema)).toBeNull();

    const invalid = validateFieldValue('local_testing', schema);
    expect(invalid).not.toBeNull();
    expect(invalid?.message).toContain('not one of allowed enum values');
  });

  it('validates URLs and database connection URIs', () => {
    expect(validateFieldValue('https://example.com', { key: 'API_URL', type: 'url', required: true })).toBeNull();
    expect(validateFieldValue('postgres://user:pass@localhost:5432/db', { key: 'DB_URL', type: 'url', required: true })).toBeNull();
    expect(validateFieldValue('not-a-url', { key: 'API_URL', type: 'url', required: true })).not.toBeNull();
    expect(validateFieldValue('http://', { key: 'API_URL', type: 'url', required: true })).not.toBeNull();
  });

  it('validates email addresses', () => {
    expect(validateFieldValue('admin@example.com', { key: 'EMAIL', type: 'email', required: true })).toBeNull();
    expect(validateFieldValue('invalid-email', { key: 'EMAIL', type: 'email', required: true })).not.toBeNull();
  });

  it('validates IP addresses', () => {
    expect(validateFieldValue('192.168.1.1', { key: 'HOST_IP', type: 'ip', required: true })).toBeNull();
    expect(validateFieldValue('999.999.999.999', { key: 'HOST_IP', type: 'ip', required: true })).not.toBeNull();
  });

  it('validates JSON strings', () => {
    expect(validateFieldValue('{"enabled": true, "count": 5}', { key: 'CONFIG_JSON', type: 'json', required: true })).toBeNull();
    expect(validateFieldValue('{malformed: json}', { key: 'CONFIG_JSON', type: 'json', required: true })).not.toBeNull();
  });

  it('validates UUID strings', () => {
    expect(validateFieldValue('123e4567-e89b-12d3-a456-426614174000', { key: 'APP_ID', type: 'uuid', required: true })).toBeNull();
    expect(validateFieldValue('not-a-uuid', { key: 'APP_ID', type: 'uuid', required: true })).not.toBeNull();
  });

  it('validates custom pattern annotations', () => {
    const schema = {
      key: 'VERSION',
      type: 'string',
      pattern: '^v\\d+\\.\\d+$',
      required: true
    };

    expect(validateFieldValue('v1.2', schema)).toBeNull();
    expect(validateFieldValue('1.2', schema)).not.toBeNull();
  });

  it('handles empty and optional values properly', () => {
    // Required and empty -> error
    expect(validateFieldValue('', { key: 'REQUIRED_VAR', type: 'string', required: true })).not.toBeNull();

    // Optional and empty -> valid
    expect(validateFieldValue('', { key: 'OPTIONAL_VAR', type: 'string', required: false })).toBeNull();

    // Required with default value -> valid
    expect(validateFieldValue('', { key: 'DEFAULT_VAR', type: 'string', required: true, default: 'fallback' })).toBeNull();
  });
});
