import { describe, test, expect, setSystemTime, beforeAll, afterAll } from "bun:test";
import { hasCatchupSupport, getCatchupDays, isProgramCatchupAvailable } from '../catchupUtils';
import { Channel } from '../../types';

describe('catchupUtils', () => {
  const mockChannel: Channel = {
    id: '1',
    name: 'Test Channel',
    url: 'http://test.com/stream',
    group: 'Test Group',
  };

  describe('hasCatchupSupport', () => {
    test('should return true if tvArchive is 1', () => {
      expect(hasCatchupSupport({ ...mockChannel, tvArchive: 1 })).toBe(true);
    });

    test('should return true if catchupDays > 0', () => {
      expect(hasCatchupSupport({ ...mockChannel, catchupDays: 7 })).toBe(true);
    });

    test('should return true if tvArchiveDuration > 0', () => {
      expect(hasCatchupSupport({ ...mockChannel, tvArchiveDuration: 48 })).toBe(true);
    });

    test('should return false if no catchup fields are present', () => {
      expect(hasCatchupSupport(mockChannel)).toBe(false);
    });

    test('should return false if catchup fields are 0 or undefined', () => {
      expect(hasCatchupSupport({ ...mockChannel, tvArchive: 0, catchupDays: 0, tvArchiveDuration: 0 })).toBe(false);
    });
  });

  describe('getCatchupDays', () => {
    test('should return catchupDays if present', () => {
      expect(getCatchupDays({ ...mockChannel, catchupDays: 14, tvArchiveDuration: 48 })).toBe(14);
    });

    test('should calculate days from tvArchiveDuration if catchupDays is missing', () => {
      expect(getCatchupDays({ ...mockChannel, tvArchiveDuration: 72 })).toBe(3);
    });

    test('should return 0 if both are missing', () => {
      expect(getCatchupDays(mockChannel)).toBe(0);
    });

    test('should ignore catchupDays if 0 and use tvArchiveDuration', () => {
      expect(getCatchupDays({ ...mockChannel, catchupDays: 0, tvArchiveDuration: 48 })).toBe(2);
    });

    test('should round down partial days from tvArchiveDuration', () => {
      expect(getCatchupDays({ ...mockChannel, tvArchiveDuration: 50 })).toBe(2);
    });

    test('should return 0 if both fields are 0', () => {
      expect(getCatchupDays({ ...mockChannel, catchupDays: 0, tvArchiveDuration: 0 })).toBe(0);
    });
  });

  describe('isProgramCatchupAvailable', () => {
    const now = new Date('2023-11-01T12:00:00Z');

    beforeAll(() => {
      setSystemTime(now);
    });

    afterAll(() => {
      setSystemTime(); // Reset
    });

    test('should return true if program is within catchup window and ended', () => {
      const channel = { ...mockChannel, catchupDays: 3 };
      const start = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 1 day ago
      const end = new Date(now.getTime() - 23 * 60 * 60 * 1000);   // 23 hours ago
      expect(isProgramCatchupAvailable(channel, start, end)).toBe(true);
    });

    test('should return true if program starts exactly at the beginning of window', () => {
      const channel = { ...mockChannel, catchupDays: 3 };
      const start = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
      const end = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000 + 3600000);
      expect(isProgramCatchupAvailable(channel, start, end)).toBe(true);
    });

    test('should return true if program ends exactly now', () => {
      const channel = { ...mockChannel, catchupDays: 3 };
      const start = new Date(now.getTime() - 3600000);
      const end = now;
      expect(isProgramCatchupAvailable(channel, start, end)).toBe(true);
    });

    test('should return false if channel has no catchup support', () => {
      const start = new Date(now.getTime() - 3600000);
      const end = now;
      expect(isProgramCatchupAvailable(mockChannel, start, end)).toBe(false);
    });

    test('should return false if program ends in the future', () => {
      const channel = { ...mockChannel, catchupDays: 3 };
      const start = new Date(now.getTime() - 3600000);
      const end = new Date(now.getTime() + 60000); // 1 minute in future
      expect(isProgramCatchupAvailable(channel, start, end)).toBe(false);
    });

    test('should return false if program started before window', () => {
      const channel = { ...mockChannel, catchupDays: 3 };
      const start = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000 - 60000); // 1 min before window
      const end = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
      expect(isProgramCatchupAvailable(channel, start, end)).toBe(false);
    });
  });
});
