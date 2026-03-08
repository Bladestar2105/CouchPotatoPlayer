export interface Category {
  category_id: string;
  category_name: string;
  parent_id: number;
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

export interface EpgChannel {
  id: string;
  display_name: string;
  icon?: string;
}

export interface PlayerConfig {
  serverUrl: string;
  username: string;
  password?: string;
  type: 'xtream' | 'm3u';
  epgUrl?: string; // Optional URL for M3U playlist EPG data (xmltv.php)
}
