import React, { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Logger from '../utils/logger';
import {
  ACCENT_CHOICES,
  colors as baseColors,
  density as densityPresets,
  type AccentValue,
  type DensityMode,
} from '../theme/tokens';

const STORAGE_KEYS = {
  accent: '@cpp:accent',
  density: '@cpp:density',
} as const;

const DEFAULT_ACCENT: AccentValue = ACCENT_CHOICES[0].value;
const DEFAULT_DENSITY: DensityMode = 'cozy';

const isAccentValue = (value: string | null): value is AccentValue =>
  !!value && (ACCENT_CHOICES as readonly { value: string }[]).some((c) => c.value === value);

const isDensityMode = (value: string | null): value is DensityMode =>
  value === 'cozy' || value === 'compact';

export interface ThemeContextValue {
  accent: AccentValue;
  setAccent: (value: AccentValue) => void;
  density: DensityMode;
  setDensity: (value: DensityMode) => void;
  densityPreset: typeof densityPresets[DensityMode];
  /** Accent + 14% alpha — suitable for hover / selection backgrounds. */
  accentSoft: string;
  /** Accent + 55% alpha — suitable for focus rings. */
  accentRing: string;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const hexWithAlpha = (hex: string, alpha: number): string => {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return hex;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accent, setAccentState] = useState<AccentValue>(DEFAULT_ACCENT);
  const [density, setDensityState] = useState<DensityMode>(DEFAULT_DENSITY);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const entries = await AsyncStorage.multiGet([STORAGE_KEYS.accent, STORAGE_KEYS.density]);
        if (cancelled) return;
        const map = new Map(entries);
        const storedAccent = map.get(STORAGE_KEYS.accent) ?? null;
        const storedDensity = map.get(STORAGE_KEYS.density) ?? null;
        if (isAccentValue(storedAccent)) setAccentState(storedAccent);
        if (isDensityMode(storedDensity)) setDensityState(storedDensity);
      } catch (e) {
        Logger.error('Failed to load theme preferences', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setAccent = useCallback(async (value: AccentValue) => {
    setAccentState(value);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.accent, value);
    } catch (e) {
      Logger.error('Failed to persist accent', e);
    }
  }, []);

  const setDensity = useCallback(async (value: DensityMode) => {
    setDensityState(value);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.density, value);
    } catch (e) {
      Logger.error('Failed to persist density', e);
    }
  }, []);

  const value = useMemo<ThemeContextValue>(() => ({
    accent,
    setAccent,
    density,
    setDensity,
    densityPreset: densityPresets[density],
    accentSoft: accent === DEFAULT_ACCENT ? baseColors.accentSoft : hexWithAlpha(accent, 0.14),
    accentRing: accent === DEFAULT_ACCENT ? baseColors.accentRing : hexWithAlpha(accent, 0.55),
  }), [accent, setAccent, density, setDensity]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextValue => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
};

export { ACCENT_CHOICES };
