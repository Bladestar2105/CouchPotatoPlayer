import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Logger from '../utils/logger';
import { getDefaultPlayerTypeForPlatform, normalizePlayerTypeForPlatform } from '../components/player/PlayerAdapter';
import { DEFAULT_OVERLAY_AUTO_HIDE_SECONDS, normalizeOverlayAutoHideSeconds } from '../utils/playbackSettings';

export type ThemeMode = 'dark' | 'oled' | 'light';

export type PlayerType = 'native' | 'vlc' | 'avkit' | 'ksplayer';

export interface ThemeColors {
  background: string;
  card: string;
  surface: string;
  surfaceSecondary: string;
  divider: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  primaryLight: string;
  accent: string;
  error: string;
  success: string;
  warning: string;
  border: string;
}

export const darkThemeColors: ThemeColors = {
  background: '#0F0F13',
  card: '#1A1A24',
  surface: '#16161F',
  surfaceSecondary: '#20202E',
  divider: '#2A2A3E',
  text: '#F0F0F2',
  textSecondary: '#9E9EB8',
  textMuted: '#6B6B8D',
  primary: '#E9692A',
  primaryLight: 'rgba(233,105,42,0.16)',
  accent: '#2D4263',
  error: '#FF5252',
  success: '#69F0AE',
  warning: '#FFD740',
  border: '#2A2A3E',
};

export const oledThemeColors: ThemeColors = {
  background: '#000000',
  card: '#0C0C16',
  surface: '#080812',
  surfaceSecondary: '#101022',
  divider: '#1A1A2E',
  text: '#F0F0F2',
  textSecondary: '#9E9EB8',
  textMuted: '#52527B',
  primary: '#E9692A',
  primaryLight: 'rgba(233,105,42,0.12)',
  accent: '#2D4263',
  error: '#FF5252',
  success: '#69F0AE',
  warning: '#FFD740',
  border: '#1A1A2E',
};

export const lightThemeColors: ThemeColors = {
  background: '#E4E4E7',
  card: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceSecondary: '#F7F7F9',
  divider: '#D4D4DA',
  text: '#1A1A2E',
  textSecondary: '#374A6E',
  textMuted: '#7A8599',
  primary: '#E9692A',
  primaryLight: 'rgba(233,105,42,0.1)',
  accent: '#2D4263',
  error: '#FF1744',
  success: '#00C853',
  warning: '#FFAB00',
  border: '#D4D4DA',
};

export const getThemeColors = (mode: ThemeMode): ThemeColors => {
  switch (mode) {
    case 'oled':
      return oledThemeColors;
    case 'light':
      return lightThemeColors;
    case 'dark':
    default:
      return darkThemeColors;
  }
};

const SETTINGS_KEYS = {
  themeMode: 'app_theme_mode',
  bufferSize: 'app_buffer_size',
  playerType: 'app_player_type',
  vlcHwAccel: 'app_vlc_hw_accel',
  ksHwDecode: 'app_ks_hw_decode',
  ksAsyncDecomp: 'app_ks_async_decomp',
  ksDisplayFrameRate: 'app_ks_display_frame_rate',
  overlayAutoHideSeconds: 'app_overlay_auto_hide_seconds',
  tmdbApiKey: 'app_tmdb_api_key',
} as const;

interface SettingsContextProps {


  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  colors: ThemeColors;
  bufferSize: number;
  setBufferSize: (size: number) => void;
  playerType: PlayerType;
  setPlayerType: (type: PlayerType) => void;
  vlcHardwareAcceleration: boolean;
  setVlcHardwareAcceleration: (enabled: boolean) => void;
  ksplayerHardwareDecode: boolean;
  setKsplayerHardwareDecode: (enabled: boolean) => void;
  ksplayerAsynchronousDecompression: boolean;
  setKsplayerAsynchronousDecompression: (enabled: boolean) => void;
  ksplayerDisplayFrameRate: boolean;
  setKsplayerDisplayFrameRate: (enabled: boolean) => void;
  overlayAutoHideSeconds: number;
  setOverlayAutoHideSeconds: (seconds: number) => void;
  tmdbApiKey: string;
  setTmdbApiKey: (key: string) => void;
}

