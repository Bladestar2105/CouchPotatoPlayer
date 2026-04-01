import { EPGProgram } from '../types';

// ⚡ Bolt Optimization: Binary search utility for O(log N) lookup of the
// current program in chronologically-sorted EPG arrays, avoiding costly O(N) linear scans.
export const findCurrentProgramIndex = (epg: EPGProgram[], time: Date): number => {
  if (!epg || epg.length === 0) return -1;

  let left = 0;
  let right = epg.length - 1;
  const timeMs = time.getTime();

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const program = epg[mid];
    const startMs = program.start;
    const endMs = program.end;

    if (startMs <= timeMs && endMs >= timeMs) {
      return mid;
    }

    if (startMs > timeMs) {
      right = mid - 1;
    } else {
      left = mid + 1;
    }
  }

  return -1;
};

export const findCurrentProgram = (epg: EPGProgram[], time: Date): EPGProgram | undefined => {
  const index = findCurrentProgramIndex(epg, time);
  return index !== -1 ? epg[index] : undefined;
};

export const isCatchupChannel = (channel: any): boolean => {
  if (!channel) return false;
  return (
    channel.tvArchive === 1 ||
    channel.tvArchive === '1' ||
    channel.tv_archive === 1 ||
    channel.tv_archive === '1' ||
    (channel.tvArchiveDuration != null && channel.tvArchiveDuration > 0) ||
    (channel.tv_archive_duration != null && channel.tv_archive_duration > 0)
  );
};
