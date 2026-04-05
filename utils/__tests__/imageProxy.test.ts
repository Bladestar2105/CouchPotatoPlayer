import { describe, test, expect, mock, afterEach } from 'bun:test';

async function getProxyImageUrlWithPlatform(os: 'ios' | 'web' | 'android') {
  mock.module('react-native', () => ({
    Platform: { OS: os },
  }));

  return await import(`../imageProxy?${Math.random()}`);
}

describe('proxyImageUrl', () => {
  afterEach(() => {
    mock.module('react-native', () => ({
      Platform: { OS: 'ios' },
    }));
  });

  test('returns undefined for nullish input', async () => {
    const { proxyImageUrl } = await getProxyImageUrlWithPlatform('web');
    expect(proxyImageUrl(undefined)).toBeUndefined();
    expect(proxyImageUrl(null)).toBeUndefined();
  });

  test('does not proxy on non-web platforms', async () => {
    const { proxyImageUrl } = await getProxyImageUrlWithPlatform('ios');
    const source = 'https://cdn.example.com/poster.jpg';
    expect(proxyImageUrl(source)).toBe(source);
  });

  test('proxies http urls on web', async () => {
    const { proxyImageUrl } = await getProxyImageUrlWithPlatform('web');
    const source = 'http://cdn.example.com/poster.jpg';
    expect(proxyImageUrl(source)).toBe(`/proxy/${source}`);
  });

  test('proxies https urls on web (regression case)', async () => {
    const { proxyImageUrl } = await getProxyImageUrlWithPlatform('web');
    const source = 'https://cdn.example.com/poster.jpg';
    expect(proxyImageUrl(source)).toBe(`/proxy/${source}`);
  });

  test('keeps non-matching relative urls unchanged', async () => {
    const { proxyImageUrl } = await getProxyImageUrlWithPlatform('web');
    const source = '/assets/poster.jpg';
    expect(proxyImageUrl(source)).toBe(source);
  });

  test('returns stable value for repeated calls', async () => {
    const { proxyImageUrl } = await getProxyImageUrlWithPlatform('web');
    const source = 'https://cdn.example.com/poster.jpg';
    const first = proxyImageUrl(source);
    const second = proxyImageUrl(source);

    expect(first).toBe(`/proxy/${source}`);
    expect(second).toBe(first);
  });
});
