import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { XMLParser } from 'fast-xml-parser';
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

const seriesRegex = /(.*?) S(\d+) E(\d+)/i;
const PROFILES_STORAGE_KEY = 'IPTV_PROFILES';
const FAVORITES_STORAGE_KEY = 'IPTV_FAVORITES';
const RECENTLY_WATCHED_KEY = 'IPTV_RECENTLY_WATCHED';
const PIN_STORAGE_KEY = 'IPTV_PIN';

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
        if (profilesJson) {
          try {
            const storedProfiles = JSON.parse(profilesJson);
            setProfiles(storedProfiles);
          } catch (parseError) {
            console.error("Données de profil corrompues, nettoyage...", parseError);
            await AsyncStorage.removeItem(PROFILES_STORAGE_KEY);
            setProfiles([]);
          }
        }

        const favoritesJson = await AsyncStorage.getItem(FAVORITES_STORAGE_KEY);
        if (favoritesJson) {
          try {
            const storedFavorites = JSON.parse(favoritesJson);
            setFavorites(storedFavorites);
          } catch (parseError) {
             console.error("Données de favoris corrompues, nettoyage...", parseError);
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
            console.error("Données des éléments récemment regardés corrompues, nettoyage...", parseError);
            await AsyncStorage.removeItem(RECENTLY_WATCHED_KEY);
            setRecentlyWatched([]);
          }
        }

        const storedPin = await AsyncStorage.getItem(PIN_STORAGE_KEY);
        if (storedPin) {
           setPin(storedPin);
        }
      } catch (e) {
        console.error("Échec du chargement des données depuis le stockage", e);
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
        console.warn("Chargement Stalker non implémenté");
      }
      setCurrentProfile(profile);
    } catch (e: any) {
      console.error("Échec du chargement du profil:", e);
      setError(e.message || "Erreur inconnue");
    } finally {
      setIsLoading(false);
    }
  };

  const unloadProfile = () => {
    setCurrentProfile(null);
    setChannels([]);
    setMovies([]);
    setSeries([]);
    setEpg({});
    setError(null);
    setCurrentStream(null);
  };

  const loadEPG = async () => {
    if (!currentProfile) return;

    try {
      if (currentProfile.type === 'xtream') {
        const { serverUrl, username, password } = currentProfile;
        const epgUrl = `${serverUrl}/xmltv.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password || '')}`;

        const response = await fetch(epgUrl);
        if (!response.ok) return;
        const xmlData = await response.text();

        const parser = new XMLParser({
          ignoreAttributes: false,
          attributeNamePrefix: "@_"
        });

        const parsed = parser.parse(xmlData);
        if (!parsed || !parsed.tv || !parsed.tv.programme) return;

        const newEpg: Record<string, EPGProgram[]> = {};
        const programs = Array.isArray(parsed.tv.programme) ? parsed.tv.programme : [parsed.tv.programme];

        const parseDate = (str: string) => {
          if (!str || str.length < 14) return new Date();
          return new Date(
            parseInt(str.substring(0, 4)),
            parseInt(str.substring(4, 6)) - 1,
            parseInt(str.substring(6, 8)),
            parseInt(str.substring(8, 10)),
            parseInt(str.substring(10, 12)),
            parseInt(str.substring(12, 14))
          );
        };

        for (const progData of programs) {
           const channelId = progData['@_channel'];
           const startStr = progData['@_start'];
           const stopStr = progData['@_stop'];

           if (!channelId || !startStr || !stopStr) continue;

           // fast-xml-parser returns either a string or an object with text node if title has attributes
           const titleVal = progData.title;
           const title = typeof titleVal === 'object' ? titleVal['#text'] : titleVal;

           const descVal = progData.desc;
           const description = typeof descVal === 'object' ? descVal['#text'] : (descVal || '');

           const prog: EPGProgram = {
             id: `${channelId}-${startStr}`,
             channelId,
             title: title || 'Inconnu',
             description: description,
             start: parseDate(startStr),
             end: parseDate(stopStr)
           };

           if (!newEpg[channelId]) newEpg[channelId] = [];
           newEpg[channelId].push(prog);
        }

        setEpg(newEpg);
      }
    } catch (e) {
      console.error("Failed to load EPG", e);
    }
  };

  const loadM3U = async (url: string) => {
    let m3uContent = '';
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Erreur réseau: ${response.status}`);
      m3uContent = await response.text();
    } catch (fetchError: any) {
      throw new Error(`Impossible de télécharger la liste : ${fetchError.message}`);
    }

    try {
      const { channels, movies, series } = parseM3U(m3uContent);
      setChannels(channels);
      setMovies(movies);
      setSeries(series);

      if (channels.length === 0 && movies.length === 0 && series.length === 0) {
        throw new Error("Le fichier M3U est valide mais ne contient aucun média.");
      }
    } catch (parseError: any) {
      console.error("Erreur de parsing M3U:", parseError);
      throw new Error(`Erreur de format M3U : ${parseError.message}`);
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
          currentItemInfo = { name: name.trim(), tvgId: attributes.match(tvgIdRegex)?.[1], logo: attributes.match(tvgLogoRegex)?.[1], group: attributes.match(groupTitleRegex)?.[1] || 'Inconnu' };
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
            episodeName = `Épisode ${episodeNum}`;
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
            currentSeason = { id: `${seriesName}-S${seasonNum}`, name: `Saison ${seasonNum}`, seasonNumber: seasonNum, episodes: [] };
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

    const { serverUrl, username, password } = profile;
    const baseUrl = `${serverUrl}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password || '')}`;

    // 1. Authentification
    let authResponse;
    try {
      authResponse = await fetch(baseUrl);
      if (!authResponse.ok) throw new Error(`Erreur serveur: ${authResponse.status}`);

      const authData = await authResponse.json();
      if (authData.user_info.auth === 0) {
        throw new Error("Authentification échouée. Vérifiez vos identifiants.");
      }
    } catch (e: any) {
      throw new Error(`Connexion au serveur échouée: ${e.message}`);
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
        fetch(liveCategoriesUrl),
        fetch(vodCategoriesUrl),
        fetch(seriesCategoriesUrl)
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
        fetch(allStreamsUrl),
        fetch(vodStreamsUrl),
        fetch(seriesStreamsUrl)
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
          url: `${serverUrl}/live/${encodeURIComponent(username)}/${encodeURIComponent(password || '')}/${channel.stream_id}.${channel.stream_type || 'ts'}`,
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
          streamUrl: `${serverUrl}/movie/${encodeURIComponent(username)}/${encodeURIComponent(password || '')}/${movie.stream_id}.${movie.container_extension}`,
          cover: movie.stream_icon,
          group: catInfo.name,
          isAdult: catInfo.isAdult
        };
      }) : [];
      setMovies(parsedMovies);

      const parsedSeries: Series[] = Array.isArray(seriesData) ? seriesData.map((series: any): Series => {
        const catInfo = categoryMap.get(String(series.category_id)) || { name: 'Séries', isAdult: false };
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
      console.error("Erreur lors de la récupération des flux Xtream", e);
      throw new Error("Impossible de charger les listes de flux.");
    }
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
      console.error("Erreur lors de l'ajout aux favoris", e);
    }
  };

  const removeFavorite = async (id: string) => {
    try {
      const newFavorites = favorites.filter(favId => favId !== id);
      setFavorites(newFavorites);
      await AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(newFavorites));
    } catch (e) {
      console.error("Erreur lors de la suppression des favoris", e);
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
      console.error("Erreur lors de l'ajout aux éléments récemment regardés", e);
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
       console.error("Erreur lors de la configuration du code PIN", e);
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