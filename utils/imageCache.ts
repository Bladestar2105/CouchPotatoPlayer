import { isWeb } from './platform';

const prefetchedUrls = new Set<string>();
const MAX_PREFETCH_CACHE = 500;

type NativePrefetch = (url: string) => Promise<unknown>;
let nativePrefetchOverride: NativePrefetch | null = null;
let isWebOverride: boolean | null = null;

function resolveNativePrefetch(): NativePrefetch | null {
  if (nativePrefetchOverride) return nativePrefetchOverride;

  try {
    // Keep react-native optional for non-native/bun test environments.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const reactNative = require('react-native');
    const prefetch = reactNative?.Image?.prefetch;
    if (typeof prefetch === 'function') {
      return (url: string) => prefetch(url);
    }
  } catch {
    // no-op
  }

  return null;
}

export function prefetchImage(url: string | undefined | null): void {
  if (!url || prefetchedUrls.has(url)) return;

  if (prefetchedUrls.size >= MAX_PREFETCH_CACHE) {
    const firstKey = prefetchedUrls.values().next().value;
    if (firstKey) prefetchedUrls.delete(firstKey);
  }

  prefetchedUrls.add(url);

  const webRuntime = isWebOverride ?? isWeb;

  if (webRuntime) {
    try {
      const img = new (globalThis as any).Image();
      img.src = url;
    } catch {
      // Silent fail
    }
    return;
  }

  try {
    const prefetch = resolveNativePrefetch();
    prefetch?.(url).catch(() => {});
  } catch {
    // Silent fail
  }
}

export function prefetchImages(urls: (string | undefined | null)[]): void {
  const validUrls = urls.filter((u): u is string => !!u && !prefetchedUrls.has(u));
  const batch = validUrls.slice(0, 20);
  for (const url of batch) {
    prefetchImage(url);
  }
}

export function prefetchChannelImages(items: any[]): void {
  const urls: string[] = [];
  for (const item of items) {
    const url = item.stream_icon || item.cover || item.icon;
    if (url) urls.push(url);
  }
  prefetchImages(urls);
}

export function clearPrefetchCache(): void {
  prefetchedUrls.clear();
}

export function getPrefetchCacheSize(): number {
  return prefetchedUrls.size;
}

export function setNativePrefetchForTests(prefetch: NativePrefetch | null): void {
  nativePrefetchOverride = prefetch;
}

export function setIsWebForTests(value: boolean | null): void {
  isWebOverride = value;
}
