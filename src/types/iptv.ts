export interface Category {
  category_id: string;
  category_name: string;
  parent_id: number;
  adult?: number;
  is_adult?: number;
}

export interface LiveChannel {
  num: number;
  name: string;
  stream_type: string;
  stream_id: number;
  stream_icon: string;
  epg_channel_id: string;
  added: string;
  category_id: string;
  custom_sid: string;
  tv_archive: number;
  direct_source: string;
  tv_archive_duration: number;
  container_extension?: string;
  series_id?: number;
  cover?: string;
  title?: string;
}

export interface EpgProgram {
  id: string;
  epg_id: string;
  title: string;
  lang: string;
  start: string;
  end: string;
  description: string;
  channel_id: string;
  start_timestamp: string;
  stop_timestamp: string;
}

export interface XtreamEpgListing extends EpgProgram {
  has_archive: number;
}

export interface XtreamShortEpgResponse {
  epg_listings: XtreamEpgListing[];
}

export interface M3UFormattedEpgProgram {
  start: string;
  end: string;
  title_raw: string;
  description_raw: string;
  has_archive: number;
  title?: string;
  description?: string;
}

export interface ParsedProgram {
  start: number; // unix timestamp
  end: number;   // unix timestamp
  start_formatted?: string;
  end_formatted?: string;
  title_raw: string;
  description_raw: string;
  has_archive: number;
  title?: string;
  description?: string;
}

export type UnifiedEpgProgram = XtreamEpgListing | M3UFormattedEpgProgram | ParsedProgram;

export type EpgRenderItemType = UnifiedEpgProgram;

export interface EpgChannel {
  id: string;
  display_name: string;
  icon?: string;
}

export interface PlayerConfig {
  id: string;
  name: string;
  serverUrl: string;
  username: string;
  password?: string;
  type: 'xtream' | 'm3u';
  epgUrl?: string; // Optional URL for M3U playlist EPG data (xmltv.php)
}

// ── Streaming Quality Settings ──────────────────────────────────────
export type VideoQualityPreset = 'auto' | 'max' | '1080p' | '720p' | '480p';
export type BufferSizePreset = 'normal' | 'large' | 'maximum';
export type VideoViewType = 'surfaceView' | 'textureView';

export interface StreamingSettings {
  videoQuality: VideoQualityPreset;
  bufferSize: BufferSizePreset;
  viewType: VideoViewType;
  hardwareAcceleration: boolean;
  // Computed values derived from presets
}

export const DEFAULT_STREAMING_SETTINGS: StreamingSettings = {
  videoQuality: 'auto',
  bufferSize: 'normal',
  viewType: 'surfaceView',
  hardwareAcceleration: true,
};

/** Maps quality presets to max bitrate in bits/s. 0 = unlimited (ABR decides) */
export const QUALITY_BITRATE_MAP: Record<VideoQualityPreset, number> = {
  auto: 0,
  max: 0,
  '1080p': 8_000_000,   // 8 Mbit/s
  '720p': 4_000_000,    // 4 Mbit/s
  '480p': 2_000_000,    // 2 Mbit/s
};

/** Buffer multiplier for each preset */
export const BUFFER_MULTIPLIER_MAP: Record<BufferSizePreset, number> = {
  normal: 1,
  large: 2,
  maximum: 3,
};

// ── Favorites & Recently Watched ────────────────────────────────────
export interface FavoriteItem {
  id: string | number;          // stream_id or series_id
  type: 'live' | 'vod' | 'series';
  name: string;
  icon?: string;                // stream_icon or cover
  categoryId?: string;
  addedAt: number;              // timestamp when favorited
}

export interface RecentlyWatchedItem {
  id: string | number;          // stream_id or series_id
  type: 'live' | 'vod' | 'series';
  name: string;
  icon?: string;
  extension?: string;
  directSource?: string;
  lastWatchedAt: number;        // timestamp
  /** Playback position in seconds (for VOD/Series resume) */
  position?: number;
  /** Total duration in seconds (for progress bar) */
  duration?: number;
  /** Series-specific: last watched episode info */
  episodeId?: number;
  episodeName?: string;
  seasonNumber?: number;
  episodeNumber?: number;
}
