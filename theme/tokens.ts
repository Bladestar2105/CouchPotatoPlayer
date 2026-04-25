export const colors = {
  bg: '#07070A',
  surface: '#13131A',
  elevated: '#1C1C26',
  sunken: '#0B0B10',
  border: '#262632',
  borderSoft: '#1E1E28',
  borderStrong: '#3A3A48',
  text: '#F5F5F7',
  textDim: '#A0A0AD',
  textMuted: '#6B6B78',
  accent: '#6B5BFF',
  accentSoft: 'rgba(107,91,255,0.14)',
  accentRing: 'rgba(107,91,255,0.55)',
  accentDeep: '#4A3DD4',
  brandOrange: '#E85D1C',
  brandNavy: '#22416B',
  live: '#FF3B30',
  success: '#3DDC97',
  warning: '#F5C518',
  danger: '#FF453A',
  scrim50: 'rgba(0,0,0,0.5)',
  scrim80: 'rgba(0,0,0,0.8)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  pill: 999,
} as const;

export const focus = {
  scale: 1.04,
  ringWidth: 3,
  ringColor: colors.accent,
  glow: {
    shadowColor: colors.accent,
    shadowOpacity: 0.55,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  duration: 160,
} as const;

export const typography = {
  display: {
    fontSize: 56,
    fontWeight: '900' as const,
    letterSpacing: 0,
    lineHeight: 60,
  },
  headline: {
    fontSize: 28,
    fontWeight: '800' as const,
    letterSpacing: 0,
    lineHeight: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: '700' as const,
    letterSpacing: 0.3,
  },
  section: {
    fontSize: 13,
    fontWeight: '700' as const,
    letterSpacing: 1.1,
    textTransform: 'uppercase' as const,
  },
  subtitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    letterSpacing: 0,
    lineHeight: 22,
  },
  body: {
    fontSize: 16,
    fontWeight: '500' as const,
  },
  caption: {
    fontSize: 13,
    fontWeight: '400' as const,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 1.4,
    textTransform: 'uppercase' as const,
  },
  mono: {
    fontFamily: 'Menlo',
    fontSize: 12,
    letterSpacing: 0.4,
  },
} as const;

export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  modal: {
    shadowColor: '#000',
    shadowOpacity: 0.6,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 16 },
    elevation: 16,
  },
  poster: {
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
} as const;

export const timing = {
  instant: 80,
  fast: 160,
  normal: 240,
  slow: 380,
  cinema: 600,
} as const;

export const density = {
  cozy: {
    rowHeight: 64,
    gridGutter: 16,
    posterGap: 14,
  },
  compact: {
    rowHeight: 52,
    gridGutter: 12,
    posterGap: 10,
  },
} as const;

export const posters = {
  sm: { w: 96, h: 144 },
  md: { w: 140, h: 210 },
  lg: { w: 180, h: 270 },
  xl: { w: 220, h: 330 },
  land: { w: 320, h: 180 },
} as const;

export const effects = {
  subtleBorderWidth: 1,
  strongBorderWidth: 2,
  cardOpacity: 0.94,
} as const;

export const breakpoints = {
  phone: 0,
  tablet: 600,
  tv: 1000,
} as const;

export const ACCENT_CHOICES = [
  { name: 'Electric', value: '#6B5BFF' },
  { name: 'Potato', value: '#E85D1C' },
  { name: 'Sunset', value: '#FF5E3A' },
  { name: 'Mint', value: '#00D4A0' },
  { name: 'Gold', value: '#F5C518' },
  { name: 'Crimson', value: '#E50914' },
] as const;

export type AccentValue = typeof ACCENT_CHOICES[number]['value'];
export type DensityMode = keyof typeof density;
