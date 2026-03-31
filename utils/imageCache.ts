import { Image, Platform } from 'react-native';
import { isWeb } from './platform';

const prefetchedUrls = new Set<string>();
const MAX_PREFETCH_CACHE = 500;

export function prefetchImage(url: string | undefined | null): void {
  if (!url || prefetchedUrls.has(url)) return;

  if (prefetchedUrls.size >= MAX_PREFETCH_CACHE) {
    const firstKey = prefetchedUrls.values().next().value;
    if (firstKey) prefetchedUrls.delete(firstKey);
  }

  prefetchedUrls.add(url);

  if (isWeb) {
    try {
      const img = new (globalThis as any).Image();
      img.src = url;
    } catch {
      // Silent fail
    }
  } else {
    try {
      Image.prefetch(url).catch(() => {});
    } catch {
      // Silent fail
    }
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
