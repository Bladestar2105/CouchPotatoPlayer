import { findCurrentProgram, findCurrentProgramIndex } from '../epgUtils';
import { EPGProgram } from '../../types';

describe('epgUtils', () => {
  const mockEpg: EPGProgram[] = [
    {
      id: '1',
      channelId: 'ch1',
      title: 'Program 1',
      description: 'Desc 1',
      start: new Date('2023-10-27T10:00:00Z'),
      end: new Date('2023-10-27T11:00:00Z'),
    },
    {
      id: '2',
      channelId: 'ch1',
      title: 'Program 2',
      description: 'Desc 2',
      start: new Date('2023-10-27T11:00:00Z'),
      end: new Date('2023-10-27T12:00:00Z'),
    },
    {
      id: '3',
      channelId: 'ch1',
      title: 'Program 3',
      description: 'Desc 3',
      start: new Date('2023-10-27T13:00:00Z'),
      end: new Date('2023-10-27T14:00:00Z'),
    },
  ];

  describe('findCurrentProgramIndex', () => {
    test('should return -1 for empty epg', () => {
      expect(findCurrentProgramIndex([], new Date())).toBe(-1);
    });

    test('should return -1 for null/undefined epg', () => {
      expect(findCurrentProgramIndex(null as any, new Date())).toBe(-1);
      expect(findCurrentProgramIndex(undefined as any, new Date())).toBe(-1);
    });

    test('should find program when time is in the middle', () => {
      const time = new Date('2023-10-27T10:30:00Z');
      expect(findCurrentProgramIndex(mockEpg, time)).toBe(0);
    });

    test('should find program at exact start time', () => {
      const time = new Date('2023-10-27T11:00:00Z');
      // Program 1 ends at 11:00 and Program 2 starts at 11:00.
      // Binary search might return either depending on implementation,
      // but findCurrentProgramIndex returns mid as soon as it matches.
      const index = findCurrentProgramIndex(mockEpg, time);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThanOrEqual(1);
    });

    test('should find program at exact end time', () => {
      const time = new Date('2023-10-27T12:00:00Z');
      expect(findCurrentProgramIndex(mockEpg, time)).toBe(1);
    });

    test('should return -1 when time is before all programs', () => {
      const time = new Date('2023-10-27T09:00:00Z');
      expect(findCurrentProgramIndex(mockEpg, time)).toBe(-1);
    });

    test('should return -1 when time is after all programs', () => {
      const time = new Date('2023-10-27T15:00:00Z');
      expect(findCurrentProgramIndex(mockEpg, time)).toBe(-1);
    });

    test('should return -1 when time is in a gap', () => {
      const time = new Date('2023-10-27T12:30:00Z');
      expect(findCurrentProgramIndex(mockEpg, time)).toBe(-1);
    });

    test('should find program in a larger list', () => {
      const largeEpg: EPGProgram[] = Array.from({ length: 100 }, (_, i) => ({
        id: String(i),
        channelId: 'ch1',
        title: `Program ${i}`,
        description: `Desc ${i}`,
        start: new Date(2023, 9, 27, i, 0, 0),
        end: new Date(2023, 9, 27, i, 59, 59),
      }));
      const time = new Date(2023, 9, 27, 50, 30, 0);
      expect(findCurrentProgramIndex(largeEpg, time)).toBe(50);
    });
  });

  describe('findCurrentProgram', () => {
    test('should return the program object when found', () => {
      const time = new Date('2023-10-27T10:30:00Z');
      expect(findCurrentProgram(mockEpg, time)).toEqual(mockEpg[0]);
    });

    test('should return undefined when not found', () => {
      const time = new Date('2023-10-27T12:30:00Z');
      expect(findCurrentProgram(mockEpg, time)).toBeUndefined();
    });
  });
});
