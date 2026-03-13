/**
 * Image Cache & Prefetch Utility
 * 
 * Provides image prefetching for smoother scrolling in channel lists.
 * On web: uses link preload hints. On native: uses RN Image.prefetch.
 */
import { Image, Platform } from 'react-native';
import { isWeb } from './platform';

// Track prefetched URLs to avoid duplicates
const prefetchedUrls = new Set<string>();
const MAX_PREFETCH_CACHE = 500;

/**
 * Prefetch a single image URL into the browser/native cache.
 */
export function prefetchImage(url: string | undefined | null): void {
  if (!url || prefetchedUrls.has(url)) return;

  // Evict old entries if cache is full
  if (prefetchedUrls.size >= MAX_PREFETCH_CACHE) {
    const firstKey = prefetchedUrls.values().next().value;
    if (firstKey) prefetchedUrls.delete(firstKey);
  }

  prefetchedUrls.add(url);

  if (isWeb) {
    // On web: create a hidden Image object to trigger browser caching
    try {
      const img = new (globalThis as any).Image();
      img.src = url;
    } catch {
      // Silent fail — prefetch is best-effort
    }
  } else {
    // On native: use React Native's built-in prefetch
    try {
      Image.prefetch(url).catch(() => {
        // Silent fail
      });
    } catch {
      // Silent fail
    }
  }
}

/**
 * Batch prefetch multiple image URLs.
 * Use this when rendering a new list of channels/items.
 */
export function prefetchImages(urls: (string | undefined | null)[]): void {
  const validUrls = urls.filter((u): u is string => !!u && !prefetchedUrls.has(u));
  
  // Limit batch size to prevent overwhelming the network
  const batch = validUrls.slice(0, 20);
  
  for (const url of batch) {
    prefetchImage(url);
  }
}

/**
 * Prefetch images for a list of channels/items that have icons/covers.
 * Accepts any object with stream_icon, cover, or icon properties.
 */
export function prefetchChannelImages(items: any[]): void {
  const urls: string[] = [];
  for (const item of items) {
    const url = item.stream_icon || item.cover || item.icon;
    if (url) urls.push(url);
  }
  prefetchImages(urls);
}

/**
 * Clear the prefetch tracking cache.
 */
export function clearPrefetchCache(): void {
  prefetchedUrls.clear();
}

/**
 * Get the current size of the prefetch cache.
 */
export function getPrefetchCacheSize(): number {
  return prefetchedUrls.size;
}