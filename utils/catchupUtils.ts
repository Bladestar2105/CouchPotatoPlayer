/**
 * Catchup/Archive URL Generation Utilities
 * 
 * Supports multiple catchup formats:
 * - Xtream Codes (xc)
 * - Flussonic (flussonic, flussonic-hls, flussonic-ts, flussonic-dash)
 * - Shift (shift)
 * - Archive (archive)
 * - Timeshift (timeshift)
 * - Default (append)
 */

import { Channel } from '../types';

export type CatchupType = 
  | 'xc' 
  | 'flussonic' 
  | 'flussonic-hls' 
  | 'flussonic-ts' 
  | 'flussonic-dash' 
  | 'shift' 
  | 'archive' 
  | 'timeshift' 
  | 'append' 
  | 'default';

export interface CatchupConfig {
  type: CatchupType;
  days?: number;
  source?: string; // Custom catchup source URL
}

/**
 * Generate catchup URL for a channel at a specific time
 */
export const generateCatchupUrl = (
  channel: Channel,
  startTime: Date,
  endTime: Date,
  serverUrl: string,
  username: string,
  password: string,
  config?: CatchupConfig
): string | null => {
  if (!hasCatchupSupport(channel)) {
    return null;
  }

  const catchupType = config?.type || 'xc';
  const startUnix = Math.floor(startTime.getTime() / 1000);
  const endUnix = Math.floor(endTime.getTime() / 1000);
  const nowUnix = Math.floor(Date.now() / 1000);
  const duration = endUnix - startUnix;

  const cleanServerUrl = serverUrl.trim().replace(/\/+$/, '');

  switch (catchupType) {
    case 'xc':
      // Xtream Codes format: /timeshift/{start}/{end}/{streamId}.ts
      return `${cleanServerUrl}/timeshift/${startUnix}/${endUnix}/${channel.streamId}.ts`;

    case 'flussonic':
    case 'flussonic-hls':
      // Flussonic HLS: index-{start}-{end}.m3u8
      return `${channel.url}?utc=${startUnix}&lutc=${nowUnix}`;

    case 'flussonic-ts':
      // Flussonic MPEG-TS
      return `${channel.url}?utc=${startUnix}&lutc=${nowUnix}`;

    case 'shift':
      // Shift format: ?utc={start}&lutc={now}
      return `${channel.url}?utc=${startUnix}&lutc=${nowUnix}`;

    case 'archive':
      // Archive format: ?archive={start}&archive_end={end}
      return `${channel.url}?archive=${startUnix}&archive_end=${endUnix}`;

    case 'timeshift':
      // Timeshift format: timeshift={start}&timenow={now}
      return `${channel.url}?timeshift=${startUnix}&timenow=${nowUnix}`;

    case 'append':
      // Append format: append duration to URL
      if (config?.source) {
        return channel.url + config.source
          .replace('${start}', String(startUnix))
          .replace('${end}', String(endUnix))
          .replace('${duration}', String(duration))
          .replace('${timestamp}', String(nowUnix));
      }
      return null;

    case 'default':
    default:
      // Default Xtream Codes timeshift
      return `${cleanServerUrl}/timeshift/${encodeURIComponent(username)}/${encodeURIComponent(password)}/${startUnix}/${endUnix}/${channel.streamId}.ts`;
  }
};

/**
 * Check if a channel supports catchup/archive
 */
export const hasCatchupSupport = (channel: Channel): boolean => {
  return (
    (String(channel.tvArchive) === '1') ||
    (channel.catchupDays !== undefined && Number(channel.catchupDays) > 0) ||
    (channel.tvArchiveDuration !== undefined && Number(channel.tvArchiveDuration) > 0)
  );
};

/**
 * Get the number of days catchup is available
 */
export const getCatchupDays = (channel: Channel): number => {
  if (channel.catchupDays) return channel.catchupDays;
  if (channel.tvArchiveDuration) return Math.floor(channel.tvArchiveDuration / 24);
  return 0;
};

/**
 * Check if a program is within catchup range
 */
export const isProgramCatchupAvailable = (
  channel: Channel,
  programStart: Date,
  programEnd: Date
): boolean => {
  if (!hasCatchupSupport(channel)) return false;

  const catchupDays = getCatchupDays(channel);
  if (catchupDays === 0) return false;

  const now = new Date();
  const catchupStart = new Date(now.getTime() - catchupDays * 24 * 60 * 60 * 1000);

  // Program must have ended and be within catchup window
  return programEnd <= now && programStart >= catchupStart;
};

/**
 * Generate ISO8601 time format for catchup URLs
 */
export const formatCatchupTime = (date: Date, format: 'iso' | 'unix' = 'unix'): string => {
  if (format === 'iso') {
    return date.toISOString();
  }
  return String(Math.floor(date.getTime() / 1000));
};