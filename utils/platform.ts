import { Platform, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

/**
 * Platform detection utilities.
 * Keeps all TV vs Mobile logic in one place so screens can branch on it.
 */

/** True on Apple TV, Android TV, Fire TV Stick etc. */
export const isTV: boolean =
  Platform.isTV ||
  ((Platform as any).OS === 'tvos') ||
  // Fallback heuristic: leanback / very large screens on Android
  (Platform.OS === 'android' && (width >= 960 || height >= 960));

/** True on phones / tablets (non-TV) */
export const isMobile: boolean = !isTV && Platform.OS !== 'web';

/** True when running inside a browser */
export const isWeb: boolean = Platform.OS === 'web';

/** Shorthand for current platform */
export const isAndroid: boolean = Platform.OS === 'android';
export const isIOS: boolean = Platform.OS === 'ios';

/**
 * Returns different values depending on the platform category.
 * Usage: adaptiveValue({ tv: 42, mobile: 18, web: 20 })
 */
export function adaptiveValue<T>(opts: { tv: T; mobile: T; web?: T }): T {
  if (isWeb && opts.web !== undefined) return opts.web;
  if (isTV) return opts.tv;
  return opts.mobile;
}

/**
 * Returns a different number of grid columns based on platform.
 */
export function gridColumns(): number {
  if (isTV) return 3;
  if (isWeb) return 4;
  // Mobile: use 2 columns in portrait, 3 in landscape
  const { width: w, height: h } = Dimensions.get('window');
  return w > h ? 3 : 2;
}
