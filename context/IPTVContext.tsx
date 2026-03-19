import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { XMLParser } from 'fast-xml-parser';
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
  EPGProgram
} from '../types';
import { parseXMLTV } from '../utils/epgParser';

const seriesRegex = /(.*?) S(\d+) E(\d+)/i;
const PROFILES_STORAGE_KEY = 'IPTV_PROFILES';
const CURRENT_PROFILE_STORAGE_KEY = 'IPTV_CURRENT_PROFILE';
const FAVORITES_STORAGE_KEY = 'IPTV_FAVORITES';
const RECENTLY_WATCHED_KEY = 'IPTV_RECENTLY_WATCHED';
const PIN_STORAGE_KEY = 'IPTV_PIN';
const EPG_STORAGE_KEY_PREFIX = 'IPTV_EPG_';

const CACHE_EXPIRATION_MS = 24 * 60 * 60 * 1000; // 24 hours

const fetchWithProxy = async (url: string, options?: RequestInit): Promise<Response> => {
  try {
    return await fetch(url, options);
  } catch (e: any) {
    if (Platform.OS === 'web' && e instanceof TypeError) {
      console.warn(`CORS Error, retrying with local Nginx proxy for: ${url}`);
      try {
        // Try the local Nginx proxy (works in Docker/production deployment)
        // We use `window.location.origin` to ensure it works on whichever port/host the app is served
        // Note: The URL is NOT encoded here because Nginx intercepts the path directly via regex match.
        // E.g., /proxy/http://example.com/api?user=1&pass=2 is matched as target_url=http://example.com/api?user=1&pass=2
        const localProxyUrl = `${window.location.origin}/proxy/${url}`;
        const localProxyResponse = await fetch(localProxyUrl, options);
        return localProxyResponse;
      } catch (localProxyError) {
        console.error("Local proxy fetch failed (ensure you are running the Docker container)", localProxyError);
        throw new Error(i18n.t('corsError'));
      }
    }
    throw e;
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
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recentlyWatched, setRecentlyWatched] = useState<string[]>([]);
  const [epg, setEpg] = useState<Record<string, EPGProgram[]>>({});
  const [pin, setPin] = useState<string | null>(null);
  const [isAdultUnlocked, setIsAdultUnlocked] = useState<boolean>(false);
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
            const storedFavorites = JSON.parse(favoritesJson);
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
            const storedRecents = JSON.parse(recentlyWatchedJson);
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
      if (profile.type === 'm3u') {
        await loadM3U(profile.url);
      }
      else if (profile.type === 'xtream') {

        await loadXtream(profile);
      }
      else if (profile.type === 'stalker') {
        console.warn(i18n.t('stalkerNotImplemented'));
      }
      setCurrentProfile(profile);
      await AsyncStorage.setItem(CURRENT_PROFILE_STORAGE_KEY, profile.id);
    } catch (e: any) {
      console.error("Failed to load profile:", e);
      setError(e.message || i18n.t('unknownError'));
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

    const storageKey = `${EPG_STORAGE_KEY_PREFIX}${currentProfile.id}`;

    try {
      // 1. Try to load from cache
      const cachedEpgStr = await AsyncStorage.getItem(storageKey);
      if (cachedEpgStr) {
        const cachedEpg = JSON.parse(cachedEpgStr);
        if (Date.now() - cachedEpg.timestamp < CACHE_EXPIRATION_MS) {
          // Re-hydrate Date objects
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
        const epgData = await parseXMLTV(epgUrl);
        const newEpg: Record<string, EPGProgram[]> = {};
        for (const channelId in epgData) {
          newEpg[channelId] = epgData[channelId].map((p: any) => ({
            id: Math.random().toString(),
            channelId: p.channelId,
            title: p.title,
            description: p.description,
            start: p.start,
            end: p.end,
          }));
        }
        setEpg(newEpg);

        // Save to cache without stringifying huge objects repeatedly
        // Fast JSON serialization is key here, we rely on the JS engine
        await AsyncStorage.setItem(storageKey, JSON.stringify({
          timestamp: Date.now(),
          data: newEpg
        }));
      }
    } catch (e) {
      console.error("Failed to load EPG", e);
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
      // fetchWithProxy already throws i18n.t('corsError') on web CORS failures
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
      throw new Error(i18n.t('m3uFormatError', { message: parseError.message }));
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

  // --- NOUVELLE LOGIQUE DE CHARGEMENT XTREAM ---
  const loadXtream = async (profile: IPTVProfile) => {
    // S'assurer que le profil est de type Xtream
    if (profile.type !== 'xtream') return;

    // Support backward compatibility for profiles stored with `serverUrl`
    const { url: serverUrlProp, username, password } = profile;
    const serverUrl = serverUrlProp || (profile as any).serverUrl;
    if (!serverUrl) throw new Error("Server URL is missing from profile");
    const cleanServerUrl = serverUrl.trim().replace(/\/+$/, '');
    const baseUrl = `${cleanServerUrl}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password || '')}`;

    // 0. Pré-vérification (IPTV-Manager)
    // The PR #430 introduces both /cpp and /player_api.php?action=cpp endpoints returning `true`.
    // We use /cpp here as a clean health-check before doing any authentication.
    const preCheckUrl = `${cleanServerUrl}/cpp`;
    const fallbackPreCheckUrl = `${cleanServerUrl}/player_api.php?action=cpp`;

    let isIptvManager = false;
    let preCheckStatus = 0;

    const performPreCheck = async (url: string) => {
      try {
        const response = await fetchWithProxy(url);
        preCheckStatus = response.status;
        if (response.ok) {
          const text = await response.text();
          if (text.trim() === 'true' || text.trim() === '1') {
            return true;
          }
          try {
             const json = JSON.parse(text);
             if (json === true) return true;
          } catch (e) {
             // Not valid JSON or not true
          }
        }
      } catch (e: any) {
        console.error(`Pre-check failed for ${url}:`, e);
        if (e.message === i18n.t('corsError')) throw e;
      }
      return false;
    };

    // Try primary endpoint first
    try {
      isIptvManager = await performPreCheck(preCheckUrl);
    } catch (e: any) {
      if (e.message === i18n.t('corsError')) throw e;
    }

    // If primary fails, try fallback endpoint
    if (!isIptvManager) {
      try {
        isIptvManager = await performPreCheck(fallbackPreCheckUrl);
      } catch (e: any) {
        if (e.message === i18n.t('corsError')) throw e;
      }
    }

    if (!isIptvManager) {
      if (preCheckStatus !== 0 && preCheckStatus !== 200) {
        throw new Error(i18n.t('serverNotCompatible', { status: preCheckStatus }));
      }
      throw new Error(i18n.t('notIptvManager'));
    }

    // 1. Authentification
    let authResponse;
    try {
      authResponse = await fetchWithProxy(baseUrl);
      if (!authResponse.ok) throw new Error(i18n.t('serverError', { status: authResponse.status }));

      const authData = await authResponse.json();
      if (authData.user_info.auth === 0) {
        throw new Error(i18n.t('authFailed'));
      }
    } catch (e: any) {
      // 🛡️ SECURITY: Prevent leaking credentials from the URL in e.message to the UI
      console.error("Network error during Xtream auth:", e);
      throw new Error(e.message === i18n.t('corsError') ? i18n.t('corsError') : i18n.t('connectionFailed'));
    }

    // 2. Fetch Categories
    const liveCategoriesUrl = `${baseUrl}&action=get_live_categories`;
    const vodCategoriesUrl = `${baseUrl}&action=get_vod_categories`;
    const seriesCategoriesUrl = `${baseUrl}&action=get_series_categories`;

    // We only fetch categories right now so we don't block the UI with 10k+ streams immediately
    // For a real production app, we would lazily fetch streams per category using `&category_id=X`
    // when a user clicks a category. But to fix the grouping and adult checks quickly here:

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

      // 3. Fetch streams (Optimally this should be paginated, doing all at once is heavy)
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

      // 4. Parser les données
      const parsedChannels: Channel[] = Array.isArray(liveData) ? liveData.map((channel: any): Channel => {
        const catInfo = categoryMap.get(String(channel.category_id)) || { name: 'Live TV', isAdult: false };
        return {
          id: String(channel.stream_id),
          name: channel.name,
          url: `${cleanServerUrl}/live/${encodeURIComponent(username)}/${encodeURIComponent(password || '')}/${channel.stream_id}.${channel.stream_type || 'ts'}`,
          logo: channel.stream_icon,
          group: catInfo.name,
          tvgId: channel.epg_channel_id,
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
          seasons: [],
          isAdult: catInfo.isAdult
        };
      }) : [];
      setSeries(parsedSeries);

    } catch (e: any) {
      // 🛡️ SECURITY: e.message might contain sensitive URLs
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
  // --- FIN DE LA LOGIQUE XTREAM ---

  const playStream = (stream: { url: string; id: string; }) => {
    setCurrentStream(stream);
  };

  const addFavorite = async (id: string) => {
    try {
      if (!favorites.includes(id)) {
        const newFavorites = [...favorites, id];
        setFavorites(newFavorites);
        await AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(newFavorites));
      }
    } catch (e) {
      console.error("Error adding to favorites", e);
    }
  };

  const removeFavorite = async (id: string) => {
    try {
      const newFavorites = favorites.filter(favId => favId !== id);
      setFavorites(newFavorites);
      await AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(newFavorites));
    } catch (e) {
      console.error("Error removing from favorites", e);
    }
  };

  const isFavorite = (id: string) => {
    return favorites.includes(id);
  };

  const addRecentlyWatched = async (id: string) => {
    try {
      const newRecents = [id, ...recentlyWatched.filter(recentId => recentId !== id)].slice(0, 10); // Keep last 10
      setRecentlyWatched(newRecents);
      await AsyncStorage.setItem(RECENTLY_WATCHED_KEY, JSON.stringify(newRecents));
    } catch (e) {
      console.error("Error adding to recently watched", e);
    }
  };

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
        setPinCode,
        unlockAdultContent,
        lockAdultContent,
        epg,
        loadEPG,
        getSeriesInfo,
        getVodInfo,
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