/**
 * Image proxy utility for web platform.
 * Routes image URLs through our /proxy/ middleware on web.
 */
import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';
const urlCache = new Map<string, string>();
const MAX_CACHE_SIZE = 500;

export function proxyImageUrl(url: string | undefined | null): string | undefined {
  if (!url) return undefined;
  if (!isWeb) return url;

  const cached = urlCache.get(url);
  if (cached) return cached;

  let proxied = url;
  const isHttpUrl = /^https?:\/\//i.test(url);
  if (isHttpUrl || url.includes(':25461') || url.includes(':8080') || url.includes('picon') || url.includes('tivi-ott')) {
    proxied = `/proxy/${url}`;
  }

  if (urlCache.size >= MAX_CACHE_SIZE) {
    const firstKey = urlCache.keys().next().value;
    if (firstKey) urlCache.delete(firstKey);
  }
  urlCache.set(url, proxied);

  return proxied;
}
