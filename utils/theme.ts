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
    // New design tokens for modern UI
    accent: string;
    accentMuted: string;
    cardElevated: string;
    shadowColor: string;
    gradientStart: string;
    gradientEnd: string;
  };
  // Design system constants
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
    full: number;
  };
  shadows: {
    sm: {
      shadowColor: string;
      shadowOffset: { width: number; height: number };
      shadowOpacity: number;
      shadowRadius: number;
      elevation: number;
    };
    md: {
      shadowColor: string;
      shadowOffset: { width: number; height: number };
      shadowOpacity: number;
      shadowRadius: number;
      elevation: number;
    };
    lg: {
      shadowColor: string;
      shadowOffset: { width: number; height: number };
      shadowOpacity: number;
      shadowRadius: number;
      elevation: number;
    };
  };
}

const darkTheme: Theme = {
  mode: 'dark',
  colors: {
    background: '#0A0A0A',
    surface: '#141414',
    surfaceSecondary: '#1C1C1E',
    card: '#141414',
    textPrimary: '#FAFAFA',
    textSecondary: '#A1A1AA',
    textMuted: '#71717A',
    primary: '#00A8FF',
    primaryLight: 'rgba(0,168,255,0.15)',
    danger: '#EF4444',
    success: '#22C55E',
    warning: '#F59E0B',
    info: '#06B6D4',
    border: '#2A2A2A',
    divider: '#2A2A2A',
    overlay: 'rgba(0,0,0,0.6)',
    tabBar: '#141414',
    tabBarBorder: '#2A2A2A',
    playerBg: '#000000',
    playerOverlay: 'rgba(0,0,0,0.75)',
    liveDot: '#EF4444',
    badge: '#00A8FF',
    accent: '#00A8FF',
    accentMuted: 'rgba(139,92,246,0.15)',
    cardElevated: '#1C1C1E',
    shadowColor: '#000000',
    gradientStart: '#00A8FF',
    gradientEnd: '#00A8FF',
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },
  shadows: {
    sm: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 3,
      elevation: 2,
    },
    md: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 8,
    },
  },
};

const oledTheme: Theme = {
  mode: 'oled',
  colors: {
    background: '#000000',
    surface: '#0A0A0A',
    surfaceSecondary: '#141414',
    card: '#0A0A0A',
    textPrimary: '#FAFAFA',
    textSecondary: '#A1A1AA',
    textMuted: '#52525B',
    primary: '#00A8FF',
    primaryLight: 'rgba(59,130,246,0.12)',
    danger: '#EF4444',
    success: '#22C55E',
    warning: '#F59E0B',
    info: '#06B6D4',
    border: '#1A1A1A',
    divider: '#1A1A1A',
    overlay: 'rgba(0,0,0,0.75)',
    tabBar: '#000000',
    tabBarBorder: '#1A1A1A',
    playerBg: '#000000',
    playerOverlay: 'rgba(0,0,0,0.85)',
    liveDot: '#EF4444',
    badge: '#00A8FF',
    accent: '#00A8FF',
    accentMuted: 'rgba(139,92,246,0.12)',
    cardElevated: '#141414',
    shadowColor: '#000000',
    gradientStart: '#00A8FF',
    gradientEnd: '#00A8FF',
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },
  shadows: {
    sm: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.15,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.2,
      shadowRadius: 6,
      elevation: 3,
    },
    lg: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      elevation: 6,
    },
  },
};

const lightTheme: Theme = {
  mode: 'light',
  colors: {
    background: '#F4F4F5',
    surface: '#FFFFFF',
    surfaceSecondary: '#F9FAFB',
    card: '#FFFFFF',
    textPrimary: '#141414',
    textSecondary: '#52525B',
    textMuted: '#A1A1AA',
    primary: '#2563EB',
    primaryLight: 'rgba(37,99,235,0.1)',
    danger: '#DC2626',
    success: '#16A34A',
    warning: '#D97706',
    info: '#0891B2',
    border: '#E4E4E7',
    divider: '#E4E4E7',
    overlay: 'rgba(0,0,0,0.4)',
    tabBar: '#FFFFFF',
    tabBarBorder: '#E4E4E7',
    playerBg: '#141414',
    playerOverlay: 'rgba(0,0,0,0.65)',
    liveDot: '#DC2626',
    badge: '#2563EB',
    accent: '#7C3AED',
    accentMuted: 'rgba(124,58,237,0.1)',
    cardElevated: '#FFFFFF',
    shadowColor: '#141414',
    gradientStart: '#2563EB',
    gradientEnd: '#7C3AED',
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },
  shadows: {
    sm: {
      shadowColor: '#18181B',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 3,
      elevation: 2,
    },
    md: {
      shadowColor: '#18181B',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    lg: {
      shadowColor: '#18181B',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 8,
    },
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
