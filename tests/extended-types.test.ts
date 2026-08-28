import { describe, it, expect } from 'vitest';
import {
  inferType,
  isCronExpression,
  createSchemaFromAnnotations,
  validateFieldValue,
  parseAnnotations
} from '../src/index.js';

describe('Extended Semantic Types & Custom Validators', () => {
  describe('Duration Type', () => {
    it('infers duration type accurately', () => {
      expect(inferType('30s')).toBe('duration');
      expect(inferType('5m')).toBe('duration');
      expect(inferType('1h')).toBe('duration');
      expect(inferType('2d')).toBe('duration');
      expect(inferType('500ms')).toBe('duration');
      expect(inferType('1.5h')).toBe('duration');
    });

    it('validates duration format correctly', () => {
      const schema = createSchemaFromAnnotations('CACHE_TTL', { type: 'duration', required: true });
      expect(validateFieldValue('30s', schema)).toBeNull();
      expect(validateFieldValue('5m', schema)).toBeNull();
      expect(validateFieldValue('500ms', schema)).toBeNull();

      const error = validateFieldValue('invalid_time', schema);
      expect(error).not.toBeNull();
      expect(error?.expectedType).toContain('duration');
    });
  });

  describe('Cron Type', () => {
    it('infers and checks cron expressions and macros', () => {
      expect(isCronExpression('0 0 * * *')).toBe(true);
      expect(isCronExpression('*/15 * * * *')).toBe(true);
      expect(isCronExpression('0 12 * * 1-5')).toBe(true);
      expect(isCronExpression('@daily')).toBe(true);
      expect(isCronExpression('@hourly')).toBe(true);
      expect(isCronExpression('invalid cron expression')).toBe(false);

      expect(inferType('0 0 * * *')).toBe('cron');
      expect(inferType('@daily')).toBe('cron');
    });

    it('validates cron schema properly', () => {
      const schema = createSchemaFromAnnotations('CRON_SCHEDULE', { type: 'cron', required: true });
      expect(validateFieldValue('0 0 * * *', schema)).toBeNull();
      expect(validateFieldValue('@hourly', schema)).toBeNull();

      const error = validateFieldValue('not a cron', schema);
      expect(error).not.toBeNull();
      expect(error?.expectedType).toContain('cron');
    });
  });

  describe('Semver Type', () => {
    it('infers semver type', () => {
      expect(inferType('1.0.0')).toBe('semver');
      expect(inferType('v2.1.3')).toBe('semver');
      expect(inferType('0.1.0-alpha.1')).toBe('semver');
    });

    it('validates semver schema properly', () => {
      const schema = createSchemaFromAnnotations('APP_VERSION', { type: 'semver', required: true });
      expect(validateFieldValue('1.0.0', schema)).toBeNull();
      expect(validateFieldValue('v2.1.3', schema)).toBeNull();

      const error = validateFieldValue('release-1', schema);
      expect(error).not.toBeNull();
      expect(error?.expectedType).toContain('semver');
    });
  });

  describe('Hostname Type', () => {
    it('infers and validates hostname', () => {
      expect(inferType('localhost')).toBe('hostname');
      expect(inferType('api.example.com')).toBe('hostname');
      expect(inferType('db.internal.net')).toBe('hostname');

      const schema = createSchemaFromAnnotations('DB_HOST', { type: 'hostname', required: true });
      expect(validateFieldValue('localhost', schema)).toBeNull();
      expect(validateFieldValue('api.example.com', schema)).toBeNull();

      const error = validateFieldValue('http://api.example.com/path', schema);
      expect(error).not.toBeNull();
      expect(error?.expectedType).toContain('hostname');
    });
  });

  describe('Custom Regex Pattern Annotation', () => {
    it('parses @type regex(...) and validates against pattern', () => {
      const annotations = parseAnnotations('# @type regex(^[a-z0-9-]+$) @required');
      expect(annotations.type).toBe('regex');
      expect(annotations.pattern).toBe('^[a-z0-9-]+$');

      const schema = createSchemaFromAnnotations('SLUG', annotations);
      expect(validateFieldValue('valid-slug-123', schema)).toBeNull();

      const error = validateFieldValue('INVALID SLUG!', schema);
      expect(error).not.toBeNull();
      expect(error?.expectedType).toContain('pattern');
    });
  });
});
