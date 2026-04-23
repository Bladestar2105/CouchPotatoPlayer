import { describe, expect, test, mock, afterEach } from './bunTestCompat';
import { vi } from 'vitest';

// PlayerAdapter imports `Platform` from 'react-native'. Stub it at the module
// boundary so the test runs in a Node environment.
mock.module('react-native', () => ({
  Platform: {
    OS: 'ios',
    isTV: false,
    select: (objs: any) => objs.ios || objs.default,
  },
}));

async function loadAdapter() {
  return await import('../../components/player/PlayerAdapter');
}

describe('PlayerAdapter platform matrix', () => {
  afterEach(() => {
    vi.resetModules();
  });

  describe('getDefaultPlayerTypeForPlatform', () => {
    test('iOS phone defaults to ksplayer', async () => {
      const { getDefaultPlayerTypeForPlatform } = await loadAdapter();
      expect(getDefaultPlayerTypeForPlatform('ios', false)).toBe('ksplayer');
    });

    test('tvOS defaults to ksplayer', async () => {
      const { getDefaultPlayerTypeForPlatform } = await loadAdapter();
      expect(getDefaultPlayerTypeForPlatform('ios', true)).toBe('ksplayer');
    });

    test('Android phone defaults to vlc', async () => {
      const { getDefaultPlayerTypeForPlatform } = await loadAdapter();
      expect(getDefaultPlayerTypeForPlatform('android', false)).toBe('vlc');
    });

    test('Android TV defaults to vlc, NOT ksplayer (regression: ksplayer is iOS-only)', async () => {
      // Previously this returned 'ksplayer' because the `if (isTV)` branch did
      // not check `platformOS`. KSPlayer is bridged through a Cocoapod that
      // only exists on iOS / tvOS, so returning it on Android TV produced an
      // unselectable Settings picker state and forced the runtime to silently
      // fall back to VLC via `selectEffectivePlayer`.
      const { getDefaultPlayerTypeForPlatform } = await loadAdapter();
      expect(getDefaultPlayerTypeForPlatform('android', true)).toBe('vlc');
    });

    test('web defaults to native', async () => {
      const { getDefaultPlayerTypeForPlatform } = await loadAdapter();
      expect(getDefaultPlayerTypeForPlatform('web', false)).toBe('native');
    });
  });

  test('default is always inside the allowed list across the full platform matrix', async () => {
    const { getDefaultPlayerTypeForPlatform, getAvailablePlayerTypesForPlatform } = await loadAdapter();
    const platforms: Array<['ios' | 'android' | 'web', boolean, string]> = [
      ['ios', false, 'iOS phone'],
      ['ios', true, 'tvOS'],
      ['android', false, 'Android phone'],
      ['android', true, 'Android TV'],
      ['web', false, 'web'],
    ];

    for (const [platformOS, isTV, label] of platforms) {
      const allowed = getAvailablePlayerTypesForPlatform(platformOS, isTV);
      const defaultType = getDefaultPlayerTypeForPlatform(platformOS, isTV);
      expect(
        allowed.includes(defaultType),
        `${label}: default '${defaultType}' must be inside allowed [${allowed.join(', ')}]`,
      ).toBe(true);
    }
  });

  describe('normalizePlayerTypeForPlatform', () => {
    test('coerces stored ksplayer to vlc on Android TV', async () => {
      const { normalizePlayerTypeForPlatform } = await loadAdapter();
      expect(normalizePlayerTypeForPlatform('ksplayer', 'android', true)).toBe('vlc');
    });

    test('keeps avkit on iOS phone', async () => {
      const { normalizePlayerTypeForPlatform } = await loadAdapter();
      expect(normalizePlayerTypeForPlatform('avkit', 'ios', false)).toBe('avkit');
    });
  });

  describe('selectEffectivePlayer downstream behaviour', () => {
    test('Android TV + accidental ksplayer preference still resolves to vlc', async () => {
      const { selectEffectivePlayer } = await loadAdapter();
      const player = selectEffectivePlayer({
        platformOS: 'android',
        isTV: true,
        preferredPlayer: 'ksplayer',
        streamKind: 'ts',
      });
      expect(player).toBe('vlc');
    });

    test('iOS phone + native preference resolves to native', async () => {
      const { selectEffectivePlayer } = await loadAdapter();
      const player = selectEffectivePlayer({
        platformOS: 'ios',
        isTV: false,
        preferredPlayer: 'native',
        streamKind: 'mp4',
      });
      expect(player).toBe('native');
    });
  });
});
