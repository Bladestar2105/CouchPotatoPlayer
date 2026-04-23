import { describe, test, expect, mock, beforeEach, afterEach } from './bunTestCompat';
import { vi } from 'vitest';

const mockPrefetch = mock(() => Promise.resolve());


async function getImageCache() {
  return await import('../imageCache');
}

beforeEach(() => {
  vi.resetModules();
});

afterEach(async () => {
  const { setNativePrefetchForTests, setIsWebForTests } = await getImageCache();
  setNativePrefetchForTests(null);
  setIsWebForTests(null);
});

describe('imageCache basic functionality', () => {
  beforeEach(async () => {
    mockPrefetch.mockClear();
  });

  test('getPrefetchCacheSize returns 0 initially and after clear', async () => {
    const { getPrefetchCacheSize, clearPrefetchCache, prefetchImage, setNativePrefetchForTests, setIsWebForTests } = await getImageCache();

    setNativePrefetchForTests(mockPrefetch as any);
    setIsWebForTests(false);
    clearPrefetchCache();
    expect(getPrefetchCacheSize()).toBe(0);

    prefetchImage('https://example.com/test.png');
    expect(getPrefetchCacheSize()).toBe(1);

    clearPrefetchCache();
    expect(getPrefetchCacheSize()).toBe(0);
  });
});

describe('imageCache prefetching logic', () => {
  beforeEach(async () => {
    mockPrefetch.mockClear();
  });

  test('prefetchImage calls Image.prefetch on native', async () => {
    const { prefetchImage, clearPrefetchCache, setNativePrefetchForTests, setIsWebForTests } = await getImageCache();
    setNativePrefetchForTests(mockPrefetch as any);
    setIsWebForTests(false);
    clearPrefetchCache();

    const url = 'https://example.com/native.png';
    prefetchImage(url);

    expect(mockPrefetch).toHaveBeenCalledWith(url);
  });

  test('prefetchImage handles duplicate URLs', async () => {
    const { prefetchImage, clearPrefetchCache, getPrefetchCacheSize, setNativePrefetchForTests, setIsWebForTests } = await getImageCache();
    setNativePrefetchForTests(mockPrefetch as any);
    setIsWebForTests(false);
    clearPrefetchCache();

    const url = 'https://example.com/dup.png';
    prefetchImage(url);
    prefetchImage(url);

    expect(mockPrefetch).toHaveBeenCalledTimes(1);
    expect(getPrefetchCacheSize()).toBe(1);
  });

  test('prefetchImage handles null/undefined/empty URL', async () => {
    const { prefetchImage, clearPrefetchCache, getPrefetchCacheSize, setNativePrefetchForTests, setIsWebForTests } = await getImageCache();
    setNativePrefetchForTests(mockPrefetch as any);
    setIsWebForTests(false);
    clearPrefetchCache();

    prefetchImage(null as any);
    prefetchImage(undefined as any);
    prefetchImage('');

    expect(mockPrefetch).not.toHaveBeenCalled();
    expect(getPrefetchCacheSize()).toBe(0);
  });

  test('prefetchImages batches and filters URLs', async () => {
    const { prefetchImages, clearPrefetchCache, getPrefetchCacheSize, setNativePrefetchForTests, setIsWebForTests } = await getImageCache();
    setNativePrefetchForTests(mockPrefetch as any);
    setIsWebForTests(false);
    clearPrefetchCache();

    const urls = ['https://example.com/1.png', 'https://example.com/2.png', null, 'https://example.com/1.png', 'https://example.com/3.png'];

    prefetchImages(urls as any);

    expect(mockPrefetch).toHaveBeenCalledTimes(3);
    expect(getPrefetchCacheSize()).toBe(3);
  });

  test('prefetchChannelImages extracts URLs from items', async () => {
    const { prefetchChannelImages, clearPrefetchCache, getPrefetchCacheSize, setNativePrefetchForTests, setIsWebForTests } = await getImageCache();
    setNativePrefetchForTests(mockPrefetch as any);
    setIsWebForTests(false);
    clearPrefetchCache();

    const items = [
      { stream_icon: 'https://example.com/stream.png' },
      { cover: 'https://example.com/cover.png' },
      { icon: 'https://example.com/icon.png' },
      { nothing: 'here' },
    ];

    prefetchChannelImages(items);

    expect(mockPrefetch).toHaveBeenCalledTimes(3);
    expect(getPrefetchCacheSize()).toBe(3);
  });
});

describe('imageCache limit logic', () => {
  beforeEach(async () => {
    mockPrefetch.mockClear();
  });

  test('MAX_PREFETCH_CACHE is respected', async () => {
    const { prefetchImage, clearPrefetchCache, getPrefetchCacheSize, setNativePrefetchForTests, setIsWebForTests } = await getImageCache();
    setNativePrefetchForTests(mockPrefetch as any);
    setIsWebForTests(false);
    clearPrefetchCache();

    for (let i = 0; i < 500; i++) {
      prefetchImage(`https://example.com/${i}.png`);
    }
    expect(getPrefetchCacheSize()).toBe(500);

    prefetchImage('https://example.com/extra.png');
    expect(getPrefetchCacheSize()).toBe(500);

    prefetchImage('https://example.com/0.png');
    expect(mockPrefetch).toHaveBeenCalledTimes(502);
    expect(getPrefetchCacheSize()).toBe(500);
  });
});
