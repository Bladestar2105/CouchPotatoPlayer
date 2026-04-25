import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import bcrypt from 'bcryptjs';
import { File, Paths } from 'expo-file-system';

import i18n from '../utils/i18n';
import Logger from '../utils/logger';
import { sanitizeError, sanitizeUrl } from '../utils/sanitizeUrl';
import { resolveSeriesSeasonCount } from '../utils/seriesMetadata';
export { sanitizeUrl };
import {
  IPTVContextType,
  IPTVProfile,
  XtreamProfile,
  M3UProfile,
  Channel,
  Movie,
  Series,
  Season,
  EPGProgram,
  FavoriteItem,
  RecentlyWatchedItem,
  PlaybackStream
} from '../types';
import { generateCatchupUrl, hasCatchupSupport, CatchupType, CatchupConfig } from '../utils/catchupUtils';
import { parseXMLTVFromString } from '../utils/epgParser';
import { filterNonAdultRecentlyWatched, isAdultRecentlyWatchedItem } from '../utils/adultContent';
import { buildSearchSnapshot, deleteSearchSnapshot, persistSearchSnapshot } from '../utils/searchSnapshot';

const seriesRegex = /(.*?) S(\d+) E(\d+)/i;
const PROFILES_STORAGE_KEY = 'IPTV_PROFILES';
const CURRENT_PROFILE_STORAGE_KEY = 'IPTV_CURRENT_PROFILE';
const FAVORITES_STORAGE_KEY = 'IPTV_FAVORITES';
const RECENTLY_WATCHED_KEY = 'IPTV_RECENTLY_WATCHED';
const PIN_STORAGE_KEY = 'IPTV_PIN';
const LOCKED_CHANNELS_KEY = 'IPTV_LOCKED_CHANNELS';
const EPG_STORAGE_KEY_PREFIX = 'IPTV_EPG_';

const CACHE_EXPIRATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const EPG_MIN_RELOAD_INTERVAL_MS = 5000;
const QUICKSHARE_VALIDITY_CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const XTREAM_EPG_BATCH_SIZE = 50;
const PLAYLIST_UPDATE_INTERVAL_STORAGE_KEY = 'app_update_interval';
const DEFAULT_PLAYLIST_UPDATE_INTERVAL_HOURS = 24;
const MIN_PLAYLIST_UPDATE_INTERVAL_HOURS = 1;

/**
 * Sanitizes a URL by removing sensitive query parameters (username, password)
 */

/**
 * Decode Base64 string if needed
 * Xtream EPG sometimes returns base64-encoded titles
 */
const decodeBase64IfNeeded = (text: string): string => {
  if (!text || text.length === 0) return text;
  try {
    // Heuristic: if it doesn't contain spaces and length is divisible by 4, it might be base64.
    if (!text.includes(' ') && text.length % 4 === 0 && /^[A-Za-z0-9+/=]+$/.test(text)) {
      let decoded = '';
      if (typeof globalThis.atob === 'function') {
        decoded = globalThis.atob(text);
      } else {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
        let output = '';
        const s = text.replace(/[^A-Za-z0-9+/=]/g, '');
        for (let i = 0; i < s.length;) {
          const e1 = chars.indexOf(s.charAt(i++));
          const e2 = chars.indexOf(s.charAt(i++));
          const e3 = chars.indexOf(s.charAt(i++));
          const e4 = chars.indexOf(s.charAt(i++));
          output += String.fromCharCode((e1 << 2) | (e2 >> 4));
          if (e3 !== 64) output += String.fromCharCode(((e2 & 15) << 4) | (e3 >> 2));
          if (e4 !== 64) output += String.fromCharCode(((e3 & 3) << 6) | e4);
        }
        decoded = output;
      }
      if (decoded && !decoded.includes('\uFFFD')) {
        return decoded;
      }
    }
  } catch (_) {
    // Not valid base64
  }
  return text;
};

const fetchWithProxy = async (url: string, options?: RequestInit): Promise<Response> => {
  try {
    const response = await fetch(url, options);
    return response;
  } catch (e: any) {
    if (Platform.OS === 'web' && e instanceof TypeError) {
      console.warn(`CORS Error for: ${sanitizeUrl(url)}`);
      
      // Use nginx proxy configured in the Docker container
      // The nginx proxy is available at /proxy/ endpoint
      const proxyUrl = `/proxy/${url}`;
      try {
        Logger.log(`Using nginx proxy for: ${sanitizeUrl(url)}`);
        const response = await fetch(proxyUrl, options);
        if (response.ok) {
          Logger.log(`Nginx proxy succeeded`);
          return response;
        }
      } catch (proxyError: any) {
        console.warn(`Nginx proxy failed: ${proxyError.message}`);
      }
      
      throw new Error(i18n.t('corsError'));
    }
    // Prevent raw fetch error messages from exposing sensitive URLs to callers/UI
    throw new Error(i18n.t('networkError', { status: 'Failed' }));
  }
};

const IPTVContext = createContext<IPTVContextType | undefined>(undefined);
type IPTVPlaybackContextType = {
  currentStream: PlaybackStream | null;
  playStream: (stream: PlaybackStream) => void;
  stopStream: () => void;
};
const IPTVPlaybackContext = createContext<IPTVPlaybackContextType | undefined>(undefined);
type IPTVLibraryContextType = {
  channels: Channel[];
  movies: Movie[];
  series: Series[];
  epg: Record<string, EPGProgram[]>;
  hasAdultContent: boolean;
};
const IPTVLibraryContext = createContext<IPTVLibraryContextType | undefined>(undefined);
type IPTVCollectionsContextType = {
  favorites: FavoriteItem[];
  recentlyWatched: RecentlyWatchedItem[];
  addFavorite: (item: FavoriteItem) => Promise<void>;
  removeFavorite: (id: string) => Promise<void>;
  isFavorite: (id: string) => boolean;
  addRecentlyWatched: (item: RecentlyWatchedItem) => Promise<void>;
  updatePlaybackPosition: (id: string, position: number, duration?: number) => Promise<void>;
  removeRecentlyWatched: (id: string) => Promise<void>;
  clearRecentlyWatched: () => Promise<void>;
};
const IPTVCollectionsContext = createContext<IPTVCollectionsContextType | undefined>(undefined);
type IPTVParentalContextType = {
  pin: string | null;
  isAdultUnlocked: boolean;
  lockedChannels: string[];
  setPinCode: (newPin: string | null) => Promise<void>;
  unlockAdultContent: (enteredPin: string) => boolean;
  lockAdultContent: () => void;
  lockChannel: (channelId: string) => Promise<void>;
  unlockChannel: (channelId: string) => Promise<void>;
  isChannelLocked: (channelId: string) => boolean;
};
const IPTVParentalContext = createContext<IPTVParentalContextType | undefined>(undefined);
type IPTVProfilesContextType = {
  profiles: IPTVProfile[];
  currentProfile: IPTVProfile | null;
  addProfile: (profile: IPTVProfile) => Promise<void>;
  editProfile: (updatedProfile: IPTVProfile) => Promise<void>;
  removeProfile: (id: string) => Promise<void>;
  loadProfile: (profile: IPTVProfile, forceUpdate?: boolean) => Promise<void>;
  unloadProfile: () => Promise<void>;
};
const IPTVProfilesContext = createContext<IPTVProfilesContextType | undefined>(undefined);
type IPTVAppStateContextType = {
  isInitializing: boolean;
  isLoading: boolean;
  isUpdating: boolean;
  error: string | null;
  hasCheckedOnStartup: boolean;
  setHasCheckedOnStartup: (checked: boolean) => void;
};
const IPTVAppStateContext = createContext<IPTVAppStateContextType | undefined>(undefined);
type IPTVGuideContextType = {
  epg: Record<string, EPGProgram[]>;
  loadEPG: (
    forceUpdate?: boolean,
    options?: { preferCache?: boolean; profileOverride?: IPTVProfile }
  ) => Promise<void>;
  hasCatchup: (channel: Channel) => boolean;
  getCatchupUrl: (channel: Channel, startTime: Date | number, endTime: Date | number) => string | null;
};
const IPTVGuideContext = createContext<IPTVGuideContextType | undefined>(undefined);
type IPTVMetadataContextType = {
  series: Series[];
  getSeriesInfo: (seriesId: string) => Promise<any>;
  getVodInfo: (vodId: string) => Promise<any>;
};
const IPTVMetadataContext = createContext<IPTVMetadataContextType | undefined>(undefined);

