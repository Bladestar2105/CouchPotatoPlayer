export interface RuntimePlatformInfo {
  os: string;
  isTVFlag: boolean;
  width: number;
  height: number;
}

const getRuntimeFallback = (): RuntimePlatformInfo => ({
  os: 'web',
  isTVFlag: false,
  width: 1280,
  height: 720,
});

const getRuntimeFromReactNative = (): RuntimePlatformInfo => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const reactNative = require('react-native');
    const dimensions = reactNative?.Dimensions?.get?.('window') ?? {};
    return {
      os: reactNative?.Platform?.OS ?? 'web',
      isTVFlag: Boolean(reactNative?.Platform?.isTV),
      width: Number(dimensions.width ?? 1280),
      height: Number(dimensions.height ?? 720),
    };
  } catch {
    return getRuntimeFallback();
  }
};

export const deriveRuntimePlatformInfo = ({ os, isTVFlag, width, height }: RuntimePlatformInfo) => {
  const isTV = isTVFlag || os === 'tvos' || (os === 'android' && (width >= 960 || height >= 960));
  const isWeb = os === 'web';
  const isMobile = !isTV && !isWeb;

  return {
    isTV,
    isWeb,
    isMobile,
    isAndroid: os === 'android',
    isIOS: os === 'ios',
  };
};

/**
 * Platform detection utilities.
 * Keeps all TV vs Mobile logic in one place so screens can branch on it.
 */
const runtime = deriveRuntimePlatformInfo(getRuntimeFromReactNative());

/** True on Apple TV, Android TV, Fire TV Stick etc. */
export const isTV: boolean = runtime.isTV;

/** True on phones / tablets (non-TV) */
export const isMobile: boolean = runtime.isMobile;

/** True when running inside a browser */
export const isWeb: boolean = runtime.isWeb;

/** Shorthand for current platform */
export const isAndroid: boolean = runtime.isAndroid;
export const isIOS: boolean = runtime.isIOS;

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
  const dimensions = getRuntimeFromReactNative();
  return dimensions.width > dimensions.height ? 3 : 2;
}

export function adaptiveValueFor<T>(
  opts: { tv: T; mobile: T; web?: T },
  info: Pick<ReturnType<typeof deriveRuntimePlatformInfo>, 'isTV' | 'isWeb'>,
): T {
  if (info.isWeb && opts.web !== undefined) return opts.web;
  if (info.isTV) return opts.tv;
  return opts.mobile;
}

export function gridColumnsFor(info: { isTV: boolean; isWeb: boolean; width: number; height: number }): number {
  if (info.isTV) return 3;
  if (info.isWeb) return 4;
  return info.width > info.height ? 3 : 2;
}
