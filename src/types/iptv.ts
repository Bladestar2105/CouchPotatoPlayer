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
  start_formatted: string;
  end_formatted: string;
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
