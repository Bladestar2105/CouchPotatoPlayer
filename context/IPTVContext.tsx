import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { File, Directory, Paths } from 'expo-file-system';

import i18n from '../utils/i18n';
import {
  IPTVContextType,
  IPTVProfile,
  XtreamProfile,
  Channel,
  Movie,
  Series,
  Season,
  Episode,
  EPGProgram,
  FavoriteItem,
  RecentlyWatchedItem
} from '../types';
import { generateCatchupUrl, hasCatchupSupport } from '../utils/catchupUtils';
import { parseXMLTVFromString } from '../utils/epgParser';

const seriesRegex = /(.*?) S(\d+) E(\d+)/i;
const PROFILES_STORAGE_KEY = 'IPTV_PROFILES';
const CURRENT_PROFILE_STORAGE_KEY = 'IPTV_CURRENT_PROFILE';
const FAVORITES_STORAGE_KEY = 'IPTV_FAVORITES';
const RECENTLY_WATCHED_KEY = 'IPTV_RECENTLY_WATCHED';
const PIN_STORAGE_KEY = 'IPTV_PIN';
const LOCKED_CHANNELS_KEY = 'IPTV_LOCKED_CHANNELS';
const EPG_STORAGE_KEY_PREFIX = 'IPTV_EPG_';

const CACHE_EXPIRATION_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Decode Base64 string if needed (Flutter migration)
 * Xtream EPG sometimes returns base64-encoded titles
 */
