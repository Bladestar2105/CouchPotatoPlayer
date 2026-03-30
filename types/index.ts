/**
 * Représente une chaîne (Live TV)
 */
export interface Channel {
  id: string;
  name: string;
  url: string;
  logo?: string;
  group: string;
  tvgId?: string;
  isAdult?: boolean;
  epgChannelId?: string;
  streamId?: number;
  categoryId?: string;
  containerExtension?: string;
  // Catchup/Archive support
  tvArchive?: number; // 1 if channel has archive/catchup
  tvArchiveDuration?: number; // Duration in hours
  catchupId?: string; // Catchup source ID
  catchupDays?: number; // Number of days available for catchup
}

/**
 * Représente un Film (VOD)
 */
export interface Movie {
  id: string;
  name: string;
  streamUrl: string;
  cover?: string;
  group: string;
  isAdult?: boolean;
  categoryId?: string;
  containerExtension?: string;
}

/**
 * Représente un épisode de Série
 */
export interface Episode {
  id: string;
  name: string;
  streamUrl: string;
  episodeNumber: number;
  containerExtension?: string;
}

/**
 * Représente une seule saison
 */
export interface Season {
  id: string;
  name: string;
  seasonNumber: number;
  episodes: Episode[];
}

/**
 * Représente une série complète
 */
export interface Series {
  id: string;
  name: string;
  cover?: string;
  group: string;
  seasons: Season[];
  isAdult?: boolean;
  categoryId?: string;
}

/**
 * Programme EPG avec support pour timestamps Unix (Flutter)
 */
export interface EPGProgram {
  id: string;
  channelId: string;
  title: string;
  description: string;
  start: number;
  end: number;
  // Support for raw data from Xtream API
  title_raw?: string;
  description_raw?: string;
  start_unix?: number;
  end_unix?: number;
}

/**
 * Élément favori avec métadonnées complètes (Flutter migration)
 */
export interface FavoriteItem {
  id: string;
  type: 'live' | 'vod' | 'series';
  name: string;
  icon?: string;
  categoryId?: string;
  addedAt: number;
  lastWatchedAt?: number;
}

/**
 * Élément récemment regardé avec progression (Flutter migration)
 */
export interface RecentlyWatchedItem {
  id: string;
  type: 'live' | 'vod' | 'series';
  name: string;
  icon?: string;
  extension?: string;
  directSource?: string;
  lastWatchedAt: number;
  position?: number;
  duration?: number;
  episodeId?: number;
  episodeName?: string;
  seasonNumber?: number;
  episodeNumber?: number;
}

/**
 * Catégorie IPTV (Flutter migration)
 */
export interface Category {
  category_id: string;
  category_name: string;
  parent_id?: number;
  adult?: number;
}

export interface ProviderInfo {
  channelsCount?: number;
  moviesCount?: number;
  seriesCount?: number;
  maxConnections?: string | number;
  activeConnections?: string | number;
  expiryDate?: string | number;
}

export interface M3UProfile { id: string; name: string; type: 'm3u'; url: string; epgUrl?: string; icon?: string; providerInfo?: ProviderInfo; }
export interface XtreamProfile { id: string; name: string; type: 'xtream'; url: string; username: string; password?: string; icon?: string; providerInfo?: ProviderInfo; }
export type IPTVProfile = M3UProfile | XtreamProfile;
export type ProfileType = IPTVProfile['type'];

export type IPTVContextType = {
  isInitializing: boolean;
  profiles: IPTVProfile[];
  currentProfile: IPTVProfile | null;

  channels: Channel[];
  movies: Movie[];
  series: Series[];

  currentStream: { url: string; id: string; } | null;

  favorites: FavoriteItem[];
  recentlyWatched: RecentlyWatchedItem[];

  isLoading: boolean;
  error: string | null;
  isUpdating: boolean;
  setIsUpdating: (val: boolean) => void;

  addProfile: (profile: IPTVProfile) => Promise<void>;
  removeProfile: (id: string) => Promise<void>;
  editProfile: (updatedProfile: IPTVProfile) => Promise<void>;
  loadProfile: (profile: IPTVProfile, forceUpdate?: boolean) => Promise<void>;
  unloadProfile: () => Promise<void>;
  setCurrentProfile: (profile: IPTVProfile | null) => void;

  playStream: (stream: { url: string; id: string; }) => void;
  stopStream: () => void;

  epg: Record<string, EPGProgram[]>;
  loadEPG: (forceUpdate?: boolean) => Promise<void>;

  getSeriesInfo: (seriesId: string) => Promise<any>;
  getVodInfo: (vodId: string) => Promise<any>;

  addFavorite: (item: FavoriteItem) => Promise<void>;
  removeFavorite: (id: string) => Promise<void>;
  isFavorite: (id: string) => boolean;

  addRecentlyWatched: (item: RecentlyWatchedItem) => Promise<void>;
  updatePlaybackPosition: (id: string, position: number, duration?: number) => Promise<void>;
  removeRecentlyWatched: (id: string) => Promise<void>;

  pin: string | null;
  isAdultUnlocked: boolean;
  setPinCode: (newPin: string | null) => Promise<void>;
  unlockAdultContent: (pinInput: string) => boolean;
  lockAdultContent: () => void;

  // Channel Lock/Unlock (Flutter migration)
  lockedChannels: string[];
  lockChannel: (id: string) => Promise<void>;
  unlockChannel: (id: string) => Promise<void>;
  isChannelLocked: (id: string) => boolean;

  // Catchup/Archive support
  getCatchupUrl: (channel: Channel, startTime: Date, endTime: Date) => string | null;
  hasCatchup: (channel: Channel) => boolean;
};