import { describe, expect, test } from './bunTestCompat';
import {
  getChannelListPerfConfig,
  getEpgKeyForChannel,
  getProgramProgressPercent,
  getEpgTickIntervalMs,
  resolveChannelListBackAction,
  scheduleFocusRestore,
  shouldCategoryHavePreferredFocus,
  shouldDeferPrefetch,
} from '../channelListBehavior';

describe('channelListBehavior', () => {
  test('uses larger list window for tvOS and conservative batch on Android TV', () => {
    const tvos = getChannelListPerfConfig({ isTV: true, platformOS: 'ios' });
    const androidTv = getChannelListPerfConfig({ isTV: true, platformOS: 'android' });

    expect(tvos.windowSize).toBe(11);
    expect(androidTv.windowSize).toBe(9);
    expect(androidTv.maxToRenderPerBatch).toBeLessThanOrEqual(tvos.maxToRenderPerBatch);
  });

  test('enables clipping on non-TV platforms', () => {
    const mobile = getChannelListPerfConfig({ isTV: false, platformOS: 'android' });
    expect(mobile.removeClippedSubviews).toBe(true);
  });

  test('defers prefetch only on Android/Android TV', () => {
    expect(shouldDeferPrefetch('android')).toBe(true);
    expect(shouldDeferPrefetch('ios')).toBe(false);
    expect(shouldDeferPrefetch('web')).toBe(false);
  });

  test('computes bounded EPG progress and handles non-positive duration', () => {
    expect(getProgramProgressPercent({ start: 1000, end: 2000 } as any, 1500)).toBe(50);
    expect(getProgramProgressPercent({ start: 1000, end: 1000 } as any, 1500)).toBe(0);
    expect(getProgramProgressPercent({ start: 1000, end: 2000 } as any, 999)).toBe(0);
    expect(getProgramProgressPercent({ start: 1000, end: 2000 } as any, 5000)).toBe(100);
  });

  test('resolves EPG key fallback order', () => {
    expect(getEpgKeyForChannel({ id: 'id', tvgId: 'tvg', epgChannelId: 'epg' } as any)).toBe('epg');
    expect(getEpgKeyForChannel({ id: 'id', tvgId: 'tvg', epgChannelId: '' } as any)).toBe('tvg');
    expect(getEpgKeyForChannel({ id: 'id', tvgId: '', epgChannelId: '' } as any)).toBe('id');
  });

  test('resolves ChannelList back behavior for focus-safe navigation', () => {
    expect(resolveChannelListBackAction({ unlockMode: 'x', isCompactLayout: false, showCategories: false })).toBe('closeUnlockDialog');
    expect(resolveChannelListBackAction({ unlockMode: null, isCompactLayout: true, showCategories: false })).toBe('showCategories');
    expect(resolveChannelListBackAction({ unlockMode: null, isCompactLayout: false, showCategories: true })).toBe('bubble');
  });

  test('schedules focus restore with cleanup callback', () => {
    const focus = () => undefined;
    const channelRefs = { channelA: { focus } };

    let executed = false;
    let cleared = false;
    const fakeSetTimeout = ((cb: () => void) => {
      executed = true;
      cb();
      return 123 as any;
    }) as typeof setTimeout;
    const fakeClearTimeout = ((id: any) => {
      if (id === 123) cleared = true;
    }) as typeof clearTimeout;

    const cleanup = scheduleFocusRestore(channelRefs, 'channelA', fakeSetTimeout, fakeClearTimeout);
    expect(executed).toBe(true);
    cleanup();
    expect(cleared).toBe(true);
  });

  test('keeps EPG tick interval stable for predictable refresh cadence', () => {
    expect(getEpgTickIntervalMs()).toBe(30_000);
  });

  test('prefers selected category on player return (tvOS/Android TV) and first category otherwise', () => {
    expect(shouldCategoryHavePreferredFocus({
      restoreFocusOnSelectedChannel: true,
      isSelected: true,
      isFirstItem: false,
    })).toBe(true);

    expect(shouldCategoryHavePreferredFocus({
      restoreFocusOnSelectedChannel: true,
      isSelected: false,
      isFirstItem: true,
    })).toBe(false);

    expect(shouldCategoryHavePreferredFocus({
      restoreFocusOnSelectedChannel: false,
      isSelected: false,
      isFirstItem: true,
    })).toBe(true);
  });
});
