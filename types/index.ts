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
}

/**
 * Représente un épisode de Série
 */
export interface Episode {
  id: string;
  name: string;
  streamUrl: string;
  episodeNumber: number;
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
}

export interface EPGProgram {
  id: string;
  channelId: string;
  title: string;
  description: string;
  start: Date;
  end: Date;
}

export interface M3UProfile { id: string; name: string; type: 'm3u'; url: string; epgUrl?: string; icon?: string; }
export interface XtreamProfile { id: string; name: string; type: 'xtream'; url: string; username: string; password?: string; icon?: string; }
export interface StalkerProfile { id: string; name: string; type: 'stalker'; portalUrl: string; macAddress: string; icon?: string; }
export type IPTVProfile = M3UProfile | XtreamProfile | StalkerProfile;
export type ProfileType = IPTVProfile['type'];

export type IPTVContextType = {
  profiles: IPTVProfile[];
  currentProfile: IPTVProfile | null;

  channels: Channel[];
  movies: Movie[];
  series: Series[];

  currentStream: { url: string; id: string; } | null;

  favorites: string[];

  isLoading: boolean;
  error: string | null;

  addProfile: (profile: IPTVProfile) => Promise<void>;
  removeProfile: (id: string) => Promise<void>;
  editProfile: (updatedProfile: IPTVProfile) => Promise<void>;
  loadProfile: (profile: IPTVProfile) => Promise<void>;
  unloadProfile: () => Promise<void>;
  setCurrentProfile: (profile: IPTVProfile | null) => void;

  playStream: (stream: { url: string; id: string; }) => void;

  epg: Record<string, EPGProgram[]>;
  loadEPG: () => Promise<void>;

  getSeriesInfo: (seriesId: string) => Promise<any>;
  getVodInfo: (vodId: string) => Promise<any>;

  addFavorite: (id: string) => Promise<void>;
  removeFavorite: (id: string) => Promise<void>;
  isFavorite: (id: string) => boolean;

  recentlyWatched: string[];
  addRecentlyWatched: (id: string) => Promise<void>;

  pin: string | null;
  isAdultUnlocked: boolean;
  setPinCode: (newPin: string | null) => Promise<void>;
  unlockAdultContent: (pinInput: string) => boolean;
  lockAdultContent: () => void;
};