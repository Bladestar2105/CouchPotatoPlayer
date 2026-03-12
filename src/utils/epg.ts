import { LiveChannel, ParsedProgram } from '../types/iptv';
import { findCurrentProgramIndex } from '../services/xmltv';

/**
 * Generates the EPG lookup key for a given channel.
 * For M3U, it strictly uses the epg_channel_id.
 * For Xtream, it falls back from epg_channel_id to stream_id.
 */
export const getEpgKey = (channel: LiveChannel, configType?: 'xtream' | 'm3u'): string => {
  if (configType === 'm3u') {
    return channel.epg_channel_id || '';
  }
  return channel.epg_channel_id || channel.stream_id?.toString() || '';
};

/**
 * Finds the currently airing program from an EPG array.
 */
export const getCurrentProgram = (
  epg: ParsedProgram[] | undefined,
  nowMs: number = Date.now()
): ParsedProgram | null => {
  if (!epg || epg.length === 0) return null;
  // ⚡ Bolt Optimization: Replace O(N) Array.findIndex with O(log N) binary search
  // Performance improvement: Drastically reduces lookup time in hot render loops,
  // preventing frame drops when displaying currently airing programs across large channel lists.
  const idx = findCurrentProgramIndex(epg, nowMs);
  return idx !== -1 ? epg[idx] : null;
};
