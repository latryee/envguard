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

    const notNum = validateFieldValue('three_thousand', { key: 'PORT', type: 'port', required: true });
    expect(notNum).not.toBeNull();
  });

  it('validates boolean values', () => {
    expect(validateFieldValue('true', { key: 'DEBUG', type: 'boolean', required: true })).toBeNull();
    expect(validateFieldValue('false', { key: 'DEBUG', type: 'boolean', required: true })).toBeNull();
    expect(validateFieldValue('1', { key: 'DEBUG', type: 'boolean', required: true })).toBeNull();

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

  it('validates URLs and database strings', () => {
    expect(validateFieldValue('https://example.com', { key: 'API_URL', type: 'url', required: true })).toBeNull();
    expect(validateFieldValue('not-a-url', { key: 'API_URL', type: 'url', required: true })).not.toBeNull();
  });
});
