import { describe, expect, test } from './bunTestCompat';
import {
  DEFAULT_OVERLAY_AUTO_HIDE_SECONDS,
  OVERLAY_AUTO_HIDE_SECONDS_OPTIONS,
  normalizeOverlayAutoHideSeconds,
} from '../playbackSettings';

describe('playbackSettings', () => {
  test('provides overlay auto-hide options from 1 to 10 seconds', () => {
    expect(OVERLAY_AUTO_HIDE_SECONDS_OPTIONS).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  test('normalizes persisted overlay auto-hide seconds', () => {
    expect(normalizeOverlayAutoHideSeconds('4')).toBe(4);
    expect(normalizeOverlayAutoHideSeconds(11)).toBe(10);
    expect(normalizeOverlayAutoHideSeconds(0)).toBe(1);
    expect(normalizeOverlayAutoHideSeconds('invalid')).toBe(DEFAULT_OVERLAY_AUTO_HIDE_SECONDS);
  });
});
