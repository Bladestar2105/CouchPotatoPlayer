import { describe, test, expect, setSystemTime, beforeAll, afterAll } from "bun:test";
import { hasCatchupSupport, getCatchupDays, isProgramCatchupAvailable, formatCatchupTime, generateCatchupUrl } from '../catchupUtils';
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


    test('should return true if tvArchive is string "1"', () => {
      expect(hasCatchupSupport({ ...mockChannel, tvArchive: '1' as any })).toBe(true);
    });

    test('should return true if catchupDays is a string > 0', () => {
      expect(hasCatchupSupport({ ...mockChannel, catchupDays: '7' as any })).toBe(true);
    });

    test('should return true if tvArchiveDuration is a string > 0', () => {
      expect(hasCatchupSupport({ ...mockChannel, tvArchiveDuration: '48' as any })).toBe(true);
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

  describe('formatCatchupTime', () => {
    const testDate = new Date('2023-11-01T12:00:00.000Z');

    test('should return ISO8601 format when format is iso', () => {
      expect(formatCatchupTime(testDate, 'iso')).toBe('2023-11-01T12:00:00.000Z');
    });

    test('should return Unix timestamp string when format is unix', () => {
      // 2023-11-01T12:00:00Z -> 1698840000
      expect(formatCatchupTime(testDate, 'unix')).toBe('1698840000');
    });

    test('should return Unix timestamp string by default', () => {
      expect(formatCatchupTime(testDate)).toBe('1698840000');
    });
  });

  describe('generateCatchupUrl', () => {
    const channelWithCatchup = {
      ...mockChannel,
      tvArchive: 1,
      streamId: '12345'
    };

    const channelWithoutCatchup = {
      ...mockChannel,
      tvArchive: 0,
      catchupDays: 0,
      tvArchiveDuration: 0,
      streamId: '12345'
    };

    const startTime = new Date('2023-11-01T12:00:00Z');
    const endTime = new Date('2023-11-01T13:00:00Z');
    const serverUrl = 'http://test-server.com/';
    const username = 'testuser';
    const password = 'testpassword';

    const startUnix = Math.floor(startTime.getTime() / 1000);
    const endUnix = Math.floor(endTime.getTime() / 1000);
    const duration = endUnix - startUnix;

    test('should return null if channel has no catchup support', () => {
      expect(generateCatchupUrl(channelWithoutCatchup, startTime, endTime, serverUrl, username, password)).toBeNull();
    });

    test('should return xc format by default if config is not provided', () => {
      const durationMinutes = Math.ceil(duration / 60);
      const url = generateCatchupUrl(channelWithCatchup, startTime, endTime, serverUrl, username, password);
      expect(url).toBe(`http://test-server.com/timeshift/${username}/${password}/${durationMinutes}/2023-11-01:12-00/12345.ts`);
    });

    test('should return xc format', () => {
      const durationMinutes = Math.ceil(duration / 60);
      const url = generateCatchupUrl(channelWithCatchup, startTime, endTime, serverUrl, username, password, { type: 'xc' });
      expect(url).toBe(`http://test-server.com/timeshift/${username}/${password}/${durationMinutes}/2023-11-01:12-00/12345.ts`);
    });

    test('should return flussonic format', () => {
      const url = generateCatchupUrl(channelWithCatchup, startTime, endTime, serverUrl, username, password, { type: 'flussonic' });
      const nowUnix = Math.floor(Date.now() / 1000);
      expect(url?.startsWith(`http://test.com/stream?utc=${startUnix}&lutc=`)).toBe(true);
    });

    test('should return flussonic-hls format', () => {
      const url = generateCatchupUrl(channelWithCatchup, startTime, endTime, serverUrl, username, password, { type: 'flussonic-hls' });
      expect(url?.startsWith(`http://test.com/stream?utc=${startUnix}&lutc=`)).toBe(true);
    });

    test('should return flussonic-ts format', () => {
      const url = generateCatchupUrl(channelWithCatchup, startTime, endTime, serverUrl, username, password, { type: 'flussonic-ts' });
      expect(url?.startsWith(`http://test.com/stream?utc=${startUnix}&lutc=`)).toBe(true);
    });

    test('should return shift format', () => {
      const url = generateCatchupUrl(channelWithCatchup, startTime, endTime, serverUrl, username, password, { type: 'shift' });
      expect(url?.startsWith(`http://test.com/stream?utc=${startUnix}&lutc=`)).toBe(true);
    });

    test('should return archive format', () => {
      const url = generateCatchupUrl(channelWithCatchup, startTime, endTime, serverUrl, username, password, { type: 'archive' });
      expect(url).toBe(`http://test.com/stream?archive=${startUnix}&archive_end=${endUnix}`);
    });

    test('should return timeshift format', () => {
      const url = generateCatchupUrl(channelWithCatchup, startTime, endTime, serverUrl, username, password, { type: 'timeshift' });
      expect(url?.startsWith(`http://test.com/stream?timeshift=${startUnix}&timenow=`)).toBe(true);
    });

    test('should return append format with custom source', () => {
      const durationMinutes = Math.ceil(duration / 60);
      const url = generateCatchupUrl(channelWithCatchup, startTime, endTime, serverUrl, username, password, {
        type: 'append',
        source: '?start=${start}&end=${end}&dur=${duration}&now=${timestamp}'
      });
      expect(url?.startsWith(`http://test.com/stream?start=${startUnix}&end=${endUnix}&dur=${durationMinutes}&now=`)).toBe(true);
    });

    test('should return null for append format if source is missing', () => {
      const url = generateCatchupUrl(channelWithCatchup, startTime, endTime, serverUrl, username, password, { type: 'append' });
      expect(url).toBeNull();
    });

    test('should return default format', () => {
      const durationMinutes = Math.ceil(duration / 60);
      const url = generateCatchupUrl(channelWithCatchup, startTime, endTime, serverUrl, username, password, { type: 'default' });
      expect(url).toBe(`http://test-server.com/timeshift/${username}/${password}/${durationMinutes}/2023-11-01:12-00/12345.ts`);
    });
  });
});
