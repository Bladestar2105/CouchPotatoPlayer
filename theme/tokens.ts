// ─────────────────────────────────────────────────────────────────
// CouchPotatoPlayer — Design Tokens (v2.0)
// Source of truth for every color, size, radius, font weight and
// animation timing in the app. Screens MUST import from here.
// ─────────────────────────────────────────────────────────────────

export const colors = {
  // Surfaces (cinematic dark, not pure black — reads softer on OLED)
  bg:        '#07070A',
  surface:   '#13131A',
  elevated:  '#1C1C26',
  sunken:    '#0B0B10',

  // Borders
  border:       '#262632',
  borderSoft:   '#1E1E28',
  borderStrong: '#3A3A48',

  // Text
  text:      '#F5F5F7',
  textDim:   '#A0A0AD',
  textMuted: '#6B6B78',

  // Brand — Electric is the default accent (v2.0)
  accent:      '#6B5BFF',
  accentSoft:  'rgba(107,91,255,0.14)',
  accentRing:  'rgba(107,91,255,0.55)',
  accentDeep:  '#4A3DD4',

  // Brand-identity support
  brandOrange: '#E85D1C',
  brandNavy:   '#22416B',

  // State
  live:    '#FF3B30',
  success: '#3DDC97',
  warning: '#F5C518',
  danger:  '#FF453A',

  // Overlay
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

// TV focus — the single most important UX detail on tvOS / Android TV.
// Focused element grows 4%, gains a 3px accent ring, and casts a soft glow.
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
    letterSpacing: -1.2,
    lineHeight: 60,
  },
  headline: {
    fontSize: 28,
    fontWeight: '800' as const,
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: '700' as const,
    letterSpacing: -0.2,
    lineHeight: 26,
  },
  subtitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    letterSpacing: 0,
    lineHeight: 22,
  },
  body: {
    fontSize: 15,
    fontWeight: '500' as const,
    lineHeight: 22,
  },
  caption: {
    fontSize: 13,
    fontWeight: '500' as const,
    lineHeight: 17,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 1.6,
    textTransform: 'uppercase' as const,
  },
  mono: {
    fontFamily: 'Menlo',
    fontSize: 12,
    letterSpacing: 0.4,
  },
  // Back-compat alias — legacy screens import `typography.section`; the new
  // token for all-caps small labels is `typography.eyebrow`.
  section: {
    fontSize: 13,
    fontWeight: '700' as const,
    letterSpacing: 1.1,
    textTransform: 'uppercase' as const,
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
  fast:    160,
  normal:  240,
  slow:    380,
  cinema:  600,
} as const;

// Density presets — used by the app's Settings toggle
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

// Poster dimensions — KEEP 2:3 RATIO EVERYWHERE
export const posters = {
  sm:   { w: 96,  h: 144 },
  md:   { w: 140, h: 210 },
  lg:   { w: 180, h: 270 },
  xl:   { w: 220, h: 330 },
  land: { w: 320, h: 180 },
} as const;

export const effects = {
  subtleBorderWidth: 1,
  strongBorderWidth: 2,
  cardOpacity: 0.94,
} as const;

export const breakpoints = {
  phone:  0,
  tablet: 600,
  tv:     1000,
} as const;

// Accent palette — user-pickable in Settings → Appearance
export const ACCENT_CHOICES = [
  { name: 'Electric', value: '#6B5BFF' },
  { name: 'Potato',   value: '#E85D1C' },
  { name: 'Sunset',   value: '#FF5E3A' },
  { name: 'Mint',     value: '#00D4A0' },
  { name: 'Gold',     value: '#F5C518' },
  { name: 'Crimson',  value: '#E50914' },
] as const;

export type AccentValue = typeof ACCENT_CHOICES[number]['value'];
export type DensityMode = keyof typeof density;

export type ColorToken = keyof typeof colors;
export type SpacingToken = keyof typeof spacing;
export type RadiusToken = keyof typeof radii;
