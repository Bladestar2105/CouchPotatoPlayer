import { ParsedProgram } from '../../types/iptv';
import { findCurrentProgramIndex, findProgramsInRange } from '../xmltv';

function findCurrentProgramLinear(epg: ParsedProgram[], nowMs: number): number {
  return epg.findIndex(p => p.start <= nowMs && p.end > nowMs);
}

describe('EPG Lookup Utilities', () => {
  const channelCount = 100;
  const programsPerChannel = 500;
  const epgData: Record<string, ParsedProgram[]> = {};

  // Setup mock data
  for (let i = 0; i < channelCount; i++) {
    const programs: ParsedProgram[] = [];
    let currentTime = Date.now() - (programsPerChannel / 2) * 3600000;
    for (let j = 0; j < programsPerChannel; j++) {
      programs.push({
        start: currentTime,
        end: currentTime + 3600000,
        title_raw: `Program ${j}`,
        description_raw: `Description ${j}`,
        has_archive: 0,
      });
      currentTime += 3600000;
    }
    epgData[`channel_${i}`] = programs;
  }

  const nowMs = Date.now();

  test('Linear Search Performance', () => {
    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      for (let j = 0; j < channelCount; j++) {
        findCurrentProgramLinear(epgData[`channel_${j}`], nowMs);
      }
    }
    const end = performance.now();
    console.log(`Linear Search took: ${end - start}ms`);
  });

  test('Binary Search Performance', () => {
    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      for (let j = 0; j < channelCount; j++) {
        findCurrentProgramBinary(epgData[`channel_${j}`], nowMs);
      }
    }
    const end = performance.now();
    console.log(`Binary Search took: ${end - start}ms`);
  });

  test('findCurrentProgramIndex Correctness', () => {
    for (let j = 0; j < channelCount; j++) {
      const epg = epgData[`channel_${j}`];
      const linearIdx = findCurrentProgramLinear(epg, nowMs);
      const binaryIdx = findCurrentProgramIndex(epg, nowMs);
      expect(binaryIdx).toBe(linearIdx);
    }
  });

  test('findProgramsInRange Correctness', () => {
    const timelineStart = nowMs - 30 * 60000;
    const timelineEnd = timelineStart + 6 * 3600000;

    for (let j = 0; j < channelCount; j++) {
      const epg = epgData[`channel_${j}`];
      const filtered = epg.filter(p => p.end > timelineStart && p.start < timelineEnd);
      const inRange = findProgramsInRange(epg, timelineStart, timelineEnd);

      expect(inRange.length).toBe(filtered.length);
      for (let k = 0; k < filtered.length; k++) {
        expect(inRange[k]).toEqual(filtered[k]);
      }
    }
  });
});
