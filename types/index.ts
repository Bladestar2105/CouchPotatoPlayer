/**
 * Represents a live TV channel.
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
  streamId?: string | number;
  categoryId?: string;
  containerExtension?: string;
  // Catchup/Archive support
  tvArchive?: number; // 1 if channel has archive/catchup
  tvArchiveDuration?: number; // Duration in hours
  catchupId?: string; // Catchup type identifier (xc, shift, flussonic, archive, etc.)
  catchupDays?: number; // Number of days available for catchup
  catchupSource?: string; // Catchup source URL template (for M3U append-type catchup)
}

/**
 * Represents a VOD movie.
 */
export interface Movie {
  id: string;
  name: string;
  streamUrl: string;
  cover?: string;
  description?: string;
  group: string;
  isAdult?: boolean;
  categoryId?: string;
  containerExtension?: string;
}

/**
 * Represents a single series episode.
 */
export interface Episode {
  id: string;
  name: string;
  streamUrl: string;
  episodeNumber: number;
  containerExtension?: string;
}

/**
 * Represents a single season.
 */
export interface Season {
  id: string;
  name: string;
  seasonNumber: number;
  episodes: Episode[];
}

/**
 * Represents a complete series.
 */
export interface Series {
  id: string;
  name: string;
  cover?: string;
  description?: string;
  group: string;
  seasons: Season[];
  seasonCount?: number;
  isAdult?: boolean;
  categoryId?: string;
}

/**
 * EPG program with Unix timestamp support.
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
 * Favorite item with full metadata.
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
 * Recently watched item with progress metadata.
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
  isAdult?: boolean;
  seriesId?: string;
  episodeId?: string | number;
  episodeName?: string;
  seasonNumber?: number;
  episodeNumber?: number;
}

export interface PlaybackStream {
  url: string;
  id: string;
  name?: string;
  type?: 'live' | 'vod' | 'movie' | 'series';
  icon?: string;
  extension?: string;
  directSource?: string;
  direct_source?: string;
  isAdult?: boolean;
  seriesId?: string;
  episodeId?: string | number;
  episodeName?: string;
  seasonNumber?: number;
  episodeNumber?: number;
}

/**
 * IPTV category.
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
  validFrom?: string | number;
  validUntil?: string | number;
  isValidNow?: boolean;
}

export interface M3UProfile { id: string; name: string; type: 'm3u'; url: string; epgUrl?: string; icon?: string; providerInfo?: ProviderInfo; }
export interface XtreamProfile { id: string; name: string; type: 'xtream'; url: string; username: string; password?: string; icon?: string; providerInfo?: ProviderInfo; }
export interface QuickshareProfile { id: string; name: string; type: 'quickshare'; url: string; icon?: string; providerInfo?: ProviderInfo; }
export type IPTVProfile = M3UProfile | XtreamProfile | QuickshareProfile;
export type ProfileType = IPTVProfile['type'];

export type IPTVContextType = {
  isInitializing: boolean;
  profiles: IPTVProfile[];
  currentProfile: IPTVProfile | null;

  channels: Channel[];
  movies: Movie[];
  series: Series[];

  currentStream: PlaybackStream | null;

  favorites: FavoriteItem[];
  recentlyWatched: RecentlyWatchedItem[];

  isLoading: boolean;
  error: string | null;
  isUpdating: boolean;
  setIsUpdating: (val: boolean) => void;
  hasCheckedOnStartup: boolean;
  setHasCheckedOnStartup: (val: boolean) => void;

  addProfile: (profile: IPTVProfile) => Promise<void>;
  removeProfile: (id: string) => Promise<void>;
  editProfile: (updatedProfile: IPTVProfile) => Promise<void>;
  loadProfile: (profile: IPTVProfile, forceUpdate?: boolean) => Promise<void>;
  unloadProfile: () => Promise<void>;
  setCurrentProfile: (profile: IPTVProfile | null) => void;

  playStream: (stream: PlaybackStream) => void;
  stopStream: () => void;

  epg: Record<string, EPGProgram[]>;
  loadEPG: (
    forceUpdate?: boolean,
    options?: { preferCache?: boolean; profileOverride?: IPTVProfile }
  ) => Promise<void>;

  getSeriesInfo: (seriesId: string) => Promise<any>;
  getVodInfo: (vodId: string) => Promise<any>;

  addFavorite: (item: FavoriteItem) => Promise<void>;
  removeFavorite: (id: string) => Promise<void>;
  isFavorite: (id: string) => boolean;

  addRecentlyWatched: (item: RecentlyWatchedItem) => Promise<void>;
  updatePlaybackPosition: (id: string, position: number, duration?: number) => Promise<void>;
  removeRecentlyWatched: (id: string) => Promise<void>;
  clearRecentlyWatched: () => Promise<void>;

  pin: string | null;
  isAdultUnlocked: boolean;
  setPinCode: (newPin: string | null) => Promise<void>;
  unlockAdultContent: (pinInput: string) => boolean;
  lockAdultContent: () => void;

  // Channel Lock/Unlock
  lockedChannels: string[];
  lockChannel: (id: string) => Promise<void>;
  unlockChannel: (id: string) => Promise<void>;
  isChannelLocked: (id: string) => boolean;

  // Catchup/Archive support
  getCatchupUrl: (channel: Channel, startTime: Date | number, endTime: Date | number) => string | null;
  hasCatchup: (channel: Channel) => boolean;
};