const decodeBase64IfNeeded = (text: string): string => {
  if (!text || text.length === 0) return text;
  try {
    // Simple heuristic: if it doesn't contain spaces and length is divisible by 4, it might be base64
    if (!text.includes(' ') && text.length % 4 === 0) {
      // Try to decode in web environment
      if (Platform.OS === 'web') {
        const decoded = atob(text);
        // Check if it's valid UTF-8
        if (!decoded.includes('�')) {
          return decoded;
        }
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
      console.warn(`CORS Error for: ${url}`);
      
      // Use nginx proxy configured in the Docker container
      // The nginx proxy is available at /proxy/ endpoint
      const proxyUrl = `/proxy/${url}`;
      try {
        console.log(`Using nginx proxy for: ${url}`);
        const response = await fetch(proxyUrl, options);
        if (response.ok) {
          console.log(`Nginx proxy succeeded`);
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

export const IPTVProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profiles, setProfiles] = useState<IPTVProfile[]>([]);
  const [currentProfile, setCurrentProfile] = useState<IPTVProfile | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  const [currentStream, setCurrentStream] = useState<{ url: string; id: string; } | null>(null);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [recentlyWatched, setRecentlyWatched] = useState<RecentlyWatchedItem[]>([]);
  const [epg, setEpg] = useState<Record<string, EPGProgram[]>>({});
  const [pin, setPin] = useState<string | null>(null);
  const [isAdultUnlocked, setIsAdultUnlocked] = useState<boolean>(false);
  const [lockedChannels, setLockedChannels] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDataFromStorage = async () => {
      try {
        const profilesJson = await AsyncStorage.getItem(PROFILES_STORAGE_KEY);
        let loadedProfiles: IPTVProfile[] = [];
        if (profilesJson) {
          try {
            loadedProfiles = JSON.parse(profilesJson);
            setProfiles(loadedProfiles);
          } catch (parseError) {
            console.error("Profile data corrupted, cleaning up...", parseError);
            await AsyncStorage.removeItem(PROFILES_STORAGE_KEY);
            setProfiles([]);
          }
        }

        const currentProfileId = await AsyncStorage.getItem(CURRENT_PROFILE_STORAGE_KEY);
        if (currentProfileId && loadedProfiles.length > 0) {
          const profileToLoad = loadedProfiles.find(p => p.id === currentProfileId);
          if (profileToLoad) {
            loadProfile(profileToLoad);
          }
        }

        const favoritesJson = await AsyncStorage.getItem(FAVORITES_STORAGE_KEY);
        if (favoritesJson) {
          try {
            const storedFavorites: FavoriteItem[] = JSON.parse(favoritesJson);
            setFavorites(storedFavorites);
          } catch (parseError) {
             console.error("Favorites data corrupted, cleaning up...", parseError);
             await AsyncStorage.removeItem(FAVORITES_STORAGE_KEY);
             setFavorites([]);
          }
        }

        const recentlyWatchedJson = await AsyncStorage.getItem(RECENTLY_WATCHED_KEY);
        if (recentlyWatchedJson) {
          try {
            const storedRecents: RecentlyWatchedItem[] = JSON.parse(recentlyWatchedJson);
            setRecentlyWatched(storedRecents);
          } catch (parseError) {
            console.error("Recently watched data corrupted, cleaning up...", parseError);
            await AsyncStorage.removeItem(RECENTLY_WATCHED_KEY);
            setRecentlyWatched([]);
          }
        }

        const storedPin = await AsyncStorage.getItem(PIN_STORAGE_KEY);
        if (storedPin) {
           setPin(storedPin);
        }

        const lockedJson = await AsyncStorage.getItem(LOCKED_CHANNELS_KEY);
        if (lockedJson) {
          try {
            const storedLocked: string[] = JSON.parse(lockedJson);
            setLockedChannels(storedLocked);
          } catch (parseError) {
            console.error("Locked channels data corrupted, cleaning up...", parseError);
            await AsyncStorage.removeItem(LOCKED_CHANNELS_KEY);
            setLockedChannels([]);
          }
        }
      } catch (e) {
        console.error("Failed to load data from storage", e);
      }
    };
    loadDataFromStorage();
  }, []);

  const addProfile = async (profile: IPTVProfile) => {
    try {
      const newProfiles = [...profiles, profile];
      setProfiles(newProfiles);
      await AsyncStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(newProfiles));
    } catch (e) {
      console.error("Failed to save profile", e);
    }
  };

  const removeProfile = async (id: string) => {
    try {
      const newProfiles = profiles.filter(profile => profile.id !== id);
      setProfiles(newProfiles);
      await AsyncStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(newProfiles));
      if (currentProfile?.id === id) {
        unloadProfile();
      }
    } catch (e) {
      console.error("Failed to remove profile", e);
    }
  };

  const editProfile = async (updatedProfile: IPTVProfile) => {
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
      console.error("Failed to edit profile", e);
    }
  };

  const loadProfile = async (profile: IPTVProfile) => {
    setIsLoading(true);
    setError(null);
    setChannels([]);
    setMovies([]);
    setSeries([]);
    setEpg({});

    try {
      // SSRF mitigation: validate URL starts with http:// or https://
      const isValidUrl = (url: string) => /^https?:\/\//i.test(url.trim());

      if (profile.type === 'm3u') {
        if (!isValidUrl(profile.url)) {
          throw new Error('Invalid URL. M3U URL must start with http:// or https://');
        }
        await loadM3U(profile.url.trim().replace(/\/+$/, ''));
      }
      else if (profile.type === 'xtream') {
        const serverUrl = profile.url || (profile as any).serverUrl;
        if (!isValidUrl(serverUrl)) {
          throw new Error('Invalid URL. Xtream server URL must start with http:// or https://');
        }
        await loadXtream(profile);
      }
      else if (profile.type === 'stalker') {
        console.warn(i18n.t('stalkerNotImplemented'));
      }
      setCurrentProfile(profile);
      await AsyncStorage.setItem(CURRENT_PROFILE_STORAGE_KEY, profile.id);
    } catch (e: any) {
      console.error("Failed to load profile:", e);
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
      setIsLoading(false);
    }
  };

  const unloadProfile = async () => {
    setCurrentProfile(null);
    setChannels([]);
    setMovies([]);
    setSeries([]);
    setEpg({});
    setError(null);
    setCurrentStream(null);
    await AsyncStorage.removeItem(CURRENT_PROFILE_STORAGE_KEY);
  };

  const loadEPG = async () => {
    if (!currentProfile) return;

    console.log('[EPG] Starting EPG load...');
    const storageKey = `${EPG_STORAGE_KEY_PREFIX}${currentProfile.id}`;

    try {
      // 1. Try to load from cache
      let cachedEpgStr: string | null = null;
      if (Platform.OS === 'web') {
        cachedEpgStr = await AsyncStorage.getItem(storageKey);
      } else {
        const file = new File(Paths.document, `${storageKey}.json`);
        try {
          if (file.exists) {
            cachedEpgStr = await file.text();
          }
        } catch (e) {
          // File does not exist or cannot be read
        }
      }

      if (cachedEpgStr) {

        const cachedEpg = JSON.parse(cachedEpgStr);
        if (Date.now() - cachedEpg.timestamp < CACHE_EXPIRATION_MS) {
          // Re-hydrate Date objects
          console.log('[EPG] Using cached EPG data');
          const hydratedEpg: Record<string, EPGProgram[]> = {};
          for (const channelId in cachedEpg.data) {
            hydratedEpg[channelId] = cachedEpg.data[channelId].map((p: any) => ({
              ...p,
              start: new Date(p.start),
              end: new Date(p.end),
            }));
          }
          setEpg(hydratedEpg);
          return;
        }
      }

      // 2. Fetch fresh EPG
      let epgUrl = '';
      if (currentProfile.type === 'm3u' && currentProfile.epgUrl) {
         epgUrl = currentProfile.epgUrl;
      } else if (currentProfile.type === 'xtream') {
        const { url: serverUrlProp, username, password } = currentProfile;
        const serverUrl = serverUrlProp || (currentProfile as any).serverUrl;
        if (!serverUrl) throw new Error("Server URL is missing from profile");
        const cleanServerUrl = serverUrl.trim().replace(/\/+$/, '');
        epgUrl = `${cleanServerUrl}/xmltv.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password || '')}`;
      }

      if (epgUrl) {
        // SSRF mitigation: validate URL starts with http:// or https://
        if (!/^https?:\/\//i.test(epgUrl.trim())) {
          console.error('[EPG] Invalid EPG URL scheme. Must start with http:// or https://');
          return;
        }

        console.log('[EPG] Fetching EPG from:', epgUrl);
        
        // Use CORS proxy for fetching EPG
        const response = await fetchWithProxy(epgUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch EPG: ${response.status}`);
        }
        
        const xmlData = await response.text();
        console.log('[EPG] Received XML data, length:', xmlData.length);
        
        // Parse the XML data
        const epgData = parseXMLTVFromString(xmlData);
        console.log('[EPG] Parsed EPG data for', Object.keys(epgData).length, 'channels');
        
        const newEpg: Record<string, EPGProgram[]> = {};
        for (const channelId in epgData) {
          newEpg[channelId] = epgData[channelId].map((p: any) => ({
            id: Math.random().toString(),
            channelId: p.channelId,
            title: decodeBase64IfNeeded(p.title), // Decode base64 if needed
            description: decodeBase64IfNeeded(p.description || ''),
            start: p.start,
            end: p.end,
          }));
        }
        setEpg(newEpg);
        console.log('[EPG] EPG loaded successfully');

        const epgCacheData = JSON.stringify({
          timestamp: Date.now(),
          data: newEpg
        });

        if (Platform.OS === 'web') {
          try {
            await AsyncStorage.setItem(storageKey, epgCacheData);
          } catch (storageError: any) {
             console.warn('[EPG] Failed to save EPG to AsyncStorage (likely QuotaExceededError on web)', storageError);
          }
        } else {
          const file = new File(Paths.document, `${storageKey}.json`);
          await file.write(epgCacheData);
        }
      } else {
        console.log('[EPG] No EPG URL available');
      }
    } catch (e) {
      console.error("[EPG] Failed to load EPG", e);
    }
  };

  const loadM3U = async (url: string) => {
    let m3uContent = '';
    try {
      const response = await fetchWithProxy(url);
      if (!response.ok) throw new Error(i18n.t('networkError', { status: response.status }));
      m3uContent = await response.text();
    } catch (fetchError: any) {
      console.error("Network error fetching M3U:", fetchError);
      throw new Error(fetchError.message === i18n.t('corsError') ? i18n.t('corsError') : i18n.t('m3uDownloadError'));
    }

    try {
      const { channels, movies, series } = parseM3U(m3uContent);
      setChannels(channels);
      setMovies(movies);
      setSeries(series);

      if (channels.length === 0 && movies.length === 0 && series.length === 0) {
        throw new Error(i18n.t('m3uEmptyError'));
      }
    } catch (parseError: any) {
      console.error("M3U parsing error:", parseError);
      throw new Error(i18n.t('m3uFormatError'));
    }
  };

  const parseM3U = (m3uContent: string): { channels: Channel[], movies: Movie[], series: Series[] } => {
    const lines = m3uContent.split('\n');
    const channels: Channel[] = [];
    const movies: Movie[] = [];
    const seriesMap = new Map<string, Series>();
    let currentItemInfo: { name: string, logo?: string, group: string, tvgId?: string } | null = null;
    const infoRegex = /#EXTINF:[-0-9]+(.*),(.*)/;
    const tvgIdRegex = /tvg-id="([^"]*)"/;
    const tvgLogoRegex = /tvg-logo="([^"]*)"/;
    const groupTitleRegex = /group-title="([^"]*)"/;

    for (const line of lines) {
      if (line.startsWith('#EXTINF:')) {
        const infoMatch = line.match(infoRegex);
        if (infoMatch) {
          const attributes = infoMatch[1] || '';
          const name = infoMatch[2] || 'Unknown';
          currentItemInfo = { name: name.trim(), tvgId: attributes.match(tvgIdRegex)?.[1], logo: attributes.match(tvgLogoRegex)?.[1], group: attributes.match(groupTitleRegex)?.[1] || 'Unknown' };
        }
      } else if ((line.startsWith('http://') || line.startsWith('https://')) && currentItemInfo) {
        const url = line.trim();
        if (url.includes('/movie/')) {
          movies.push({ id: url, name: currentItemInfo.name, streamUrl: url, cover: currentItemInfo.logo, group: currentItemInfo.group });
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
          }
          const currentSeries = seriesMap.get(seriesName)!;

          let currentSeason = currentSeries.seasons.find(s => s.seasonNumber === seasonNum);
          if (!currentSeason) {
            currentSeason = { id: `${seriesName}-S${seasonNum}`, name: `Season ${seasonNum}`, seasonNumber: seasonNum, episodes: [] };
            currentSeries.seasons.push(currentSeason);
            currentSeries.seasons.sort((a, b) => a.seasonNumber - b.seasonNumber);
          }

          currentSeason.episodes.push({ id: url, name: episodeName, streamUrl: url, episodeNumber: episodeNum });
          currentSeason.episodes.sort((a, b) => a.episodeNumber - b.episodeNumber);

        } else {
          channels.push({ id: currentItemInfo.tvgId || url, name: currentItemInfo.name, url: url, logo: currentItemInfo.logo, group: currentItemInfo.group, tvgId: currentItemInfo.tvgId });
        }
        currentItemInfo = null;
      }
    }
    const series = Array.from(seriesMap.values());
    return { channels, movies, series };
  };

  const loadXtream = async (profile: IPTVProfile) => {
    if (profile.type !== 'xtream') return;

    const { url: serverUrlProp, username, password } = profile;
    const serverUrl = serverUrlProp || (profile as any).serverUrl;
    if (!serverUrl) throw new Error("Server URL is missing from profile");
    const cleanServerUrl = serverUrl.trim().replace(/\/+$/, '');
    const baseUrl = `${cleanServerUrl}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password || '')}`;

    let authResponse;
    let liveExtension = 'ts';
    try {
      authResponse = await fetchWithProxy(baseUrl);
      if (!authResponse.ok) throw new Error(i18n.t('serverError', { status: authResponse.status }));

      const authData = await authResponse.json();
      if (authData.user_info.auth === 0) {
        throw new Error(i18n.t('authFailed'));
      }

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
      console.error("Network error during Xtream auth:", e);
      throw new Error(e.message === i18n.t('corsError') ? i18n.t('corsError') : i18n.t('connectionFailed'));
    }

    const liveCategoriesUrl = `${baseUrl}&action=get_live_categories`;
    const vodCategoriesUrl = `${baseUrl}&action=get_vod_categories`;
    const seriesCategoriesUrl = `${baseUrl}&action=get_series_categories`;

    try {
      const [liveCatRes, vodCatRes, seriesCatRes] = await Promise.all([
        fetchWithProxy(liveCategoriesUrl),
        fetchWithProxy(vodCategoriesUrl),
        fetchWithProxy(seriesCategoriesUrl)
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
        fetchWithProxy(allStreamsUrl),
        fetchWithProxy(vodStreamsUrl),
        fetchWithProxy(seriesStreamsUrl)
      ]);

      const liveData = await liveRes.json();
      const vodData = await vodRes.json();
      const seriesData = await seriesRes.json();

      const parsedChannels: Channel[] = Array.isArray(liveData) ? liveData.map((channel: any): Channel => {
        const catInfo = categoryMap.get(String(channel.category_id)) || { name: 'Live TV', isAdult: false };

        let extension = channel.stream_type;
        if (!extension || extension === 'live') {
          extension = liveExtension;
        }

        return {
          id: String(channel.stream_id),
          name: channel.name,
          url: `${cleanServerUrl}/live/${encodeURIComponent(username)}/${encodeURIComponent(password || '')}/${channel.stream_id}.${extension}`,
          logo: channel.stream_icon,
          group: catInfo.name,
          tvgId: channel.epg_channel_id,
          epgChannelId: channel.epg_channel_id,
          streamId: channel.stream_id,
          categoryId: String(channel.category_id),
          containerExtension: extension,
          isAdult: catInfo.isAdult
        };
      }) : [];
      setChannels(parsedChannels);

      const parsedMovies: Movie[] = Array.isArray(vodData) ? vodData.map((movie: any): Movie => {
        const catInfo = categoryMap.get(String(movie.category_id)) || { name: 'VOD', isAdult: false };
        return {
          id: String(movie.stream_id),
          name: movie.name,
          streamUrl: `${cleanServerUrl}/movie/${encodeURIComponent(username)}/${encodeURIComponent(password || '')}/${movie.stream_id}.${movie.container_extension}`,
          cover: movie.stream_icon,
          group: catInfo.name,
          categoryId: String(movie.category_id),
          containerExtension: movie.container_extension,
          isAdult: catInfo.isAdult
        };
      }) : [];
      setMovies(parsedMovies);

      const parsedSeries: Series[] = Array.isArray(seriesData) ? seriesData.map((series: any): Series => {
        const catInfo = categoryMap.get(String(series.category_id)) || { name: 'Series', isAdult: false };
        return {
          id: String(series.series_id),
          name: series.name,
          cover: series.cover,
          group: catInfo.name,
          categoryId: String(series.category_id),
          seasons: [],
          isAdult: catInfo.isAdult
        };
      }) : [];
      setSeries(parsedSeries);

    } catch (e: any) {
      console.error("Error fetching Xtream streams", e);
      throw new Error(e.message === i18n.t('corsError') ? i18n.t('corsError') : i18n.t('loadStreamsError'));
    }
  };

  const getSeriesInfo = async (seriesId: string): Promise<any> => {
    if (currentProfile?.type !== 'xtream') return null;
    const { url: serverUrlProp, username, password } = currentProfile;
    const serverUrl = serverUrlProp || (currentProfile as any).serverUrl;
    if (!serverUrl) throw new Error("Server URL is missing from profile");
    const cleanServerUrl = serverUrl.trim().replace(/\/+$/, '');
    const url = `${cleanServerUrl}/player_api.php?username=${encodeURIComponent(username || '')}&password=${encodeURIComponent(password || '')}&action=get_series_info&series_id=${seriesId}`;
    try {
      const response = await fetchWithProxy(url);
      if (response.ok) {
        return await response.json();
      }
    } catch (e) {
      console.error("Failed to get series info:", e);
    }
    return null;
  };

  const getVodInfo = async (vodId: string): Promise<any> => {
    if (currentProfile?.type !== 'xtream') return null;
    const { url: serverUrlProp, username, password } = currentProfile;
    const serverUrl = serverUrlProp || (currentProfile as any).serverUrl;
    if (!serverUrl) throw new Error("Server URL is missing from profile");
    const cleanServerUrl = serverUrl.trim().replace(/\/+$/, '');
    const url = `${cleanServerUrl}/player_api.php?username=${encodeURIComponent(username || '')}&password=${encodeURIComponent(password || '')}&action=get_vod_info&vod_id=${vodId}`;
    try {
      const response = await fetchWithProxy(url);
      if (response.ok) {
        return await response.json();
      }
    } catch (e) {
      console.error("Failed to get VOD info:", e);
    }
    return null;
  };

  const playStream = (stream: { url: string; id: string; }) => {
    setCurrentStream(stream);
  };

  // --- Favorites with full metadata (Flutter migration) ---
  const addFavorite = async (item: FavoriteItem) => {
    try {
      if (!favorites.some(f => f.id === item.id && f.type === item.type)) {
        const newFavorites = [item, ...favorites];
        setFavorites(newFavorites);
        await AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(newFavorites));
      }
    } catch (e) {
      console.error("Error adding to favorites", e);
    }
  };

  const removeFavorite = async (id: string) => {
    try {
      const newFavorites = favorites.filter(favItem => favItem.id !== id);
      setFavorites(newFavorites);
      await AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(newFavorites));
    } catch (e) {
      console.error("Error removing from favorites", e);
    }
  };

  const isFavorite = (id: string) => {
    return favorites.some(f => f.id === id);
  };

  // --- Recently Watched with progress (Flutter migration) ---
  const addRecentlyWatched = async (item: RecentlyWatchedItem) => {
    try {
      // Remove existing entry for this item
      const filtered = recentlyWatched.filter(r => !(r.id === item.id && r.type === item.type));
      const newRecents = [item, ...filtered].slice(0, 50); // Keep last 50
      setRecentlyWatched(newRecents);
      await AsyncStorage.setItem(RECENTLY_WATCHED_KEY, JSON.stringify(newRecents));
    } catch (e) {
      console.error("Error adding to recently watched", e);
    }
  };

  const updatePlaybackPosition = async (id: string, position: number, duration?: number) => {
    try {
      const index = recentlyWatched.findIndex(r => r.id === id);
      if (index >= 0) {
        const item = recentlyWatched[index];
        recentlyWatched[index] = {
          ...item,
          lastWatchedAt: Date.now(),
          position,
          duration: duration ?? item.duration,
        };
        setRecentlyWatched([...recentlyWatched]);
        await AsyncStorage.setItem(RECENTLY_WATCHED_KEY, JSON.stringify(recentlyWatched));
      }
    } catch (e) {
      console.error("Error updating playback position", e);
    }
  };

  const removeRecentlyWatched = async (id: string) => {
    try {
      const newRecents = recentlyWatched.filter(r => r.id !== id);
      setRecentlyWatched(newRecents);
      await AsyncStorage.setItem(RECENTLY_WATCHED_KEY, JSON.stringify(newRecents));
    } catch (e) {
      console.error("Error removing from recently watched", e);
    }
  };

  // --- Channel Lock/Unlock (Flutter migration) ---
  const lockChannel = async (id: string) => {
    try {
      if (!lockedChannels.includes(id)) {
        const newLocked = [...lockedChannels, id];
        setLockedChannels(newLocked);
        await AsyncStorage.setItem(LOCKED_CHANNELS_KEY, JSON.stringify(newLocked));
      }
    } catch (e) {
      console.error("Error locking channel", e);
    }
  };

  const unlockChannel = async (id: string) => {
    try {
      if (lockedChannels.includes(id)) {
        const newLocked = lockedChannels.filter(chId => chId !== id);
        setLockedChannels(newLocked);
        await AsyncStorage.setItem(LOCKED_CHANNELS_KEY, JSON.stringify(newLocked));
      }
    } catch (e) {
      console.error("Error unlocking channel", e);
    }
  };

  const isChannelLocked = (id: string) => {
    return lockedChannels.includes(id);
  };

  // --- PIN Management ---
  const setPinCode = async (newPin: string | null) => {
    try {
       setPin(newPin);
       if (newPin) {
          await AsyncStorage.setItem(PIN_STORAGE_KEY, newPin);
       } else {
          await AsyncStorage.removeItem(PIN_STORAGE_KEY);
          setIsAdultUnlocked(false);
       }
    } catch (e) {
       console.error("Error configuring PIN code", e);
    }
  };

  const unlockAdultContent = (pinInput: string) => {
     if (pin === pinInput) {
        setIsAdultUnlocked(true);
        return true;
     }
     return false;
  };

  const lockAdultContent = () => {
     setIsAdultUnlocked(false);
  };

  // --- Catchup/Archive Support ---
  const getCatchupUrl = (channel: Channel, startTime: Date, endTime: Date): string | null => {
    if (!currentProfile || currentProfile.type !== 'xtream') {
      return null;
    }
    const xtreamProfile = currentProfile as XtreamProfile;
    return generateCatchupUrl(
      channel,
      startTime,
      endTime,
      xtreamProfile.url,
      xtreamProfile.username,
      xtreamProfile.password || ''
    );
  };

  const hasCatchup = (channel: Channel): boolean => {
    return hasCatchupSupport(channel);
  };

  return (
    <IPTVContext.Provider
      value={{
        profiles,
        currentProfile,
        channels,
        movies,
        series,
        currentStream,
        favorites,
        recentlyWatched,
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
        addFavorite,
        removeFavorite,
        isFavorite,
        addRecentlyWatched,
        updatePlaybackPosition,
        removeRecentlyWatched,
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
      }}
    >
      {children}
    </IPTVContext.Provider>
  );
};

export const useIPTV = () => {
  const context = useContext(IPTVContext);
  if (!context) {
    throw new Error('useIPTV() doit être utilisé à l\'intérieur d\'un IPTVProvider');
  }
  return context;
};