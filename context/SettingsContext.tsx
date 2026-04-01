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
  background: '#0D0D0F',
  card: '#18181B',
  surface: '#18181B',
  surfaceSecondary: '#1F1F23',
  divider: '#27272A',
  text: '#FAFAFA',
  textSecondary: '#A1A1AA',
  textMuted: '#71717A',
  primary: '#3B82F6',
  primaryLight: 'rgba(59,130,246,0.15)',
  accent: '#8B5CF6',
  error: '#EF4444',
  success: '#22C55E',
  warning: '#F59E0B',
  border: '#27272A',
};

export const oledThemeColors: ThemeColors = {
  background: '#000000',
  card: '#0A0A0A',
  surface: '#0A0A0A',
  surfaceSecondary: '#141414',
  divider: '#1A1A1A',
  text: '#FAFAFA',
  textSecondary: '#A1A1AA',
  textMuted: '#52525B',
  primary: '#3B82F6',
  primaryLight: 'rgba(59,130,246,0.12)',
  accent: '#8B5CF6',
  error: '#EF4444',
  success: '#22C55E',
  warning: '#F59E0B',
  border: '#1A1A1A',
};

export const lightThemeColors: ThemeColors = {
  background: '#F4F4F5',
  card: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceSecondary: '#F9FAFB',
  divider: '#E4E4E7',
  text: '#18181B',
  textSecondary: '#52525B',
  textMuted: '#A1A1AA',
  primary: '#2563EB',
  primaryLight: 'rgba(37,99,235,0.1)',
  accent: '#7C3AED',
  error: '#DC2626',
  success: '#16A34A',
  warning: '#D97706',
  border: '#E4E4E7',
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
  }), [themeMode, setThemeMode, colors, bufferSize, setBufferSize, playerType, setPlayerType, vlcHardwareAcceleration, setVlcHardwareAcceleration, ksplayerHardwareDecode, setKsplayerHardwareDecode, ksplayerAsynchronousDecompression, setKsplayerAsynchronousDecompression, ksplayerDisplayFrameRate, setKsplayerDisplayFrameRate]);

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
