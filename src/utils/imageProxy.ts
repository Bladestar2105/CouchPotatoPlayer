/**
 * Image proxy utility for web platform.
 *
 * On web, IPTV channel icons are served from HTTP origins which causes
 * Mixed Content errors when the app is loaded over HTTPS. This utility
 * routes image URLs through our /proxy/ middleware.
 *
 * Also provides an in-memory LRU cache for image URLs to avoid
 * redundant proxy lookups.
 */
import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

// Simple LRU cache for proxied URLs
const urlCache = new Map<string, string>();
const MAX_CACHE_SIZE = 500;

/**
 * Proxy an image URL for web compatibility.
 * On native platforms, returns the URL unchanged.
 * On web, wraps HTTP URLs through /proxy/ to avoid Mixed Content.
 */
export function proxyImageUrl(url: string | undefined | null): string | undefined {
  if (!url) return undefined;

  // Native platforms don't need proxying
  if (!isWeb) return url;

  // Check cache
  const cached = urlCache.get(url);
  if (cached) return cached;

  let proxied = url;

  // Only proxy HTTP URLs or IPTV server URLs that might have SSL issues
  if (url.startsWith('http://') || url.includes(':25461') || url.includes(':8080')) {
    proxied = `/proxy/${url}`;
  }
  // HTTPS URLs to IPTV picon servers often have SSL issues
  else if (url.includes('picon') || url.includes('tivi-ott')) {
    proxied = `/proxy/${url}`;
  }

  // Add to cache with LRU eviction
  if (urlCache.size >= MAX_CACHE_SIZE) {
    const firstKey = urlCache.keys().next().value;
    if (firstKey) urlCache.delete(firstKey);
  }
  urlCache.set(url, proxied);

  return proxied;
}

/**
 * Clear the image URL cache.
 */
export function clearImageCache(): void {
  urlCache.clear();
}