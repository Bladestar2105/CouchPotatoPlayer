// ─────────────────────────────────────────────────────────────────
// CouchPotatoPlayer — Design Tokens (v2.0)
// Drop into theme/tokens.ts (replace existing).
// Every screen must import from here. NO hard-coded colors / sizes
// anywhere else in the app.
// ─────────────────────────────────────────────────────────────────

export const colors = {
  // Surfaces (cinematic dark, not pure black — reads softer on OLED)
  bg:        '#07070A',  // app background
  surface:   '#13131A',  // cards, list rows
  elevated:  '#1C1C26',  // modals, popovers, focused surfaces
  sunken:    '#0B0B10',  // input fields, inner wells

  // Borders
  border:       '#262632',  // default hairline
  borderSoft:   '#1E1E28',  // subtle dividers
  borderStrong: '#3A3A48',  // focus-adjacent

  // Text
  text:      '#F5F5F7',  // primary
  textDim:   '#A0A0AD',  // secondary
  textMuted: '#6B6B78',  // tertiary / captions

  // Brand — Electric is the default accent (v2.0)
  accent:      '#6B5BFF',       // primary action / focus ring
  accentSoft:  'rgba(107,91,255,0.14)',
  accentRing:  'rgba(107,91,255,0.55)',
  accentDeep:  '#4A3DD4',       // pressed state

  // Brand-identity support
  brandOrange: '#E85D1C',       // couch/logo orange (icon background)
  brandNavy:   '#22416B',       // logo plate color

  // State
  live:    '#FF3B30',   // live pulse
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

// TV focus — the single most important UX detail on tvOS/Android TV.
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
    elevation: 12, // Android
  },
  duration: 160, // ms — snappy but not jarring
} as const;

export const typography = {
  // Display — hero titles, 10-foot UI
  display: {
    fontSize: 56,
    fontWeight: '900' as const,
    letterSpacing: -1.2,
    lineHeight: 60,
  },
  // Headline — screen titles, poster hero
  headline: {
    fontSize: 28,
    fontWeight: '800' as const,
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  // Title — card titles, modal headers
  title: {
    fontSize: 22,
    fontWeight: '700' as const,
    letterSpacing: -0.2,
    lineHeight: 26,
  },
  // Subtitle — row labels
  subtitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    letterSpacing: 0,
    lineHeight: 22,
  },
  // Body
  body: {
    fontSize: 15,
    fontWeight: '500' as const,
    lineHeight: 22,
  },
  // Caption — metadata, dim labels
  caption: {
    fontSize: 13,
    fontWeight: '500' as const,
    lineHeight: 17,
  },
  // Eyebrow — all-caps tags (LIVE, 4K, HDR, category labels)
  eyebrow: {
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 1.6,
    textTransform: 'uppercase' as const,
  },
  // Mono — timecodes, bitrate, technical
  mono: {
    fontFamily: 'Menlo',
    fontSize: 12,
    letterSpacing: 0.4,
  },
} as const;

// Shadow recipes — use directly in View styles
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

// Timing — for Reanimated transitions, fades, slides
export const timing = {
  instant:  80,
  fast:     160,
  normal:   240,
  slow:     380,
  cinema:   600, // only for scene transitions / player fades
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
  sm: { w: 96,  h: 144 },
  md: { w: 140, h: 210 },
  lg: { w: 180, h: 270 },
  xl: { w: 220, h: 330 },
  // Landscape / backdrop — 16:9
  land: { w: 320, h: 180 },
} as const;

export const effects = {
  subtleBorderWidth: 1,
  strongBorderWidth: 2,
  cardOpacity: 0.94,
} as const;

// ─── Platform breakpoints ─────────────────────────────────────
// Use these instead of Dimensions checks scattered through code.
export const breakpoints = {
  phone:  0,     // 0–599
  tablet: 600,   // 600–999
  tv:     1000,  // 1000+ (Android TV / tvOS render target: 1920×1080)
} as const;

export type ColorToken = keyof typeof colors;
export type SpacingToken = keyof typeof spacing;
export type RadiusToken = keyof typeof radii;
