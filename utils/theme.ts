export type ThemeMode = 'dark' | 'oled' | 'light';

export interface Theme {
  mode: ThemeMode;
  colors: {
    background: string;
    surface: string;
    surfaceSecondary: string;
    card: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    primary: string;
    primaryLight: string;
    danger: string;
    success: string;
    warning: string;
    info: string;
    border: string;
    divider: string;
    overlay: string;
    tabBar: string;
    tabBarBorder: string;
    playerBg: string;
    playerOverlay: string;
    liveDot: string;
    badge: string;
  };
}

const darkTheme: Theme = {
  mode: 'dark',
  colors: {
    background: '#121212',
    surface: '#1C1C1E',
    surfaceSecondary: '#2C2C2E',
    card: '#1E1E1E',
    textPrimary: '#FFFFFF',
    textSecondary: '#CCCCCC',
    textMuted: '#888888',
    primary: '#007AFF',
    primaryLight: 'rgba(0,122,255,0.15)',
    danger: '#FF453A',
    success: '#4CD964',
    warning: '#FF9500',
    info: '#5AC8FA',
    border: '#333333',
    divider: '#2C2C2E',
    overlay: 'rgba(0,0,0,0.5)',
    tabBar: '#1C1C1E',
    tabBarBorder: '#333333',
    playerBg: '#000000',
    playerOverlay: 'rgba(0,0,0,0.7)',
    liveDot: '#FF3B30',
    badge: '#007AFF',
  },
};

const oledTheme: Theme = {
  mode: 'oled',
  colors: {
    background: '#000000',
    surface: '#0A0A0A',
    surfaceSecondary: '#1A1A1A',
    card: '#0D0D0D',
    textPrimary: '#FFFFFF',
    textSecondary: '#BBBBBB',
    textMuted: '#666666',
    primary: '#007AFF',
    primaryLight: 'rgba(0,122,255,0.12)',
    danger: '#FF453A',
    success: '#4CD964',
    warning: '#FF9500',
    info: '#5AC8FA',
    border: '#1A1A1A',
    divider: '#1A1A1A',
    overlay: 'rgba(0,0,0,0.7)',
    tabBar: '#000000',
    tabBarBorder: '#1A1A1A',
    playerBg: '#000000',
    playerOverlay: 'rgba(0,0,0,0.8)',
    liveDot: '#FF3B30',
    badge: '#007AFF',
  },
};

const lightTheme: Theme = {
  mode: 'light',
  colors: {
    background: '#F2F2F7',
    surface: '#FFFFFF',
    surfaceSecondary: '#F0F0F5',
    card: '#FFFFFF',
    textPrimary: '#000000',
    textSecondary: '#3C3C43',
    textMuted: '#8E8E93',
    primary: '#007AFF',
    primaryLight: 'rgba(0,122,255,0.1)',
    danger: '#FF3B30',
    success: '#34C759',
    warning: '#FF9500',
    info: '#5AC8FA',
    border: '#D1D1D6',
    divider: '#E5E5EA',
    overlay: 'rgba(0,0,0,0.3)',
    tabBar: '#FFFFFF',
    tabBarBorder: '#D1D1D6',
    playerBg: '#000000',
    playerOverlay: 'rgba(0,0,0,0.6)',
    liveDot: '#FF3B30',
    badge: '#007AFF',
  },
};

const themes: Record<ThemeMode, Theme> = {
  dark: darkTheme,
  oled: oledTheme,
  light: lightTheme,
};

export const getTheme = (mode: ThemeMode): Theme => themes[mode] || darkTheme;

export const themeOptions: { label: string; value: ThemeMode; emoji: string; description: string }[] = [
  { label: 'Dark', value: 'dark', emoji: '🌙', description: 'Default dark theme' },
  { label: 'OLED Black', value: 'oled', emoji: '⚫', description: 'True black for AMOLED screens' },
  { label: 'Light', value: 'light', emoji: '☀️', description: 'Light theme for daytime' },
];
