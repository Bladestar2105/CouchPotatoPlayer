import { describe, test, expect, spyOn, afterEach, beforeEach } from './bunTestCompat';
import Logger from '../logger';

describe('Logger', () => {
  let originalDev: any;

  beforeEach(() => {
    // Save the original value
    originalDev = (globalThis as any).__DEV__;
  });

  afterEach(() => {
    // Restore the original value and restore mocks
    (globalThis as any).__DEV__ = originalDev;
    // clear all mocks after each test
  });

  describe('when __DEV__ is true', () => {
    beforeEach(() => {
      (globalThis as any).__DEV__ = true;
    });

    test('should call console.log when Logger.log is called', () => {
      const logSpy = spyOn(console, 'log').mockImplementation(() => {});
      Logger.log('test message', 123);
      expect(logSpy).toHaveBeenCalledWith('test message', 123);
      logSpy.mockRestore();
    });

    test('should call console.info when Logger.info is called', () => {
      const infoSpy = spyOn(console, 'info').mockImplementation(() => {});
      Logger.info('info message', 123);
      expect(infoSpy).toHaveBeenCalledWith('info message', 123);
      infoSpy.mockRestore();
    });

    test('should call console.debug when Logger.debug is called', () => {
      const debugSpy = spyOn(console, 'debug').mockImplementation(() => {});
      Logger.debug('debug message', 123);
      expect(debugSpy).toHaveBeenCalledWith('debug message', 123);
      debugSpy.mockRestore();
    });

    test('should call console.warn when Logger.warn is called', () => {
      const warnSpy = spyOn(console, 'warn').mockImplementation(() => {});
      Logger.warn('warn message', 123);
      expect(warnSpy).toHaveBeenCalledWith('warn message', 123);
      warnSpy.mockRestore();
    });

    test('should call console.error when Logger.error is called', () => {
      const errorSpy = spyOn(console, 'error').mockImplementation(() => {});
      Logger.error('error message', 123);
      expect(errorSpy).toHaveBeenCalledWith('error message', 123);
      errorSpy.mockRestore();
    });
  });

  describe('when __DEV__ is false', () => {
    beforeEach(() => {
      (globalThis as any).__DEV__ = false;
    });

    test('should NOT call console.log when Logger.log is called', () => {
      const logSpy = spyOn(console, 'log').mockImplementation(() => {});
      Logger.log('test message', 123);
      expect(logSpy).not.toHaveBeenCalled();
      logSpy.mockRestore();
    });

    test('should NOT call console.info when Logger.info is called', () => {
      const infoSpy = spyOn(console, 'info').mockImplementation(() => {});
      Logger.info('info message', 123);
      expect(infoSpy).not.toHaveBeenCalled();
      infoSpy.mockRestore();
    });

    test('should NOT call console.debug when Logger.debug is called', () => {
      const debugSpy = spyOn(console, 'debug').mockImplementation(() => {});
      Logger.debug('debug message', 123);
      expect(debugSpy).not.toHaveBeenCalled();
      debugSpy.mockRestore();
    });

    test('should call console.warn when Logger.warn is called', () => {
      const warnSpy = spyOn(console, 'warn').mockImplementation(() => {});
      Logger.warn('warn message', 123);
      expect(warnSpy).toHaveBeenCalledWith('warn message', 123);
      warnSpy.mockRestore();
    });

    test('should call console.error when Logger.error is called', () => {
      const errorSpy = spyOn(console, 'error').mockImplementation(() => {});
      Logger.error('error message', 123);
      expect(errorSpy).toHaveBeenCalledWith('error message', 123);
      errorSpy.mockRestore();
    });
  });

  describe('credential sanitization (warn + error)', () => {
    beforeEach(() => {
      (globalThis as any).__DEV__ = true;
    });

    test('scrubs username / password query parameters from string arguments to warn', () => {
      const warnSpy = spyOn(console, 'warn').mockImplementation(() => {});
      Logger.warn('fetch failed:', 'http://iptv.example/player_api.php?username=alice&password=secret');
      expect(warnSpy).toHaveBeenCalledWith(
        'fetch failed:',
        expect.stringMatching(/username=\*\*\*/),
      );
      expect(warnSpy).toHaveBeenCalledWith(
        'fetch failed:',
        expect.stringMatching(/password=\*\*\*/),
      );
      expect(warnSpy).toHaveBeenCalledWith(
        'fetch failed:',
        expect.not.stringMatching(/alice|secret/),
      );
      warnSpy.mockRestore();
    });

    test('scrubs message + stack when an Error instance is passed to error', () => {
      const errorSpy = spyOn(console, 'error').mockImplementation(() => {});
      const err = new Error(
        'Request failed: http://iptv.example/live/alice/secret/123.ts',
      );
      err.stack = `Error\n  at GET http://iptv.example/live/alice/secret/123.ts`;
      Logger.error('playback:', err);
      const [, forwarded] = errorSpy.mock.calls[0];
      expect(forwarded).toBeInstanceOf(Error);
      expect((forwarded as Error).message).not.toMatch(/alice|secret/);
      expect((forwarded as Error).stack ?? '').not.toMatch(/alice|secret/);
      // Original error is untouched: the sanitizer returns a fresh Error instance.
      expect(err.message).toMatch(/alice/);
      errorSpy.mockRestore();
    });

    test('leaves non-URL strings and primitive values unchanged', () => {
      const errorSpy = spyOn(console, 'error').mockImplementation(() => {});
      Logger.error('simple message', 42, true);
      expect(errorSpy).toHaveBeenCalledWith('simple message', 42, true);
      errorSpy.mockRestore();
    });

    test('log / info / debug pass through WITHOUT sanitization', () => {
      // Only warn and error sanitize. The non-sanitized channels are reserved
      // for dev-only diagnostics where credential leakage is out of scope.
      const logSpy = spyOn(console, 'log').mockImplementation(() => {});
      const creds = 'http://iptv.example?username=alice&password=secret';
      Logger.log('dev diag:', creds);
      expect(logSpy).toHaveBeenCalledWith('dev diag:', creds);
      logSpy.mockRestore();
    });
  });

  describe('when __DEV__ is undefined', () => {
    beforeEach(() => {
      (globalThis as any).__DEV__ = undefined;
    });

    test('should NOT call console.log when Logger.log is called', () => {
      const logSpy = spyOn(console, 'log').mockImplementation(() => {});
      Logger.log('test message', 123);
      expect(logSpy).not.toHaveBeenCalled();
      logSpy.mockRestore();
    });

    test('should NOT call console.info when Logger.info is called', () => {
      const infoSpy = spyOn(console, 'info').mockImplementation(() => {});
      Logger.info('info message', 123);
      expect(infoSpy).not.toHaveBeenCalled();
      infoSpy.mockRestore();
    });

    test('should NOT call console.debug when Logger.debug is called', () => {
      const debugSpy = spyOn(console, 'debug').mockImplementation(() => {});
      Logger.debug('debug message', 123);
      expect(debugSpy).not.toHaveBeenCalled();
      debugSpy.mockRestore();
    });

    test('should call console.warn when Logger.warn is called', () => {
      const warnSpy = spyOn(console, 'warn').mockImplementation(() => {});
      Logger.warn('warn message', 123);
      expect(warnSpy).toHaveBeenCalledWith('warn message', 123);
      warnSpy.mockRestore();
    });

    test('should call console.error when Logger.error is called', () => {
      const errorSpy = spyOn(console, 'error').mockImplementation(() => {});
      Logger.error('error message', 123);
      expect(errorSpy).toHaveBeenCalledWith('error message', 123);
      errorSpy.mockRestore();
    });
  });
});