export const IPTVProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [profiles, setProfiles] = useState<IPTVProfile[]>([]);
  const [currentProfile, setCurrentProfile] = useState<IPTVProfile | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  const [hasAdultContent, setHasAdultContent] = useState<boolean>(false);
  const [currentStream, setCurrentStream] = useState<PlaybackStream | null>(null);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [recentlyWatched, setRecentlyWatched] = useState<RecentlyWatchedItem[]>([]);
  const [epg, setEpg] = useState<Record<string, EPGProgram[]>>({});
  const [pin, setPin] = useState<string | null>(null);
  const [isAdultUnlocked, setIsAdultUnlocked] = useState<boolean>(false);
  const [lockedChannels, setLockedChannels] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [hasCheckedOnStartup, setHasCheckedOnStartup] = useState<boolean>(false);
  const epgLoadPromiseRef = useRef<Promise<void> | null>(null);
  const lastEpgLoadAttemptRef = useRef(0);
  const hasEpgDataRef = useRef(false);
  const epgBatchInflightRef = useRef<Map<string, Promise<Record<string, { epg_listings?: any[] }>>>>(new Map());
  const isLoadInFlightRef = useRef(false);
  const currentProfileRef = useRef<IPTVProfile | null>(null);

  useEffect(() => {
    hasEpgDataRef.current = Object.keys(epg).length > 0;
  }, [epg]);

  useEffect(() => {
    isLoadInFlightRef.current = isLoading || isUpdating;
  }, [isLoading, isUpdating]);

  useEffect(() => {
    currentProfileRef.current = currentProfile;
  }, [currentProfile]);

  // ─── Universal-search snapshot persistence ────────────────────────────
  // Whenever the active profile finishes loading its library, persist a
  // compact snapshot to AsyncStorage so SearchScreen can offer a search
  // across every configured provider — including ones that aren't loaded
  // right now. Debounced so we don't write while the library is still
  // streaming in.
  useEffect(() => {
    if (!currentProfile) return;
    if (isLoading) return;
    if (channels.length === 0 && movies.length === 0 && series.length === 0) return;

    const handle = setTimeout(() => {
      const snapshot = buildSearchSnapshot(currentProfile, channels, movies, series, epg);
      persistSearchSnapshot(snapshot);
    }, 1500);

    return () => clearTimeout(handle);
  }, [currentProfile, isLoading, channels, movies, series, epg]);

  useEffect(() => {
    const loadDataFromStorage = async () => {
      try {
        const storageEntries = await AsyncStorage.multiGet([
          PROFILES_STORAGE_KEY,
          CURRENT_PROFILE_STORAGE_KEY,
          FAVORITES_STORAGE_KEY,
          RECENTLY_WATCHED_KEY,
          PIN_STORAGE_KEY,
          LOCKED_CHANNELS_KEY,
        ]);
        const storageMap = new Map(storageEntries);
        const profilesJson = storageMap.get(PROFILES_STORAGE_KEY) ?? null;
        const currentProfileId = storageMap.get(CURRENT_PROFILE_STORAGE_KEY) ?? null;
        const favoritesJson = storageMap.get(FAVORITES_STORAGE_KEY) ?? null;
        const recentlyWatchedJson = storageMap.get(RECENTLY_WATCHED_KEY) ?? null;
        const storedPin = storageMap.get(PIN_STORAGE_KEY) ?? null;
        const lockedJson = storageMap.get(LOCKED_CHANNELS_KEY) ?? null;

        let loadedProfiles: IPTVProfile[] = [];
        if (profilesJson) {
          try {
            const parsed = JSON.parse(profilesJson);
            if (!Array.isArray(parsed)) {
              throw new Error('profiles payload is not an array');
            }
            loadedProfiles = parsed;
            setProfiles(loadedProfiles);
          } catch (parseError) {
            Logger.error("Profile data corrupted, cleaning up...", parseError);
            await AsyncStorage.removeItem(PROFILES_STORAGE_KEY);
            setProfiles([]);
          }
        }

        if (currentProfileId && loadedProfiles.length > 0) {
          const profileToLoad = loadedProfiles.find(p => p.id === currentProfileId);
          if (profileToLoad) {
            loadProfile(profileToLoad);
          }
        }

        if (favoritesJson) {
          try {
            const parsed = JSON.parse(favoritesJson);
            if (!Array.isArray(parsed)) {
              throw new Error('favorites payload is not an array');
            }
            setFavorites(parsed as FavoriteItem[]);
          } catch (parseError) {
             Logger.error("Favorites data corrupted, cleaning up...", parseError);
             await AsyncStorage.removeItem(FAVORITES_STORAGE_KEY);
             setFavorites([]);
          }
        }

        if (recentlyWatchedJson) {
          try {
            const parsed = JSON.parse(recentlyWatchedJson);
            if (!Array.isArray(parsed)) {
              throw new Error('recently watched payload is not an array');
            }
            setRecentlyWatched(parsed as RecentlyWatchedItem[]);
          } catch (parseError) {
            Logger.error("Recently watched data corrupted, cleaning up...", parseError);
            await AsyncStorage.removeItem(RECENTLY_WATCHED_KEY);
            setRecentlyWatched([]);
          }
        }

        if (storedPin) {
           setPin(storedPin);
        }

        if (lockedJson) {
          try {
            const parsed = JSON.parse(lockedJson);
            if (!Array.isArray(parsed) || !parsed.every((id) => typeof id === 'string')) {
              throw new Error('locked channels payload is not a string array');
            }
            setLockedChannels(parsed);
          } catch (parseError) {
            Logger.error("Locked channels data corrupted, cleaning up...", parseError);
            await AsyncStorage.removeItem(LOCKED_CHANNELS_KEY);
            setLockedChannels([]);
          }
        }
      } catch (e) {
        Logger.error("Failed to load data from storage", e);
      } finally {
        setIsInitializing(false);
      }
    };
    loadDataFromStorage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const detectAdultContent = useCallback((nextChannels: Channel[], nextMovies: Movie[], nextSeries: Series[]): boolean => {
    for (let i = 0; i < nextChannels.length; i++) {
      if (nextChannels[i].isAdult) return true;
    }
    for (let i = 0; i < nextMovies.length; i++) {
      if (nextMovies[i].isAdult) return true;
    }
    for (let i = 0; i < nextSeries.length; i++) {
      if (nextSeries[i].isAdult) return true;
    }
    return false;
  }, []);

  const addProfile = useCallback(async (profile: IPTVProfile) => {
    try {
      const newProfiles = [...profiles, profile];
      setProfiles(newProfiles);
      await AsyncStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(newProfiles));
    } catch (e) {
      Logger.error("Failed to save profile", e);
    }
  }, [profiles]);

  const removeProfile = useCallback(async (id: string) => {
    try {
      const newProfiles = profiles.filter(profile => profile.id !== id);
      setProfiles(newProfiles);
      await AsyncStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(newProfiles));
      if (currentProfile?.id === id) {
        unloadProfile();
      }
      // Forget the cross-provider search snapshot so deleted providers
      // can never reappear in Universal Search.
      deleteSearchSnapshot(id).catch(() => { /* best-effort */ });
      setHasCheckedOnStartup(false);
    } catch (e) {
      Logger.error("Failed to remove profile", e);
    }
  }, [profiles, currentProfile]);

  const editProfile = useCallback(async (updatedProfile: IPTVProfile) => {
    try {
      const newProfiles = profiles.map(profile =>
        profile.id === updatedProfile.id ? updatedProfile : profile
      );
      setProfiles(newProfiles);
      await AsyncStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(newProfiles));

      if (currentProfile?.id === updatedProfile.id) {
        setCurrentProfile(updatedProfile);
      }
    } catch (e) {
      Logger.error("Failed to edit profile", e);
    }
  }, [profiles, currentProfile]);

  const updateProfileInfo = useCallback(async (profileId: string, providerInfo: any) => {
    try {
      setProfiles(prevProfiles => {
        const newProfiles = prevProfiles.map(p =>
          p.id === profileId ? { ...p, providerInfo: { ...(p.providerInfo || {}), ...providerInfo } } : p
        );
        AsyncStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(newProfiles)).catch(e => {
          Logger.error("Failed to save profile info to storage", e);
        });
        return newProfiles;
      });
      setCurrentProfile(prevProfile => {
        if (prevProfile?.id === profileId) {
          return { ...prevProfile, providerInfo: { ...(prevProfile.providerInfo || {}), ...providerInfo } } as any;
        }
        return prevProfile;
      });
    } catch (e) {
      Logger.error("Failed to update profile info", e);
    }
  }, []);

  const loadProfile = useCallback(async (profile: IPTVProfile, forceUpdate: boolean = false) => {
    if (!forceUpdate) {
        setIsLoading(true);
        setError(null);
        setChannels([]);
        setMovies([]);
        setSeries([]);
        setHasAdultContent(false);
        setEpg({});
    } else {
        setIsUpdating(true);
    }

    try {
      const currentProfileInList = profiles.find(p => p.id === profile.id);
      if (currentProfileInList) {
         setCurrentProfile(currentProfileInList);
      } else {
         setCurrentProfile(profile);
      }
      await AsyncStorage.setItem(CURRENT_PROFILE_STORAGE_KEY, profile.id);

      // SSRF mitigation: validate URL starts with http:// or https://
      const isValidUrl = (url: string) => /^https?:\/\//i.test(url.trim());

      if (profile.type === 'm3u') {
        if (!isValidUrl(profile.url)) {
          throw new Error('Invalid URL. M3U URL must start with http:// or https://');
        }
        await loadM3U(profile, forceUpdate);
      }
      else if (profile.type === 'quickshare') {
        if (!isValidUrl(profile.url)) {
          throw new Error('Invalid URL. Share URL must start with http:// or https://');
        }
        const shareConfig = await resolveQuickshareConfig(profile.url);
        const fetchOptions: RequestInit = forceUpdate ? {
          headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
        } : {};
        const quickshareInfo = await loadQuickshareProviderInfo(profile.id, shareConfig.apiBase, fetchOptions);
        if (quickshareInfo.isExpired) {
          await removeProfile(profile.id);
          throw new Error(i18n.t('authFailed'));
        }
        const m3uProfile: M3UProfile = {
          id: profile.id,
          name: profile.name,
          type: 'm3u',
          url: shareConfig.playlistUrl,
          epgUrl: shareConfig.epgUrl,
          icon: profile.icon,
          providerInfo: profile.providerInfo,
        };
        await loadM3U(m3uProfile, forceUpdate);
      }
      else if (profile.type === 'xtream') {
        const serverUrl = profile.url || (profile as any).serverUrl;
        if (!isValidUrl(serverUrl)) {
          throw new Error('Invalid URL. Xtream server URL must start with http:// or https://');
        }
        await loadXtream(profile, forceUpdate);
      }

      await loadEPG(forceUpdate, { profileOverride: profile });
    } catch (e: any) {
      Logger.error("Failed to load profile:", sanitizeError(e));
      // Safely display specific, translated errors without leaking raw e.message
      const errorMsg = e?.message;
      if (errorMsg === i18n.t('corsError') ||
          errorMsg === i18n.t('connectionFailed') ||
          errorMsg === i18n.t('loadStreamsError') ||
          errorMsg === i18n.t('authFailed') ||
          errorMsg === i18n.t('m3uDownloadError') ||
          errorMsg === i18n.t('m3uEmptyError') ||
          errorMsg === i18n.t('m3uFormatError') ||
          errorMsg?.startsWith('Invalid URL')) {
        setError(errorMsg);
      } else {
        setError(i18n.t('unknownError'));
      }
    } finally {
      if (forceUpdate) {
         setIsUpdating(false);
      } else {
         setIsLoading(false);
      }
    }
  }, [profiles, removeProfile]);

  useEffect(() => {
    if (isInitializing || !currentProfile) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const clearTimer = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    };

    const readUpdateIntervalMs = async (): Promise<number> => {
      try {
        const raw = await AsyncStorage.getItem(PLAYLIST_UPDATE_INTERVAL_STORAGE_KEY);
        const parsed = raw ? Number.parseInt(raw, 10) : DEFAULT_PLAYLIST_UPDATE_INTERVAL_HOURS;
        const safeHours = Number.isFinite(parsed) && parsed >= MIN_PLAYLIST_UPDATE_INTERVAL_HOURS
          ? parsed
          : DEFAULT_PLAYLIST_UPDATE_INTERVAL_HOURS;
        return safeHours * 60 * 60 * 1000;
      } catch (e) {
        Logger.warn('[AUTO UPDATE] Failed to read update interval. Falling back to default.', sanitizeError(e));
        return DEFAULT_PLAYLIST_UPDATE_INTERVAL_HOURS * 60 * 60 * 1000;
      }
    };

    const schedule = async () => {
      clearTimer();
      const intervalMs = await readUpdateIntervalMs();
      if (cancelled) return;
      timer = setTimeout(async () => {
        if (cancelled) return;
        const profileForRefresh = currentProfileRef.current;
        if (profileForRefresh && !isLoadInFlightRef.current) {
          Logger.log(`[AUTO UPDATE] Running scheduled refresh for profile ${profileForRefresh.id}`);
          await loadProfile(profileForRefresh, true);
        } else {
          Logger.log('[AUTO UPDATE] Skipped scheduled refresh because load is already in progress or no active profile');
        }
        if (!cancelled) {
          void schedule();
        }
      }, intervalMs);
    };

    void schedule();

    return () => {
      cancelled = true;
      clearTimer();
    };
  }, [currentProfile, isInitializing, loadProfile]);

  const unloadProfile = useCallback(async () => {
    setCurrentProfile(null);
    setChannels([]);
    setMovies([]);
    setSeries([]);
    setHasAdultContent(false);
    setEpg({});
    setError(null);
    setCurrentStream(null);
    setHasCheckedOnStartup(false);
    await AsyncStorage.removeItem(CURRENT_PROFILE_STORAGE_KEY);
  }, []);

  const loadEPG = useCallback(
    async (
      forceUpdate: boolean = false,
      options?: { preferCache?: boolean; profileOverride?: IPTVProfile },
    ) => {
      const activeProfile = options?.profileOverride ?? currentProfile;
      if (!activeProfile) return;
      const nowMs = Date.now();
      if (!forceUpdate && hasEpgDataRef.current && nowMs - lastEpgLoadAttemptRef.current < EPG_MIN_RELOAD_INTERVAL_MS) {
        Logger.log('[EPG] Skipping duplicate load trigger within cooldown window');
        return;
      }
      if (epgLoadPromiseRef.current) {
        Logger.log('[EPG] EPG load already in progress, waiting for current request');
        await epgLoadPromiseRef.current;
        if (!forceUpdate) return;
      }
      lastEpgLoadAttemptRef.current = nowMs;

    const runLoad = async () => {
      Logger.log('[EPG] Starting EPG load...');
      const totalStartMs = Date.now();
      const logPerf = (phase: string, phaseStartMs: number, meta?: string) => {
        const duration = Date.now() - phaseStartMs;
        Logger.log(`[EPG PERF] ${phase} took ${duration}ms${meta ? ` (${meta})` : ''}`);
      };
      const storageKey = `${EPG_STORAGE_KEY_PREFIX}${activeProfile.id}`;
      const saveEpgToCache = async (data: Record<string, EPGProgram[]>) => {
        const saveStartMs = Date.now();
        const epgCacheData = JSON.stringify({
          timestamp: Date.now(),
          data,
        });

        if (Platform.OS === 'web') {
          try {
            await AsyncStorage.setItem(storageKey, epgCacheData);
          } catch (storageError: any) {
            console.warn('[EPG] Failed to save EPG to AsyncStorage (likely QuotaExceededError on web)', storageError);
          }
        } else {
          const cacheDir = Platform.isTV ? Paths.cache : Paths.document;
          const file = new File(cacheDir, `${storageKey}.json`);
          await file.write(epgCacheData);
        }
        logPerf('cache-write', saveStartMs, `channels=${Object.keys(data).length}`);
      };

      try {
        // 1. Try to load from cache
        const cacheReadStartMs = Date.now();
        let cachedEpgStr: string | null = null;
        if (!forceUpdate) {
          if (Platform.OS === 'web') {
            cachedEpgStr = await AsyncStorage.getItem(storageKey);
          } else {
            const cacheDir = Platform.isTV ? Paths.cache : Paths.document;
            const file = new File(cacheDir, `${storageKey}.json`);
            try {
              if (file.exists) {
                cachedEpgStr = await file.text();
              }
            } catch (e) {
              // File does not exist or cannot be read
            }
          }
        }
        logPerf('cache-read', cacheReadStartMs, forceUpdate ? 'forced-refresh' : 'normal');

        if (cachedEpgStr) {
          // Parse in its own try/catch: a corrupted cache entry (valid JSON with
          // the wrong shape, or outright malformed) previously propagated the
          // throw up to the outer catch at the end of `runLoad`, which aborted
          // the whole call and left the user without any EPG until they cleared
          // the cache manually. Instead, log and fall through to the fresh
          // network fetch below so the next successful load overwrites the bad
          // file.
          let parsedCache: any = null;
          try {
            parsedCache = JSON.parse(cachedEpgStr);
          } catch (parseError) {
            Logger.warn('[EPG] Cached EPG is corrupted, refetching', sanitizeError(parseError));
          }

          const hasValidShape =
            parsedCache &&
            typeof parsedCache === 'object' &&
            !Array.isArray(parsedCache) &&
            typeof parsedCache.timestamp === 'number' &&
            parsedCache.data &&
            typeof parsedCache.data === 'object' &&
            !Array.isArray(parsedCache.data);

          if (
            hasValidShape &&
            Date.now() - parsedCache.timestamp < CACHE_EXPIRATION_MS &&
            !forceUpdate
          ) {
            Logger.log('[EPG] Using cached EPG data');
            setEpg(parsedCache.data);
            Logger.log(`[EPG PERF] epg-load-total ${Date.now() - totalStartMs}ms (cache-hit)`);
            return;
          }
        }

        // 2. Fetch fresh EPG
        let epgUrl = '';
        if (activeProfile.type === 'm3u' && activeProfile.epgUrl) {
          epgUrl = activeProfile.epgUrl;
        } else if (activeProfile.type === 'quickshare') {
          const shareConfig = await resolveQuickshareConfig(activeProfile.url);
          epgUrl = shareConfig.epgUrl;
        } else if (activeProfile.type === 'xtream') {
          const { url: serverUrlProp, username, password } = activeProfile;
          const serverUrl = serverUrlProp || (activeProfile as any).serverUrl;
          if (!serverUrl) throw new Error("Server URL is missing from profile");
          const cleanServerUrl = serverUrl.trim().replace(/\/+$/, '');
          epgUrl = `${cleanServerUrl}/xmltv.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password || '')}`;
        }

        if (epgUrl) {
          // SSRF mitigation: validate URL starts with http:// or https://
          if (!/^https?:\/\//i.test(epgUrl.trim())) {
            Logger.error('[EPG] Invalid EPG URL scheme. Must start with http:// or https://');
            return;
          }

          if (activeProfile.type === 'xtream' || activeProfile.type === 'quickshare') {
            const toTimestampMs = (value: any): number => {
              const num = Number(value);
              if (Number.isFinite(num) && num > 0) {
                return num > 1e11 ? num : num * 1000;
              }
              const parsed = Date.parse(String(value || ''));
              return Number.isFinite(parsed) ? parsed : 0;
            };

            const tryLoadXtreamBatchEpg = async (): Promise<Record<string, EPGProgram[]> | null> => {
              const batchStartMs = Date.now();
              const streamDescriptors = channels
                .map((channel) => {
                  const streamIdRaw = channel.streamId ?? channel.id;
                  const streamId = Number(streamIdRaw);
                  if (!Number.isFinite(streamId) || streamId <= 0) return null;

                  const keys = Array.from(new Set([
                    channel.id,
                    channel.tvgId,
                    channel.epgChannelId,
                    String(streamId),
                  ].filter((k): k is string => typeof k === 'string' && k.length > 0)));

                  return { streamId: Math.floor(streamId), keys };
                })
                .filter((entry): entry is { streamId: number; keys: string[] } => entry !== null);

              if (streamDescriptors.length === 0) {
                logPerf('xtream-batch-skip', batchStartMs, 'no-stream-ids');
                return null;
              }

              let baseApi = '';
              if (activeProfile.type === 'xtream') {
                const { url: serverUrlProp, username, password } = activeProfile;
                const serverUrl = serverUrlProp || (activeProfile as any).serverUrl;
                if (!serverUrl) return null;
                const cleanServerUrl = serverUrl.trim().replace(/\/+$/, '');
                baseApi = `${cleanServerUrl}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password || '')}`;
              } else {
                const shareConfig = await resolveQuickshareConfig(activeProfile.url);
                baseApi = shareConfig.apiBase;
              }

              const now = new Date();
              const yesterday = new Date(now);
              yesterday.setDate(yesterday.getDate() - 1);
              const dayStrings = [
                yesterday.toISOString().split('T')[0],
                now.toISOString().split('T')[0],
              ];

              const mergedByStream = new Map<number, any[]>();
              const streamIds = streamDescriptors.map((entry) => entry.streamId);
              let requestCount = 0;

              const fetchBatchDay = (url: string): Promise<Record<string, { epg_listings?: any[] }>> => {
                const requestKey = `${forceUpdate ? 'force' : 'normal'}:${url}`;
                const existing = epgBatchInflightRef.current.get(requestKey);
                if (existing) return existing;

                const requestPromise = (async () => {
                  requestCount += 1;
                  const response = await fetchWithProxy(url, forceUpdate ? {
                    headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
                  } : undefined);

                  if (!response.ok) {
                    throw new Error(`Batch EPG request failed with status ${response.status}`);
                  }

                  return response.json() as Promise<Record<string, { epg_listings?: any[] }>>;
                })().finally(() => {
                  epgBatchInflightRef.current.delete(requestKey);
                });

                epgBatchInflightRef.current.set(requestKey, requestPromise);
                return requestPromise;
              };

              for (let i = 0; i < streamIds.length; i += XTREAM_EPG_BATCH_SIZE) {
                const chunk = streamIds.slice(i, i + XTREAM_EPG_BATCH_SIZE);
                const idsParam = encodeURIComponent(chunk.join(','));
                const urls = dayStrings.map((dateStr) => `${baseApi}&action=get_epg_batch&stream_ids=${idsParam}&date=${dateStr}`);

                let dayPayloads: Array<Record<string, { epg_listings?: any[] }>>;
                try {
                  dayPayloads = await Promise.all(urls.map(fetchBatchDay));
                } catch (batchError) {
                  Logger.warn('[EPG] Xtream batch EPG failed, falling back to XMLTV', sanitizeError(batchError));
                  logPerf('xtream-batch-failed', batchStartMs);
                  return null;
                }

                for (const payload of dayPayloads) {
                  for (const streamIdKey of Object.keys(payload || {})) {
                    const streamId = Number(streamIdKey);
                    if (!Number.isFinite(streamId)) continue;
                    const listings = payload[streamIdKey]?.epg_listings || [];
                    if (!Array.isArray(listings) || listings.length === 0) continue;

                    const existing = mergedByStream.get(streamId) || [];
                    existing.push(...listings);
                    mergedByStream.set(streamId, existing);
                  }
                }
              }

              if (mergedByStream.size === 0) {
                logPerf('xtream-batch-empty', batchStartMs, `requests=${requestCount}`);
                return null;
              }

              const nextEpg: Record<string, EPGProgram[]> = {};
              for (const descriptor of streamDescriptors) {
                const listings = mergedByStream.get(descriptor.streamId) || [];
                if (!listings.length) continue;

                const dedup = new Map<string, any>();
                for (const listing of listings) {
                  const key = `${listing?.start_timestamp || ''}_${listing?.stop_timestamp || ''}_${listing?.title || ''}`;
                  if (!dedup.has(key)) dedup.set(key, listing);
                }

                const programs: EPGProgram[] = Array.from(dedup.values())
                  .map((listing: any) => {
                    const start = toTimestampMs(listing?.start_timestamp);
                    const end = toTimestampMs(listing?.stop_timestamp);
                    if (!(start > 0) || !(end > start)) return null;
                    return {
                      id: `${descriptor.streamId}_${start}`,
                      channelId: String(descriptor.streamId),
                      title: decodeBase64IfNeeded(String(listing?.title || '')),
                      description: decodeBase64IfNeeded(String(listing?.description || '')),
                      start,
                      end,
                    } as EPGProgram;
                  })
                  .filter((program): program is EPGProgram => program !== null)
                  .sort((a, b) => a.start - b.start);

                if (programs.length === 0) continue;
                for (const key of descriptor.keys) {
                  nextEpg[key] = programs;
                }
              }

              const channelCount = Object.keys(nextEpg).length;
              logPerf('xtream-batch-success', batchStartMs, `requests=${requestCount}, channels=${channelCount}`);
              return channelCount > 0 ? nextEpg : null;
            };

            const xtreamBatchEpg = await tryLoadXtreamBatchEpg();
            if (xtreamBatchEpg) {
              setEpg(xtreamBatchEpg);
              await saveEpgToCache(xtreamBatchEpg);
              Logger.log('[EPG] Loaded EPG via Xtream batch endpoint');
              Logger.log(`[EPG PERF] epg-load-total ${Date.now() - totalStartMs}ms (xtream-batch)`);
              return;
            }
          }

          Logger.log('[EPG] Fetching EPG from:', sanitizeUrl(epgUrl));

          // Use CORS proxy for fetching EPG
          const fetchOptions: RequestInit = forceUpdate ? {
            headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
          } : {};
          const response = await fetchWithProxy(epgUrl, fetchOptions);
          if (!response.ok) {
            throw new Error(`Failed to fetch EPG: ${response.status}`);
          }

          const xmlReadStartMs = Date.now();
          const xmlData = await response.text();
          Logger.log('[EPG] Received XML data, length:', xmlData.length);
          logPerf('xml-read', xmlReadStartMs, `bytes=${xmlData.length}`);

          // Ensure that fast-xml-parser parses dates as string
          // Parse the XML data
          const xmlParseStartMs = Date.now();
          const epgData = parseXMLTVFromString(xmlData);
          Logger.log('[EPG] Parsed EPG data for', Object.keys(epgData).length, 'channels');
          logPerf('xml-parse', xmlParseStartMs, `channels=${Object.keys(epgData).length}`);

          const normalizeStartMs = Date.now();
          const newEpg: Record<string, EPGProgram[]> = {};
          for (const channelId in epgData) {
            newEpg[channelId] = epgData[channelId].map((p: any) => ({
              id: `${p.channelId}_${p.start}`,
              channelId: p.channelId,
              title: decodeBase64IfNeeded(p.title), // Decode base64 if needed
              description: decodeBase64IfNeeded(p.description || ''),
              start: typeof p.start === 'number' ? p.start : (p.start instanceof Date ? p.start.getTime() : new Date(p.start).getTime()),
              end: typeof p.end === 'number' ? p.end : (p.end instanceof Date ? p.end.getTime() : new Date(p.end).getTime()),
            }));
          }
          logPerf('xml-normalize', normalizeStartMs, `channels=${Object.keys(newEpg).length}`);
          setEpg(newEpg);
          Logger.log('[EPG] EPG loaded successfully');
          await saveEpgToCache(newEpg);
          Logger.log(`[EPG PERF] epg-load-total ${Date.now() - totalStartMs}ms (xmltv)`);
        } else {
          Logger.log('[EPG] No EPG URL available');
        }
      } catch (e) {
        Logger.error("[EPG] Failed to load EPG", sanitizeError(e));
        Logger.log(`[EPG PERF] epg-load-total ${Date.now() - totalStartMs}ms (failed)`);
      }
    };

      const currentRun = runLoad().finally(() => {
        if (epgLoadPromiseRef.current === currentRun) {
          epgLoadPromiseRef.current = null;
        }
      });
      epgLoadPromiseRef.current = currentRun;
      await currentRun;
    },
    [channels, currentProfile],
  );

  async function resolveQuickshareConfig(shareUrl: string): Promise<{
    token: string;
    origin: string;
    playlistUrl: string;
    epgUrl: string;
    apiBase: string;
  }> {
    const normalizedShareUrl = shareUrl.trim();
    const response = await fetchWithProxy(normalizedShareUrl, { redirect: 'follow' });
    if (!response.ok) {
      throw new Error(i18n.t('connectionFailed'));
    }

    const resolvedUrl = response.url || normalizedShareUrl;
    const resolved = new URL(resolvedUrl);
    const token = resolved.searchParams.get('token');
    if (!token) {
      throw new Error('Invalid Quickshare link. No token found.');
    }

    const origin = `${resolved.protocol}//${resolved.host}`;
    return {
      token,
      origin,
      playlistUrl: `${origin}/get.php?token=${encodeURIComponent(token)}&type=m3u_plus`,
      epgUrl: `${origin}/xmltv.php?token=${encodeURIComponent(token)}`,
      apiBase: `${origin}/player_api.php?token=${encodeURIComponent(token)}`,
    };
  }

  async function loadQuickshareProviderInfo(profileId: string, apiBase: string, fetchOptions?: RequestInit): Promise<{ isExpired: boolean; }> {
    try {
      const response = await fetchWithProxy(apiBase, fetchOptions);
      if (!response.ok) throw new Error(i18n.t('connectionFailed'));

      const authData = await response.json();
      const userInfo = authData?.user_info || {};
      const nowSec = Math.floor(Date.now() / 1000);

      const validFromRaw = userInfo.valid_from;
      const validUntilRaw = userInfo.valid_until;
      const validFrom = validFromRaw !== undefined && validFromRaw !== null ? Number(validFromRaw) : null;
      const validUntil = validUntilRaw !== undefined && validUntilRaw !== null ? Number(validUntilRaw) : null;
      const isValidNowRaw = userInfo.is_valid_now;
      const authRaw = userInfo.auth;
      const isAuthDenied = authRaw === 0 || authRaw === '0';
      const message = String(userInfo.message || '').toLowerCase();

      let isValidNow: boolean | undefined;
      if (typeof isValidNowRaw === 'boolean') {
        isValidNow = isValidNowRaw;
      } else if (typeof isValidNowRaw === 'number') {
        isValidNow = isValidNowRaw === 1;
      } else if (typeof isValidNowRaw === 'string') {
        isValidNow = isValidNowRaw === '1' || isValidNowRaw.toLowerCase() === 'true';
      }

      const isExpiredByWindow = Number.isFinite(validUntil) && (validUntil as number) > 0 && nowSec > (validUntil as number);
      const isExpired = isExpiredByWindow || (isAuthDenied && message.includes('expired'));
      updateProfileInfo(profileId, {
        maxConnections: userInfo.max_connections,
        activeConnections: userInfo.active_cons,
        expiryDate: userInfo.exp_date,
        validFrom: validFromRaw,
        validUntil: validUntilRaw,
        isValidNow: isValidNow ?? (!isExpired && (Number.isFinite(validFrom) ? nowSec >= (validFrom as number) : true)),
      });

      return { isExpired };
    } catch (e: any) {
      Logger.error("Failed to load Quickshare provider info:", sanitizeError(e));
      throw new Error(e?.message === i18n.t('corsError') ? i18n.t('corsError') : i18n.t('connectionFailed'));
    }
  }

  useEffect(() => {
    if (currentProfile?.type !== 'quickshare') return;

    let cancelled = false;
    const runCheck = async () => {
      try {
        const shareConfig = await resolveQuickshareConfig(currentProfile.url);
        const quickshareInfo = await loadQuickshareProviderInfo(currentProfile.id, shareConfig.apiBase, {
          headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
        });
        if (quickshareInfo.isExpired && !cancelled) {
          await removeProfile(currentProfile.id);
        }
      } catch (e) {
        Logger.warn("Quickshare validity check failed:", sanitizeError(e));
      }
    };

    void runCheck();
    const interval = setInterval(() => {
      void runCheck();
    }, QUICKSHARE_VALIDITY_CHECK_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [currentProfile, removeProfile]);

  const loadM3U = useCallback(async (profile: IPTVProfile, forceUpdate: boolean = false) => {
    let m3uContent = '';
    if (profile.type !== 'm3u') return;
    try {
      const fetchOptions: RequestInit = forceUpdate ? {
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
      } : {};
      const response = await fetchWithProxy(profile.url.trim().replace(/\/+$/, ''), fetchOptions);
      if (!response.ok) throw new Error(i18n.t('networkError', { status: response.status }));
      m3uContent = await response.text();
    } catch (fetchError: any) {
      Logger.error("Network error fetching M3U:", sanitizeError(fetchError));
      throw new Error(fetchError.message === i18n.t('corsError') ? i18n.t('corsError') : i18n.t('m3uDownloadError'));
    }

    try {
      const { channels, movies, series } = parseM3U(m3uContent);
      setChannels(channels);
      setMovies(movies);
      setSeries(series);
      setHasAdultContent(detectAdultContent(channels, movies, series));

      const providerInfo = {
        channelsCount: channels.length,
        moviesCount: movies.length,
        seriesCount: series.length
      };

      updateProfileInfo(profile.id, providerInfo);

      if (channels.length === 0 && movies.length === 0 && series.length === 0) {
        throw new Error(i18n.t('m3uEmptyError'));
      }
    } catch (parseError: any) {
      Logger.error("M3U parsing error:", parseError);
      throw new Error(i18n.t('m3uFormatError'));
    }
  }, [detectAdultContent, updateProfileInfo]);

  const parseM3U = useCallback((m3uContent: string): { channels: Channel[], movies: Movie[], series: Series[] } => {
    const lines = m3uContent.split('\n');
    const channels: Channel[] = [];
    const movies: Movie[] = [];
    const seriesMap = new Map<string, Series>();
    const seasonMaps = new Map<string, Map<number, Season>>();
    let currentItemInfo: { name: string, logo?: string, group: string, tvgId?: string, tvArchive?: number, catchupDays?: number, catchupId?: string, catchupSource?: string } | null = null;
    const infoRegex = /#EXTINF:[-0-9]+(.*),(.*)/;
    const tvgIdRegex = /tvg-id="([^"]*)"/;
    const tvgLogoRegex = /tvg-logo="([^"]*)"/;
    const groupTitleRegex = /group-title="([^"]*)"/;
    const catchupRegex = /catchup="([^"]*)"/i;
    const catchupDaysRegex = /catchup-days="([^"]*)"/i;
    const catchupSourceRegex = /catchup-source="([^"]*)"/i;
    const tvgRecRegex = /tvg-rec="([^"]*)"/i;

    for (const line of lines) {
      if (line.startsWith('#EXTINF:')) {
        const infoMatch = line.match(infoRegex);
        if (infoMatch) {
          const attributes = infoMatch[1] || '';
          const name = infoMatch[2] || 'Unknown';
          const catchupType = attributes.match(catchupRegex)?.[1];
          const catchupDaysStr = attributes.match(catchupDaysRegex)?.[1];
          const tvgRecStr = attributes.match(tvgRecRegex)?.[1];
          const catchupDaysVal = catchupDaysStr ? parseInt(catchupDaysStr, 10) : undefined;
          const hasTvArchive = tvgRecStr === '1' || (catchupType !== undefined && catchupType !== '');
          currentItemInfo = {
            name: name.trim(),
            tvgId: attributes.match(tvgIdRegex)?.[1],
            logo: attributes.match(tvgLogoRegex)?.[1],
            group: attributes.match(groupTitleRegex)?.[1] || 'Unknown',
            tvArchive: hasTvArchive ? 1 : (tvgRecStr ? Number(tvgRecStr) : undefined),
            catchupDays: isNaN(catchupDaysVal as number) ? undefined : catchupDaysVal,
            catchupId: catchupType || undefined,
            catchupSource: attributes.match(catchupSourceRegex)?.[1] || undefined,
          };
        }
      } else if ((line.startsWith('http://') || line.startsWith('https://')) && currentItemInfo) {
        const url = line.trim();
        if (url.includes('/movie/')) {
          const movieId = `${url}_${currentItemInfo.name}`;
          movies.push({ id: movieId, name: currentItemInfo.name, streamUrl: url, cover: currentItemInfo.logo, group: currentItemInfo.group });
        }
        else if (url.includes('/series/')) {
          const match = currentItemInfo.name.match(seriesRegex);
          let seriesName: string, seasonNum: number, episodeNum: number, episodeName: string;

          if (match) {
            seriesName = match[1].trim();
            seasonNum = parseInt(match[2]);
            episodeNum = parseInt(match[3]);
            episodeName = `Episode ${episodeNum}`;
          } else {
            seriesName = currentItemInfo.name.split(/ S\d+/i)[0].trim();
            if (seriesName === "") { seriesName = currentItemInfo.name; }
            seasonNum = 1;
            episodeNum = (seriesMap.get(seriesName)?.seasons[0]?.episodes.length || 0) + 1;
            episodeName = currentItemInfo.name;
          }

          if (!seriesMap.has(seriesName)) {
            seriesMap.set(seriesName, { id: seriesName, name: seriesName, cover: currentItemInfo.logo, group: currentItemInfo.group, seasons: [] });
            seasonMaps.set(seriesName, new Map<number, Season>());
          }
          const currentSeries = seriesMap.get(seriesName)!;
          const currentSeriesSeasonMap = seasonMaps.get(seriesName)!;

          let currentSeason = currentSeriesSeasonMap.get(seasonNum);
          if (!currentSeason) {
            currentSeason = { id: `${seriesName}-S${seasonNum}`, name: `Season ${seasonNum}`, seasonNumber: seasonNum, episodes: [] };
            currentSeriesSeasonMap.set(seasonNum, currentSeason);
            currentSeries.seasons.push(currentSeason);
          }

          const episodeId = `${url}_${seriesName}_S${seasonNum}E${episodeNum}`;
          currentSeason.episodes.push({ id: episodeId, name: episodeName, streamUrl: url, episodeNumber: episodeNum });

        } else {
          const channelId = currentItemInfo.tvgId ? `${currentItemInfo.tvgId}_${url}` : `${url}_${currentItemInfo.name}`;
          channels.push({
            id: channelId,
            name: currentItemInfo.name,
            url: url,
            logo: currentItemInfo.logo,
            group: currentItemInfo.group,
            tvgId: currentItemInfo.tvgId,
            tvArchive: currentItemInfo.tvArchive,
            catchupDays: currentItemInfo.catchupDays,
            catchupId: currentItemInfo.catchupId,
            catchupSource: currentItemInfo.catchupSource,
          });
        }
        currentItemInfo = null;
      }
    }
    const series = Array.from(seriesMap.values());
    // Sort seasons and episodes after parsing is complete
    series.forEach(s => {
      s.seasons.sort((a, b) => a.seasonNumber - b.seasonNumber);
      s.seasons.forEach(season => {
        season.episodes.sort((a, b) => a.episodeNumber - b.episodeNumber);
      });
    });
    return { channels, movies, series };
  }, []);

  const loadXtream = useCallback(async (profile: IPTVProfile, forceUpdate: boolean = false) => {
    if (profile.type !== 'xtream') return;

    const cacheKey = `XTREAM_CACHE_V2_${profile.id}`;

    if (!forceUpdate) {
        // Try to load from cache first
        try {
            let cachedDataStr: string | null = null;
            if (Platform.OS === 'web') {
              cachedDataStr = await AsyncStorage.getItem(cacheKey);
            } else {
              const cacheDir = Platform.isTV ? Paths.cache : Paths.document;
              const file = new File(cacheDir, `${cacheKey}.json`);
              try {
                if (file.exists) {
                  cachedDataStr = await file.text();
                }
              } catch (e) {
                // File does not exist or cannot be read
              }
            }

            if (cachedDataStr) {
                const cachedData = JSON.parse(cachedDataStr);
                setChannels(cachedData.channels || []);
                setMovies(cachedData.movies || []);
                setSeries(cachedData.series || []);
                setHasAdultContent(detectAdultContent(
                  cachedData.channels || [],
                  cachedData.movies || [],
                  cachedData.series || [],
                ));
                return; // Exit early if loaded from cache
            }
        } catch (e) {
            Logger.error("Failed to read Xtream cache", e);
        }
    }

    const { url: serverUrlProp, username, password } = profile;
    const serverUrl = serverUrlProp || (profile as any).serverUrl;
    if (!serverUrl) throw new Error("Server URL is missing from profile");
    const cleanServerUrl = serverUrl.trim().replace(/\/+$/, '');
    const baseUrl = `${cleanServerUrl}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password || '')}`;
    const fetchOptions: RequestInit = forceUpdate ? {
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
    } : {};

    let authResponse;
    let liveExtension = 'ts';
    let providerInfo: any = {};

    try {
      authResponse = await fetchWithProxy(baseUrl, fetchOptions);
      if (!authResponse.ok) throw new Error(i18n.t('serverError', { status: authResponse.status }));

      const authData = await authResponse.json();
      if (authData.user_info.auth === 0) {
        throw new Error(i18n.t('authFailed'));
      }

      providerInfo = {
        maxConnections: authData.user_info.max_connections,
        activeConnections: authData.user_info.active_cons,
        expiryDate: authData.user_info.exp_date
      };

      if (authData.user_info.allowed_output_formats && Array.isArray(authData.user_info.allowed_output_formats)) {
        const formats = authData.user_info.allowed_output_formats;
        if (formats.includes('ts')) {
          liveExtension = 'ts';
        } else if (formats.includes('m3u8')) {
          liveExtension = 'm3u8';
        } else if (formats.length > 0) {
          liveExtension = formats[0];
        }
      }
    } catch (e: any) {
      Logger.error("Network error during Xtream auth:", sanitizeError(e));
      throw new Error(e.message === i18n.t('corsError') ? i18n.t('corsError') : i18n.t('connectionFailed'));
    }

    const liveCategoriesUrl = `${baseUrl}&action=get_live_categories`;
    const vodCategoriesUrl = `${baseUrl}&action=get_vod_categories`;
    const seriesCategoriesUrl = `${baseUrl}&action=get_series_categories`;

    try {
      const [liveCatRes, vodCatRes, seriesCatRes] = await Promise.all([
        fetchWithProxy(liveCategoriesUrl, fetchOptions),
        fetchWithProxy(vodCategoriesUrl, fetchOptions),
        fetchWithProxy(seriesCategoriesUrl, fetchOptions)
      ]);

      const liveCatData = await liveCatRes.json();
      const vodCatData = await vodCatRes.json();
      const seriesCatData = await seriesCatRes.json();

      const categoryMap = new Map<string, { name: string, isAdult: boolean }>();

      const processCats = (cats: any[]) => {
         if (!Array.isArray(cats)) return;
         cats.forEach(c => {
            const isAdult = String(c.adult) === '1' || String(c.is_adult) === '1' || String(c.category_name).toLowerCase().includes('xxx');
            categoryMap.set(String(c.category_id), { name: c.category_name, isAdult });
         });
      };

      processCats(liveCatData);
      processCats(vodCatData);
      processCats(seriesCatData);

      const allStreamsUrl = `${baseUrl}&action=get_live_streams`;
      const vodStreamsUrl = `${baseUrl}&action=get_vod_streams`;
      const seriesStreamsUrl = `${baseUrl}&action=get_series`;

      const [liveRes, vodRes, seriesRes] = await Promise.all([
        fetchWithProxy(allStreamsUrl, fetchOptions),
        fetchWithProxy(vodStreamsUrl, fetchOptions),
        fetchWithProxy(seriesStreamsUrl, fetchOptions)
      ]);

      const liveData = await liveRes.json();
      const vodData = await vodRes.json();
      const seriesData = await seriesRes.json();

      const parsedChannels: Channel[] = Array.isArray(liveData) ? liveData.map((channel: any): Channel => {
        const catInfo = categoryMap.get(String(channel.category_id)) || { name: 'Live-TV', isAdult: false };

        let extension = channel.stream_type;
        if (!extension || extension === 'live') {
          extension = liveExtension;
        }

        return {
          id: String(channel.stream_id),
          name: channel.name,
          url: `${cleanServerUrl}/live/${encodeURIComponent(username)}/${encodeURIComponent(password || '')}/${encodeURIComponent(channel.stream_id)}.${encodeURIComponent(extension || '')}`,
          logo: channel.stream_icon,
          group: catInfo.name,
          tvgId: channel.epg_channel_id,
          epgChannelId: channel.epg_channel_id,
          streamId: channel.stream_id,
          categoryId: String(channel.category_id),
          containerExtension: extension,
          isAdult: catInfo.isAdult,
          tvArchive: channel.tv_archive !== undefined ? Number(channel.tv_archive) : undefined,
          tvArchiveDuration: channel.tv_archive_duration !== undefined ? Number(channel.tv_archive_duration) : undefined,
          catchupDays: channel.tv_archive_duration !== undefined ? Number(channel.tv_archive_duration) : undefined,
        };
      }) : [];
      setChannels(parsedChannels);

      const normalizeXtreamImageUrl = (raw: unknown): string | undefined => {
        if (typeof raw !== 'string') return undefined;
        const normalized = raw.trim().replace(/\\\//g, '/');
        if (!normalized) return undefined;
        if (normalized.startsWith('//')) return encodeURI(`https:${normalized}`);
        if (/^https?:\/\//i.test(normalized)) return encodeURI(normalized);
        if (normalized.startsWith('/')) return encodeURI(`${cleanServerUrl}${normalized}`);
        if (normalized.startsWith('www.')) return encodeURI(`https://${normalized}`);
        if (/^[a-z0-9.-]+\.[a-z]{2,}(\/|$)/i.test(normalized)) return encodeURI(`https://${normalized}`);
        if (/^[^/][^:]*\/.+/.test(normalized)) return encodeURI(`${cleanServerUrl}/${normalized.replace(/^\/+/, '')}`);
        return undefined;
      };

      const parsedMovies: Movie[] = Array.isArray(vodData) ? vodData.map((movie: any): Movie => {
        const catInfo = categoryMap.get(String(movie.category_id)) || { name: 'VOD', isAdult: false };
        const movieCover =
          normalizeXtreamImageUrl(movie.stream_icon) ||
          normalizeXtreamImageUrl(movie.cover) ||
          normalizeXtreamImageUrl(movie.movie_image) ||
          normalizeXtreamImageUrl(movie.poster) ||
          normalizeXtreamImageUrl(movie.poster_path);
        return {
          id: String(movie.stream_id),
          name: movie.name,
          streamUrl: `${cleanServerUrl}/movie/${encodeURIComponent(username)}/${encodeURIComponent(password || '')}/${encodeURIComponent(movie.stream_id)}.${encodeURIComponent(movie.container_extension || '')}`,
          cover: movieCover,
          description: movie.plot || movie.description || movie.overview || '',
          group: catInfo.name,
          categoryId: String(movie.category_id),
          containerExtension: movie.container_extension,
          isAdult: catInfo.isAdult
        };
      }) : [];
      setMovies(parsedMovies);

      const parsedSeries: Series[] = Array.isArray(seriesData) ? seriesData.map((series: any): Series => {
        const catInfo = categoryMap.get(String(series.category_id)) || { name: 'Series', isAdult: false };
        const seriesCover =
          normalizeXtreamImageUrl(series.cover) ||
          normalizeXtreamImageUrl(series.cover_big) ||
          normalizeXtreamImageUrl(series.stream_icon) ||
          normalizeXtreamImageUrl(series.poster) ||
          normalizeXtreamImageUrl(series.poster_path);
        return {
          id: String(series.series_id),
          name: series.name,
          cover: seriesCover,
          description: series.plot || series.description || series.overview || '',
          group: catInfo.name,
          categoryId: String(series.category_id),
          seasons: [],
          seasonCount: resolveSeriesSeasonCount(series),
          isAdult: catInfo.isAdult
        };
      }) : [];
      setSeries(parsedSeries);
      setHasAdultContent(detectAdultContent(parsedChannels, parsedMovies, parsedSeries));

      providerInfo.channelsCount = parsedChannels.length;
      providerInfo.moviesCount = parsedMovies.length;
      providerInfo.seriesCount = parsedSeries.length;

      updateProfileInfo(profile.id, providerInfo);

      // Save to cache
      try {
          const cacheDataStr = JSON.stringify({
              channels: parsedChannels,
              movies: parsedMovies,
              series: parsedSeries
          });

          if (Platform.OS === 'web') {
            await AsyncStorage.setItem(cacheKey, cacheDataStr);
          } else {
            const cacheDir = Platform.isTV ? Paths.cache : Paths.document;
            const file = new File(cacheDir, `${cacheKey}.json`);
            await file.write(cacheDataStr);
          }
      } catch (e) {
          Logger.error("Failed to save Xtream cache", e);
      }

    } catch (e: any) {
      Logger.error("Error fetching Xtream streams", sanitizeError(e));
      throw new Error(e.message === i18n.t('corsError') ? i18n.t('corsError') : i18n.t('loadStreamsError'));
    }
  }, [detectAdultContent, updateProfileInfo]);

  const getSeriesInfo = useCallback(async (seriesId: string): Promise<any> => {
    if (currentProfile?.type !== 'xtream' && currentProfile?.type !== 'quickshare') return null;
    let url = '';
    if (currentProfile.type === 'xtream') {
      const { url: serverUrlProp, username, password } = currentProfile;
      const serverUrl = serverUrlProp || (currentProfile as any).serverUrl;
      if (!serverUrl) throw new Error("Server URL is missing from profile");
      const cleanServerUrl = serverUrl.trim().replace(/\/+$/, '');
      url = `${cleanServerUrl}/player_api.php?username=${encodeURIComponent(username || '')}&password=${encodeURIComponent(password || '')}&action=get_series_info&series_id=${encodeURIComponent(seriesId)}`;
    } else {
      const shareConfig = await resolveQuickshareConfig(currentProfile.url);
      url = `${shareConfig.apiBase}&action=get_series_info&series_id=${encodeURIComponent(seriesId)}`;
    }
    try {
      const response = await fetchWithProxy(url);
      if (response.ok) {
        return await response.json();
      }
    } catch (e) {
      Logger.error("Failed to get series info:", sanitizeError(e));
    }
    return null;
  }, [currentProfile]);

  const getVodInfo = useCallback(async (vodId: string): Promise<any> => {
    if (currentProfile?.type !== 'xtream' && currentProfile?.type !== 'quickshare') return null;
    let url = '';
    if (currentProfile.type === 'xtream') {
      const { url: serverUrlProp, username, password } = currentProfile;
      const serverUrl = serverUrlProp || (currentProfile as any).serverUrl;
      if (!serverUrl) throw new Error("Server URL is missing from profile");
      const cleanServerUrl = serverUrl.trim().replace(/\/+$/, '');
      url = `${cleanServerUrl}/player_api.php?username=${encodeURIComponent(username || '')}&password=${encodeURIComponent(password || '')}&action=get_vod_info&vod_id=${encodeURIComponent(vodId)}`;
    } else {
      const shareConfig = await resolveQuickshareConfig(currentProfile.url);
      url = `${shareConfig.apiBase}&action=get_vod_info&vod_id=${encodeURIComponent(vodId)}`;
    }
    try {
      const response = await fetchWithProxy(url);
      if (response.ok) {
        return await response.json();
      }
    } catch (e) {
      Logger.error("Failed to get VOD info:", sanitizeError(e));
    }
    return null;
  }, [currentProfile]);

  const playStream = useCallback((stream: PlaybackStream) => {
    setCurrentStream(stream);
  }, []);

  const stopStream = useCallback(() => {
    setCurrentStream(null);
  }, []);

  // --- Favorites with full metadata ---
  const addFavorite = useCallback(async (item: FavoriteItem) => {
    try {
      let newFavorites: FavoriteItem[] | null = null;
      setFavorites(prev => {
        if (prev.some(f => f.id === item.id && f.type === item.type)) {
          return prev;
        }
        newFavorites = [item, ...prev];
        return newFavorites;
      });

      if (newFavorites) {
        await AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(newFavorites));
      }
    } catch (e) {
      Logger.error("Error adding to favorites", e);
    }
  }, []);

  const removeFavorite = useCallback(async (id: string) => {
    try {
      let newFavorites: FavoriteItem[] | null = null;
      setFavorites(prev => {
        const next = prev.filter(favItem => favItem.id !== id);
        if (next.length === prev.length) {
          return prev;
        }
        newFavorites = next;
        return next;
      });

      if (newFavorites) {
        await AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(newFavorites));
      }
    } catch (e) {
      Logger.error("Error removing from favorites", e);
    }
  }, []);

  // ⚡ Bolt: Use a derived Set for O(1) favorite lookups instead of O(N) array.some()
  // This drastically reduces main thread blocking when rendering thousands of channels in EpgTimeline
  const favoritesSet = useMemo(() => new Set(favorites.map(f => f.id)), [favorites]);

  const isFavorite = useCallback((id: string) => {
    return favoritesSet.has(id);
  }, [favoritesSet]);

  const adultContentLookup = useMemo(() => ({ channels, movies, series }), [channels, movies, series]);
  const visibleRecentlyWatched = useMemo(
    () => filterNonAdultRecentlyWatched(recentlyWatched, adultContentLookup),
    [recentlyWatched, adultContentLookup],
  );

  useEffect(() => {
    setRecentlyWatched(prev => {
      const filtered = filterNonAdultRecentlyWatched(prev, adultContentLookup);
      if (filtered.length === prev.length) return prev;

      AsyncStorage.setItem(RECENTLY_WATCHED_KEY, JSON.stringify(filtered)).catch(e => {
        Logger.error("Error pruning adult recently watched items", e);
      });
      return filtered;
    });
  }, [adultContentLookup]);

  // --- Recently Watched with progress ---
  const addRecentlyWatched = useCallback(async (item: RecentlyWatchedItem) => {
    try {
      if (isAdultRecentlyWatchedItem(item, adultContentLookup)) {
        setRecentlyWatched(prev => {
          const filtered = prev.filter(r => !(r.id === item.id && r.type === item.type));
          if (filtered.length === prev.length) return prev;

          AsyncStorage.setItem(RECENTLY_WATCHED_KEY, JSON.stringify(filtered)).catch(e => {
            Logger.error("Error removing adult item from recently watched", e);
          });
          return filtered;
        });
        return;
      }

      setRecentlyWatched(prev => {
        const filtered = prev.filter(r => !(r.id === item.id && r.type === item.type));
        const newRecents = [item, ...filtered].slice(0, 50); // Keep last 50
        AsyncStorage.setItem(RECENTLY_WATCHED_KEY, JSON.stringify(newRecents)).catch(e => {
          Logger.error("Error adding to recently watched", e);
        });
        return newRecents;
      });
    } catch (e) {
      Logger.error("Error adding to recently watched", e);
    }
  }, [adultContentLookup]);

  const updatePlaybackPosition = useCallback(async (id: string, position: number, duration?: number) => {
    try {
      setRecentlyWatched(prev => {
        const index = prev.findIndex(r => r.id === id);
        if (index >= 0) {
          const updated = prev.map((r, i) =>
            i === index ? { ...r, lastWatchedAt: Date.now(), position, duration: duration ?? r.duration } : r
          );
          AsyncStorage.setItem(RECENTLY_WATCHED_KEY, JSON.stringify(updated)).catch(e => {
            Logger.error("Error saving updated playback position", e);
          });
          return updated;
        }
        return prev;
      });
    } catch (e) {
      Logger.error("Error updating playback position", e);
    }
  }, []);

  const removeRecentlyWatched = useCallback(async (id: string) => {
    try {
      const newRecents = recentlyWatched.filter(r => r.id !== id);
      setRecentlyWatched(newRecents);
      await AsyncStorage.setItem(RECENTLY_WATCHED_KEY, JSON.stringify(newRecents));
    } catch (e) {
      Logger.error("Error removing from recently watched", e);
    }
  }, [recentlyWatched]);

  const clearRecentlyWatched = useCallback(async () => {
    try {
      setRecentlyWatched([]);
      await AsyncStorage.setItem(RECENTLY_WATCHED_KEY, JSON.stringify([]));
    } catch (e) {
      Logger.error("Error clearing recently watched", e);
    }
  }, []);

  // --- Channel Lock/Unlock ---
  const lockChannel = useCallback(async (id: string) => {
    try {
      let newLocked: string[] | null = null;
      setLockedChannels(prev => {
        if (prev.includes(id)) {
          return prev;
        }
        newLocked = [...prev, id];
        return newLocked;
      });

      if (newLocked) {
        await AsyncStorage.setItem(LOCKED_CHANNELS_KEY, JSON.stringify(newLocked));
      }
    } catch (e) {
      Logger.error("Error locking channel", e);
    }
  }, []);

  const unlockChannel = useCallback(async (id: string) => {
    try {
      let newLocked: string[] | null = null;
      setLockedChannels(prev => {
        const next = prev.filter(chId => chId !== id);
        if (next.length === prev.length) {
          return prev;
        }
        newLocked = next;
        return next;
      });

      if (newLocked) {
        await AsyncStorage.setItem(LOCKED_CHANNELS_KEY, JSON.stringify(newLocked));
      }
    } catch (e) {
      Logger.error("Error unlocking channel", e);
    }
  }, []);

  const lockedChannelsSet = useMemo(() => new Set(lockedChannels), [lockedChannels]);

  const isChannelLocked = useCallback((id: string) => {
    return lockedChannelsSet.has(id);
  }, [lockedChannelsSet]);

  // --- PIN Management ---
  const setPinCode = useCallback(async (newPin: string | null) => {
    try {
       if (newPin) {
          const salt = bcrypt.genSaltSync(10);
          const hashedPin = bcrypt.hashSync(newPin, salt);
          setPin(hashedPin);
          await AsyncStorage.setItem(PIN_STORAGE_KEY, hashedPin);
       } else {
          setPin(null);
          await AsyncStorage.removeItem(PIN_STORAGE_KEY);
          setIsAdultUnlocked(false);
       }
    } catch (e) {
       Logger.error("Error configuring PIN code", e);
    }
  }, []);

  const unlockAdultContent = useCallback((pinInput: string) => {
     if (pin && bcrypt.compareSync(pinInput, pin)) {
        setIsAdultUnlocked(true);
        return true;
     }
     return false;
  }, [pin]);

  const lockAdultContent = useCallback(() => {
     setIsAdultUnlocked(false);
  }, []);

  // --- Catchup/Archive Support ---
  const getCatchupUrl = useCallback((channel: Channel, startTime: Date | number, endTime: Date | number): string | null => {
    if (!currentProfile) return null;

    if (currentProfile.type === 'xtream') {
      const xtreamProfile = currentProfile as XtreamProfile;
      return generateCatchupUrl(
        channel,
        startTime,
        endTime,
        xtreamProfile.url,
        xtreamProfile.username,
        xtreamProfile.password || ''
      );
    } else if (currentProfile.type === 'm3u') {
      // For M3U, use the catchup type stored in catchupId (e.g. "shift", "flussonic", "archive")
      const catchupType = (channel.catchupId as CatchupType) || 'default';
      const config: CatchupConfig = { type: catchupType, source: channel.catchupSource };
      return generateCatchupUrl(channel, startTime, endTime, '', '', '', config);
    }

    return null;
  }, [currentProfile]);

  const hasCatchup = useCallback((channel: Channel): boolean => {
    return hasCatchupSupport(channel);
  }, []);

  const contextValue = useMemo(() => ({
    isInitializing,
    profiles,
    currentProfile,
    channels,
    movies,
    series,
    currentStream,
    favorites,
    recentlyWatched: visibleRecentlyWatched,
    pin,
    isAdultUnlocked,
    isLoading,
    error,
    addProfile,
    removeProfile,
    editProfile,
    loadProfile,
    unloadProfile,
    setCurrentProfile,
    playStream,
    stopStream,
    addFavorite,
    removeFavorite,
    isFavorite,
    addRecentlyWatched,
    updatePlaybackPosition,
    removeRecentlyWatched,
    clearRecentlyWatched,
    setPinCode,
    unlockAdultContent,
    lockAdultContent,
    epg,
    loadEPG,
    getSeriesInfo,
    getVodInfo,
    lockedChannels,
    lockChannel,
    unlockChannel,
    isChannelLocked,
    getCatchupUrl,
    hasCatchup,
    isUpdating,
    setIsUpdating,
    hasCheckedOnStartup,
    setHasCheckedOnStartup,
  }), [
    isInitializing,
    profiles,
    currentProfile,
    channels,
    movies,
    series,
    currentStream,
    favorites,
    visibleRecentlyWatched,
    pin,
    isAdultUnlocked,
    isLoading,
    error,
    addProfile,
    removeProfile,
    editProfile,
    loadProfile,
    unloadProfile,
    setCurrentProfile,
    playStream,
    stopStream,
    addFavorite,
    removeFavorite,
    isFavorite,
    addRecentlyWatched,
    updatePlaybackPosition,
    removeRecentlyWatched,
    clearRecentlyWatched,
    setPinCode,
    unlockAdultContent,
    lockAdultContent,
    epg,
    loadEPG,
    getSeriesInfo,
    getVodInfo,
    lockedChannels,
    lockChannel,
    unlockChannel,
    isChannelLocked,
    getCatchupUrl,
    hasCatchup,
    isUpdating,
    setIsUpdating,
    hasCheckedOnStartup,
    setHasCheckedOnStartup,
  ]);

  const playbackValue = useMemo<IPTVPlaybackContextType>(() => ({
    currentStream,
    playStream,
    stopStream,
  }), [currentStream, playStream, stopStream]);
  const libraryValue = useMemo<IPTVLibraryContextType>(() => ({
    channels,
    movies,
    series,
    epg,
    hasAdultContent,
  }), [channels, movies, series, epg, hasAdultContent]);
  const collectionsValue = useMemo<IPTVCollectionsContextType>(() => ({
    favorites,
    recentlyWatched: visibleRecentlyWatched,
    addFavorite,
    removeFavorite,
    isFavorite,
    addRecentlyWatched,
    updatePlaybackPosition,
    removeRecentlyWatched,
    clearRecentlyWatched,
  }), [
    favorites,
    visibleRecentlyWatched,
    addFavorite,
    removeFavorite,
    isFavorite,
    addRecentlyWatched,
    updatePlaybackPosition,
    removeRecentlyWatched,
    clearRecentlyWatched,
  ]);
  const parentalValue = useMemo<IPTVParentalContextType>(() => ({
    pin,
    isAdultUnlocked,
    lockedChannels,
    setPinCode,
    unlockAdultContent,
    lockAdultContent,
    lockChannel,
    unlockChannel,
    isChannelLocked,
  }), [
    pin,
    isAdultUnlocked,
    lockedChannels,
    setPinCode,
    unlockAdultContent,
    lockAdultContent,
    lockChannel,
    unlockChannel,
    isChannelLocked,
  ]);
  const profilesValue = useMemo<IPTVProfilesContextType>(() => ({
    profiles,
    currentProfile,
    addProfile,
    editProfile,
    removeProfile,
    loadProfile,
    unloadProfile,
  }), [profiles, currentProfile, addProfile, editProfile, removeProfile, loadProfile, unloadProfile]);
  const appStateValue = useMemo<IPTVAppStateContextType>(() => ({
    isInitializing,
    isLoading,
    isUpdating,
    error,
    hasCheckedOnStartup,
    setHasCheckedOnStartup,
  }), [isInitializing, isLoading, isUpdating, error, hasCheckedOnStartup, setHasCheckedOnStartup]);
  const guideValue = useMemo<IPTVGuideContextType>(() => ({
    epg,
    loadEPG,
    hasCatchup,
    getCatchupUrl,
  }), [epg, loadEPG, hasCatchup, getCatchupUrl]);
  const metadataValue = useMemo<IPTVMetadataContextType>(() => ({
    series,
    getSeriesInfo,
    getVodInfo,
  }), [series, getSeriesInfo, getVodInfo]);

  return (
    <IPTVPlaybackContext.Provider value={playbackValue}>
      <IPTVLibraryContext.Provider value={libraryValue}>
        <IPTVCollectionsContext.Provider value={collectionsValue}>
          <IPTVParentalContext.Provider value={parentalValue}>
            <IPTVProfilesContext.Provider value={profilesValue}>
              <IPTVAppStateContext.Provider value={appStateValue}>
                <IPTVGuideContext.Provider value={guideValue}>
                  <IPTVMetadataContext.Provider value={metadataValue}>
                    <IPTVContext.Provider value={contextValue}>
                      {children}
                    </IPTVContext.Provider>
                  </IPTVMetadataContext.Provider>
                </IPTVGuideContext.Provider>
              </IPTVAppStateContext.Provider>
            </IPTVProfilesContext.Provider>
          </IPTVParentalContext.Provider>
        </IPTVCollectionsContext.Provider>
      </IPTVLibraryContext.Provider>
    </IPTVPlaybackContext.Provider>
  );
};

