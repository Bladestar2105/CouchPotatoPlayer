import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Logger from '../utils/logger';

export type ThemeMode = 'dark' | 'oled' | 'light';

export type PlayerType = 'native' | 'vlc' | 'avkit';

export interface ThemeColors {
  background: string;
  card: string;
  surface: string;
  divider: string;
  text: string;
  textSecondary: string;
  primary: string;
  error: string;
}

export const darkThemeColors: ThemeColors = {
  background: '#121212',
  card: '#1E1E1E',
  surface: '#1C1C1E',
  divider: '#2C2C2E',
  text: '#FFFFFF',
  textSecondary: '#888888',
  primary: '#007AFF',
  error: '#FF453A',
};

export const oledThemeColors: ThemeColors = {
  background: '#000000',
  card: '#0D0D0D',
  surface: '#0A0A0A',
  divider: '#1A1A1A',
  text: '#FFFFFF',
  textSecondary: '#666666',
  primary: '#007AFF',
  error: '#FF453A',
};

export const lightThemeColors: ThemeColors = {
  background: '#F2F2F7',
  card: '#FFFFFF',
  surface: '#FFFFFF',
  divider: '#E5E5EA',
  text: '#000000',
  textSecondary: '#888888',
  primary: '#007AFF',
  error: '#FF3B30',
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
}

const SettingsContext = createContext<SettingsContextProps | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('dark');
  const [bufferSize, setBufferSizeState] = useState<number>(32);
  const [playerType, setPlayerTypeState] = useState<PlayerType>('native');
  const [vlcHardwareAcceleration, setVlcHardwareAccelerationState] = useState<boolean>(true);
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
        if (storedPlayerType === 'native' || storedPlayerType === 'vlc' || storedPlayerType === 'avkit') {
          setPlayerTypeState(storedPlayerType as PlayerType);
        }

        const storedVlcHwAccel = await AsyncStorage.getItem('app_vlc_hw_accel');
        if (storedVlcHwAccel) {
          setVlcHardwareAccelerationState(storedVlcHwAccel === 'true');
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
  }), [themeMode, setThemeMode, colors, bufferSize, setBufferSize, playerType, setPlayerType, vlcHardwareAcceleration, setVlcHardwareAcceleration]);

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
