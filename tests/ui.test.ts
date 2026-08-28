import { describe, it, expect, vi } from 'vitest';
import { getBanner, formatHeader } from '../src/cli/ui/banners.js';
import { renderDiffTable } from '../src/cli/ui/table.js';
import { Logger } from '../src/cli/ui/logger.js';

describe('UI Utilities', () => {
  it('renders ASCII banner and header', () => {
    const banner = getBanner('1.0.0');
    expect(banner).toContain('v1.0.0');
    expect(banner).toContain('Zero-Config Git Secret Leaks');

    const header = formatHeader('Variables', 3);
    expect(header).toContain('Variables');
    expect(header).toContain('3');
  });

  it('renders diff table with columns', () => {
    const empty = renderDiffTable([]);
    expect(empty).toBe('');

    const table = renderDiffTable([
      { key: 'PORT', status: 'Missing', expected: '3000', actual: 'None', location: 'src/index.ts:10' }
    ]);
    expect(table).toContain('PORT');
    expect(table).toContain('Missing');
    expect(table).toContain('3000');
    expect(table).toContain('src/index.ts:10');
  });

  it('handles logger output modes (normal, verbose, quiet)', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      const normalLogger = new Logger({ verbose: true, quiet: false });
      normalLogger.log('test log');
      normalLogger.info('test info');
      normalLogger.success('test success');
      normalLogger.warn('test warn');
      normalLogger.error('test error');
      normalLogger.debug('test debug');
      normalLogger.blank();

      expect(consoleSpy).toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalled();

      consoleSpy.mockClear();
      const quietLogger = new Logger({ quiet: true });
      quietLogger.log('silent');
      quietLogger.info('silent');
      quietLogger.success('silent');
      quietLogger.debug('silent');
      quietLogger.blank();

      expect(consoleSpy).not.toHaveBeenCalled();
    } finally {
      consoleSpy.mockRestore();
      errorSpy.mockRestore();
      warnSpy.mockRestore();
    }
  });
});
