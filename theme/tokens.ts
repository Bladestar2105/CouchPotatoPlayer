export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
} as const;

export const typography = {
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
  body: {
    fontSize: 16,
    fontWeight: '500' as const,
  },
  caption: {
    fontSize: 13,
    fontWeight: '400' as const,
  },
} as const;

export const effects = {
  subtleBorderWidth: 1,
  strongBorderWidth: 2,
  cardOpacity: 0.94,
} as const;
