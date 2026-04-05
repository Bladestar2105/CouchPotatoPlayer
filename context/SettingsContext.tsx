import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Logger from '../utils/logger';

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
  background: '#F5F5FA',
  card: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceSecondary: '#F0F0F8',
  divider: '#E0E0EE',
  text: '#1A1A2E',
  textSecondary: '#52527B',
  textMuted: '#9E9EB8',
  primary: '#E9692A',
  primaryLight: 'rgba(233,105,42,0.1)',
  accent: '#E9692A',
  error: '#FF1744',
  success: '#00C853',
  warning: '#FFAB00',
  border: '#E0E0EE',
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
  tmdbApiKey: string;
  setTmdbApiKey: (key: string) => void;
}

const SettingsContext = createContext<SettingsContextProps | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('dark');
  const [bufferSize, setBufferSizeState] = useState<number>(32);
  const [playerType, setPlayerTypeState] = useState<PlayerType>(Platform.isTV ? 'vlc' : 'native');
  const [vlcHardwareAcceleration, setVlcHardwareAccelerationState] = useState<boolean>(true);
  const [ksplayerHardwareDecode, setKsplayerHardwareDecodeState] = useState<boolean>(true);
  const [ksplayerAsynchronousDecompression, setKsplayerAsynchronousDecompressionState] = useState<boolean>(false);
  const [ksplayerDisplayFrameRate, setKsplayerDisplayFrameRateState] = useState<boolean>(true);
  const [tmdbApiKey, setTmdbApiKeyState] = useState<string>(process.env.EXPO_PUBLIC_TMDB_API_KEY || '');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const storedTheme = await AsyncStorage.getItem('app_theme_mode');
        if (storedTheme === 'dark' || storedTheme === 'oled' || storedTheme === 'light') {
          setThemeModeState(storedTheme as ThemeMode);
        }

        const storedBuffer = await AsyncStorage.getItem('app_buffer_size');
        if (storedBuffer) {
          setBufferSizeState(parseInt(storedBuffer, 10));
        }

        const storedPlayerType = await AsyncStorage.getItem('app_player_type');
        if (storedPlayerType === 'native' || storedPlayerType === 'vlc' || storedPlayerType === 'avkit' || storedPlayerType === 'ksplayer') {
          setPlayerTypeState(storedPlayerType as PlayerType);
        }

        const storedVlcHwAccel = await AsyncStorage.getItem('app_vlc_hw_accel');
        if (storedVlcHwAccel) {
          setVlcHardwareAccelerationState(storedVlcHwAccel === 'true');
        }

        const storedKSHwDecode = await AsyncStorage.getItem('app_ks_hw_decode');
        if (storedKSHwDecode) {
          setKsplayerHardwareDecodeState(storedKSHwDecode === 'true');
        }

        const storedKSAsync = await AsyncStorage.getItem('app_ks_async_decomp');
        if (storedKSAsync) {
          setKsplayerAsynchronousDecompressionState(storedKSAsync === 'true');
        }

        const storedKSFrameRate = await AsyncStorage.getItem('app_ks_display_frame_rate');
        if (storedKSFrameRate) {
          setKsplayerDisplayFrameRateState(storedKSFrameRate === 'true');
        }

        const storedTmdbKey = await AsyncStorage.getItem('app_tmdb_api_key');
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

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      await AsyncStorage.setItem('app_theme_mode', mode);
    } catch (e) {
      Logger.error('Failed to save theme mode', e);
    }
  };

  const setBufferSize = async (size: number) => {
    setBufferSizeState(size);
    try {
      await AsyncStorage.setItem('app_buffer_size', size.toString());
    } catch (e) {
      Logger.error('Failed to save buffer size', e);
    }
  };

  const setPlayerType = async (type: PlayerType) => {
    setPlayerTypeState(type);
    try {
      await AsyncStorage.setItem('app_player_type', type);
    } catch (e) {
      Logger.error('Failed to save player type', e);
    }
  };

  const setVlcHardwareAcceleration = async (enabled: boolean) => {
    setVlcHardwareAccelerationState(enabled);
    try {
      await AsyncStorage.setItem('app_vlc_hw_accel', enabled.toString());
    } catch (e) {
      Logger.error('Failed to save vlc hw accel', e);
    }
  };

  const setKsplayerHardwareDecode = async (enabled: boolean) => {
    setKsplayerHardwareDecodeState(enabled);
    try {
      await AsyncStorage.setItem('app_ks_hw_decode', enabled.toString());
    } catch (e) {
      Logger.error('Failed to save ksplayer hw decode', e);
    }
  };

  const setKsplayerAsynchronousDecompression = async (enabled: boolean) => {
    setKsplayerAsynchronousDecompressionState(enabled);
    try {
      await AsyncStorage.setItem('app_ks_async_decomp', enabled.toString());
    } catch (e) {
      Logger.error('Failed to save ksplayer async decomp', e);
    }
  };

  const setKsplayerDisplayFrameRate = async (enabled: boolean) => {
    setKsplayerDisplayFrameRateState(enabled);
    try {
      await AsyncStorage.setItem('app_ks_display_frame_rate', enabled.toString());
    } catch (e) {
      Logger.error('Failed to save ksplayer display frame rate', e);
    }
  };

  const setTmdbApiKey = async (key: string) => {
    setTmdbApiKeyState(key);
    try {
      await AsyncStorage.setItem('app_tmdb_api_key', key);
    } catch (e) {
      Logger.error('Failed to save TMDB API Key', e);
    }
  };

  const colors = getThemeColors(themeMode);

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
    tmdbApiKey,
    setTmdbApiKey,
  }), [themeMode, setThemeMode, colors, bufferSize, setBufferSize, playerType, setPlayerType, vlcHardwareAcceleration, setVlcHardwareAcceleration, ksplayerHardwareDecode, setKsplayerHardwareDecode, ksplayerAsynchronousDecompression, setKsplayerAsynchronousDecompression, ksplayerDisplayFrameRate, setKsplayerDisplayFrameRate, tmdbApiKey, setTmdbApiKey]);

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