export const useIPTV = () => {
  const context = useContext(IPTVContext);
  if (!context) {
    throw new Error('useIPTV() must be used within an IPTVProvider');
  }
  return context;
};

export const useIPTVPlayback = () => {
  const context = useContext(IPTVPlaybackContext);
  if (context === undefined) {
    throw new Error('useIPTVPlayback must be used within an IPTVProvider');
  }
  return context;
};

export const useIPTVLibrary = () => {
  const context = useContext(IPTVLibraryContext);
  if (context === undefined) {
    throw new Error('useIPTVLibrary must be used within an IPTVProvider');
  }
  return context;
};

export const useIPTVCollections = () => {
  const context = useContext(IPTVCollectionsContext);
  if (context === undefined) {
    throw new Error('useIPTVCollections must be used within an IPTVProvider');
  }
  return context;
};

export const useIPTVParental = () => {
  const context = useContext(IPTVParentalContext);
  if (context === undefined) {
    throw new Error('useIPTVParental must be used within an IPTVProvider');
  }
  return context;
};

export const useIPTVProfiles = () => {
  const context = useContext(IPTVProfilesContext);
  if (context === undefined) {
    throw new Error('useIPTVProfiles must be used within an IPTVProvider');
  }
  return context;
};

export const useIPTVAppState = () => {
  const context = useContext(IPTVAppStateContext);
  if (context === undefined) {
    throw new Error('useIPTVAppState must be used within an IPTVProvider');
  }
  return context;
};

export const useIPTVGuide = () => {
  const context = useContext(IPTVGuideContext);
  if (context === undefined) {
    throw new Error('useIPTVGuide must be used within an IPTVProvider');
  }
  return context;
};

export const useIPTVMetadata = () => {
  const context = useContext(IPTVMetadataContext);
  if (context === undefined) {
    throw new Error('useIPTVMetadata must be used within an IPTVProvider');
  }
  return context;
};