const SettingsContext = createContext<SettingsContextProps | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('dark');
  const [bufferSize, setBufferSizeState] = useState<number>(32);
  const [playerType, setPlayerTypeState] = useState<PlayerType>(
    getDefaultPlayerTypeForPlatform(Platform.OS, Platform.isTV),
  );
  const [vlcHardwareAcceleration, setVlcHardwareAccelerationState] = useState<boolean>(true);
  const [ksplayerHardwareDecode, setKsplayerHardwareDecodeState] = useState<boolean>(true);
  const [ksplayerAsynchronousDecompression, setKsplayerAsynchronousDecompressionState] = useState<boolean>(false);
  const [ksplayerDisplayFrameRate, setKsplayerDisplayFrameRateState] = useState<boolean>(true);
  const [overlayAutoHideSeconds, setOverlayAutoHideSecondsState] = useState<number>(DEFAULT_OVERLAY_AUTO_HIDE_SECONDS);
  const [tmdbApiKey, setTmdbApiKeyState] = useState<string>(process.env.EXPO_PUBLIC_TMDB_API_KEY || '');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const storageEntries = await AsyncStorage.multiGet([
          SETTINGS_KEYS.themeMode,
          SETTINGS_KEYS.bufferSize,
          SETTINGS_KEYS.playerType,
          SETTINGS_KEYS.vlcHwAccel,
          SETTINGS_KEYS.ksHwDecode,
          SETTINGS_KEYS.ksAsyncDecomp,
          SETTINGS_KEYS.ksDisplayFrameRate,
          SETTINGS_KEYS.overlayAutoHideSeconds,
          SETTINGS_KEYS.tmdbApiKey,
        ]);
        const storageMap = new Map(storageEntries);
        const storedTheme = storageMap.get(SETTINGS_KEYS.themeMode) ?? null;
        const storedBuffer = storageMap.get(SETTINGS_KEYS.bufferSize) ?? null;
        const storedPlayerType = storageMap.get(SETTINGS_KEYS.playerType) ?? null;
        const storedVlcHwAccel = storageMap.get(SETTINGS_KEYS.vlcHwAccel) ?? null;
        const storedKSHwDecode = storageMap.get(SETTINGS_KEYS.ksHwDecode) ?? null;
        const storedKSAsync = storageMap.get(SETTINGS_KEYS.ksAsyncDecomp) ?? null;
        const storedKSFrameRate = storageMap.get(SETTINGS_KEYS.ksDisplayFrameRate) ?? null;
        const storedOverlayAutoHideSeconds = storageMap.get(SETTINGS_KEYS.overlayAutoHideSeconds) ?? null;
        const storedTmdbKey = storageMap.get(SETTINGS_KEYS.tmdbApiKey) ?? null;

        if (storedTheme === 'dark' || storedTheme === 'oled' || storedTheme === 'light') {
          setThemeModeState(storedTheme as ThemeMode);
        }

        if (storedBuffer) {
          setBufferSizeState(parseInt(storedBuffer, 10));
        }

        if (storedPlayerType === 'native' || storedPlayerType === 'vlc' || storedPlayerType === 'avkit' || storedPlayerType === 'ksplayer') {
          setPlayerTypeState(normalizePlayerTypeForPlatform(storedPlayerType as PlayerType, Platform.OS, Platform.isTV));
        }

        if (storedVlcHwAccel) {
          setVlcHardwareAccelerationState(storedVlcHwAccel === 'true');
        }

        if (storedKSHwDecode) {
          setKsplayerHardwareDecodeState(storedKSHwDecode === 'true');
        }

        if (storedKSAsync) {
          setKsplayerAsynchronousDecompressionState(storedKSAsync === 'true');
        }

        if (storedKSFrameRate) {
          setKsplayerDisplayFrameRateState(storedKSFrameRate === 'true');
        }

        if (storedOverlayAutoHideSeconds) {
          setOverlayAutoHideSecondsState(normalizeOverlayAutoHideSeconds(storedOverlayAutoHideSeconds));
        }

        if (storedTmdbKey) {
          setTmdbApiKeyState(storedTmdbKey);
        }
      } catch (e) {
        Logger.error('Failed to load settings', e);
      } finally {
        setIsReady(true);
      }
    };
    loadSettings();
  }, []);

  const setThemeMode = useCallback(async (mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      await AsyncStorage.setItem(SETTINGS_KEYS.themeMode, mode);
    } catch (e) {
      Logger.error('Failed to save theme mode', e);
    }
  }, []);

  const setBufferSize = useCallback(async (size: number) => {
    setBufferSizeState(size);
    try {
      await AsyncStorage.setItem(SETTINGS_KEYS.bufferSize, size.toString());
    } catch (e) {
      Logger.error('Failed to save buffer size', e);
    }
  }, []);

  const setPlayerType = useCallback(async (type: PlayerType) => {
    const normalizedType = normalizePlayerTypeForPlatform(type, Platform.OS, Platform.isTV);
    setPlayerTypeState(normalizedType);
    try {
      await AsyncStorage.setItem(SETTINGS_KEYS.playerType, normalizedType);
    } catch (e) {
      Logger.error('Failed to save player type', e);
    }
  }, []);

  const setVlcHardwareAcceleration = useCallback(async (enabled: boolean) => {
    setVlcHardwareAccelerationState(enabled);
    try {
      await AsyncStorage.setItem(SETTINGS_KEYS.vlcHwAccel, enabled.toString());
    } catch (e) {
      Logger.error('Failed to save vlc hw accel', e);
    }
  }, []);

  const setKsplayerHardwareDecode = useCallback(async (enabled: boolean) => {
    setKsplayerHardwareDecodeState(enabled);
    try {
      await AsyncStorage.setItem(SETTINGS_KEYS.ksHwDecode, enabled.toString());
    } catch (e) {
      Logger.error('Failed to save ksplayer hw decode', e);
    }
  }, []);

  const setKsplayerAsynchronousDecompression = useCallback(async (enabled: boolean) => {
    setKsplayerAsynchronousDecompressionState(enabled);
    try {
      await AsyncStorage.setItem(SETTINGS_KEYS.ksAsyncDecomp, enabled.toString());
    } catch (e) {
      Logger.error('Failed to save ksplayer async decomp', e);
    }
  }, []);

  const setKsplayerDisplayFrameRate = useCallback(async (enabled: boolean) => {
    setKsplayerDisplayFrameRateState(enabled);
    try {
      await AsyncStorage.setItem(SETTINGS_KEYS.ksDisplayFrameRate, enabled.toString());
    } catch (e) {
      Logger.error('Failed to save ksplayer display frame rate', e);
    }
  }, []);

  const setOverlayAutoHideSeconds = useCallback(async (seconds: number) => {
    const normalizedSeconds = normalizeOverlayAutoHideSeconds(seconds);
    setOverlayAutoHideSecondsState(normalizedSeconds);
    try {
      await AsyncStorage.setItem(SETTINGS_KEYS.overlayAutoHideSeconds, normalizedSeconds.toString());
    } catch (e) {
      Logger.error('Failed to save overlay auto-hide seconds', e);
    }
  }, []);

  const setTmdbApiKey = useCallback(async (key: string) => {
    setTmdbApiKeyState(key);
    try {
      await AsyncStorage.setItem(SETTINGS_KEYS.tmdbApiKey, key);
    } catch (e) {
      Logger.error('Failed to save TMDB API Key', e);
    }
  }, []);

  const colors = useMemo(() => getThemeColors(themeMode), [themeMode]);

  // ⚡ Perf: Memoize the context value object to prevent unnecessary re-renders
  // of all consumer components when the provider re-renders.
  const contextValue = useMemo(() => ({
    themeMode,
    setThemeMode,
    colors,
    bufferSize,
    setBufferSize,
    playerType,
    setPlayerType,
    vlcHardwareAcceleration,
    setVlcHardwareAcceleration,
    ksplayerHardwareDecode,
    setKsplayerHardwareDecode,
    ksplayerAsynchronousDecompression,
    setKsplayerAsynchronousDecompression,
    ksplayerDisplayFrameRate,
    setKsplayerDisplayFrameRate,
    overlayAutoHideSeconds,
    setOverlayAutoHideSeconds,
    tmdbApiKey,
    setTmdbApiKey,
  }), [themeMode, setThemeMode, colors, bufferSize, setBufferSize, playerType, setPlayerType, vlcHardwareAcceleration, setVlcHardwareAcceleration, ksplayerHardwareDecode, setKsplayerHardwareDecode, ksplayerAsynchronousDecompression, setKsplayerAsynchronousDecompression, ksplayerDisplayFrameRate, setKsplayerDisplayFrameRate, overlayAutoHideSeconds, setOverlayAutoHideSeconds, tmdbApiKey, setTmdbApiKey]);

  if (!isReady) {
    return null; // Or a splash screen / loader
  }

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
