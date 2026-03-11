/**
 * Streaming Configuration Utility
 * 
 * Generates optimized buffer configs and player settings based on:
 * - Stream type (live vs VOD/series)
 * - User's quality preferences
 * - Platform capabilities
 */

import { Platform } from 'react-native';
import {
  StreamingSettings,
  QUALITY_BITRATE_MAP,
  BUFFER_MULTIPLIER_MAP,
  VideoQualityPreset,
  BufferSizePreset,
} from '../types/iptv';
import { isTV } from './platform';

// ── Base Buffer Configurations ─────────────────────────────────────

interface LiveBufferSubConfig {
  targetOffsetMs: number;
  maxOffsetMs: number;
  minOffsetMs: number;
  maxPlaybackSpeed: number;
  minPlaybackSpeed: number;
}

interface BufferConfig {
  minBufferMs: number;
  maxBufferMs: number;
  bufferForPlaybackMs: number;
  bufferForPlaybackAfterRebufferMs: number;
  backBufferDurationMs: number;
  cacheSizeMB: number;
  live?: LiveBufferSubConfig;
}

const LIVE_BUFFER_BASE: BufferConfig = {
  minBufferMs: 10000,            // 10s min buffer
  maxBufferMs: 30000,            // 30s max buffer
  bufferForPlaybackMs: 1500,     // 1.5s to start playback (stable start)
  bufferForPlaybackAfterRebufferMs: 3000, // 3s after rebuffer
  backBufferDurationMs: 30000,   // 30s back buffer for rewind
  cacheSizeMB: 50,               // 50MB disk cache
  live: {
    targetOffsetMs: 5000,        // 5s behind live (good compromise)
    maxOffsetMs: 15000,          // Max 15s behind live
    minOffsetMs: 2000,           // Min 2s behind live
    maxPlaybackSpeed: 1.04,      // Slightly speed up to catch up
    minPlaybackSpeed: 0.96,      // Slightly slow down if too close
  },
};

const VOD_BUFFER_BASE: BufferConfig = {
  minBufferMs: 15000,            // 15s min buffer
  maxBufferMs: 60000,            // 60s max buffer – longer pre-buffering
  bufferForPlaybackMs: 2500,     // 2.5s to start – clean beginning
  bufferForPlaybackAfterRebufferMs: 5000, // 5s after rebuffer
  backBufferDurationMs: 120000,  // 2 minutes back buffer
  cacheSizeMB: 200,              // 200MB disk cache for movies
};

// TV devices typically have more memory and stable network
const TV_BUFFER_BOOST = 1.5;

// ── Public API ─────────────────────────────────────────────────────

export interface PlayerStreamConfig {
  bufferConfig: BufferConfig;
  maxBitRate: number;
  viewType: 'surfaceView' | 'textureView';
  disableDisconnectError: boolean;
  minLoadRetryCount: number;
  hideShutterView: boolean;
  shutterColor: string;
}

/**
 * Generate optimized player configuration for a given stream type and user settings.
 */
export function getPlayerConfig(
  streamType: 'live' | 'vod' | 'series',
  settings: StreamingSettings
): PlayerStreamConfig {
  const isLive = streamType === 'live';
  const baseBuffer = isLive ? { ...LIVE_BUFFER_BASE } : { ...VOD_BUFFER_BASE };
  
  // Apply buffer size multiplier
  const multiplier = BUFFER_MULTIPLIER_MAP[settings.bufferSize];
  const tvBoost = isTV ? TV_BUFFER_BOOST : 1;
  const totalMultiplier = multiplier * tvBoost;

  const bufferConfig: BufferConfig = {
    minBufferMs: Math.round(baseBuffer.minBufferMs * totalMultiplier),
    maxBufferMs: Math.round(baseBuffer.maxBufferMs * totalMultiplier),
    bufferForPlaybackMs: baseBuffer.bufferForPlaybackMs, // Don't multiply start time
    bufferForPlaybackAfterRebufferMs: Math.round(baseBuffer.bufferForPlaybackAfterRebufferMs * Math.min(totalMultiplier, 2)),
    backBufferDurationMs: Math.round(baseBuffer.backBufferDurationMs * totalMultiplier),
    cacheSizeMB: Math.round(baseBuffer.cacheSizeMB * totalMultiplier),
  };

  // Add live-specific sub-config
  if (isLive && LIVE_BUFFER_BASE.live) {
    bufferConfig.live = { ...LIVE_BUFFER_BASE.live };
    // For larger buffers, allow more offset
    if (multiplier > 1) {
      bufferConfig.live.maxOffsetMs = Math.round(LIVE_BUFFER_BASE.live.maxOffsetMs * multiplier);
      bufferConfig.live.targetOffsetMs = Math.round(LIVE_BUFFER_BASE.live.targetOffsetMs * Math.min(multiplier, 2));
    }
  }

  // Bitrate limit
  const maxBitRate = QUALITY_BITRATE_MAP[settings.videoQuality];

  // View type (only affects Android)
  const viewType = settings.viewType;

  return {
    bufferConfig,
    maxBitRate,
    viewType,
    disableDisconnectError: true,   // Keep buffering on network loss
    minLoadRetryCount: 5,           // 5 retries on transient failures
    hideShutterView: true,          // No black flash between streams
    shutterColor: 'transparent',    // Transparent fallback
  };
}

/**
 * Determine the best stream extension for the current platform and stream type.
 * Prefers HLS (m3u8) for adaptive bitrate on all platforms.
 */
export function getOptimalExtension(
  streamType: 'live' | 'vod' | 'series',
  currentExtension?: string
): string {
  if (streamType === 'live') {
    // HLS for all platforms – enables Adaptive Bitrate Streaming
    // ExoPlayer (Android) and AVPlayer (iOS) both handle m3u8 natively
    return 'm3u8';
  }
  
  // For VOD/Series, respect the container extension but fix incompatibilities
  if (currentExtension) {
    // MKV is problematic on iOS/web – fallback to mp4
    if ((Platform.OS === 'ios' || Platform.OS === 'web') && currentExtension === 'mkv') {
      return 'mp4';
    }
    return currentExtension;
  }
  
  return 'mp4';
}

/**
 * Get human-readable label for quality preset (for Settings UI).
 */
export function getQualityLabel(quality: VideoQualityPreset): string {
  switch (quality) {
    case 'auto': return 'Auto (Adaptiv)';
    case 'max': return 'Maximum';
    case '1080p': return '1080p (Full HD)';
    case '720p': return '720p (HD)';
    case '480p': return '480p (SD)';
    default: return quality;
  }
}

/**
 * Get human-readable label for buffer size preset (for Settings UI).
 */
export function getBufferLabel(buffer: BufferSizePreset): string {
  switch (buffer) {
    case 'normal': return 'Normal';
    case 'large': return 'Groß (stabiler)';
    case 'maximum': return 'Maximum (sehr stabil)';
    default: return buffer;
  }
}