import { describe, expect, test } from 'bun:test';
import {
  detectStreamKind,
  getAvailablePlayerTypesForPlatform,
  getDefaultPlayerTypeForPlatform,
  normalizePlayerTypeForPlatform,
  selectEffectivePlayer,
} from '../PlayerAdapter';

describe('PlayerAdapter', () => {
  test('detects stream kinds by extension', () => {
    expect(detectStreamKind('https://x/stream.m3u8')).toBe('hls');
    expect(detectStreamKind('https://x/video.mp4?token=1')).toBe('mp4');
    expect(detectStreamKind('https://x/live.ts')).toBe('ts');
    expect(detectStreamKind('https://x/live')).toBe('unknown');
  });

  test('exposes focused player options on iOS/tvOS and android', () => {
    expect(getAvailablePlayerTypesForPlatform('ios', true)).toEqual(['ksplayer', 'avkit']);
    expect(getAvailablePlayerTypesForPlatform('ios', false)).toEqual(['ksplayer', 'avkit', 'native']);
    expect(getAvailablePlayerTypesForPlatform('android', false)).toEqual(['vlc', 'native']);
  });

  test('normalizes unsupported player choice to platform default', () => {
    expect(normalizePlayerTypeForPlatform('vlc', 'ios', true)).toBe('ksplayer');
    expect(normalizePlayerTypeForPlatform('ksplayer', 'android', false)).toBe('vlc');
  });

  test('selects AVKit for supported streams and KSPlayer fallback on Apple', () => {
    expect(selectEffectivePlayer({
      platformOS: 'ios',
      isTV: true,
      preferredPlayer: 'avkit',
      streamKind: 'hls',
    })).toBe('avkit');

    expect(selectEffectivePlayer({
      platformOS: 'ios',
      isTV: true,
      preferredPlayer: 'avkit',
      streamKind: 'ts',
    })).toBe('ksplayer');
  });

  test('uses native/vlc on android only', () => {
    expect(getDefaultPlayerTypeForPlatform('android', false)).toBe('vlc');
    expect(selectEffectivePlayer({
      platformOS: 'android',
      isTV: false,
      preferredPlayer: 'native',
      streamKind: 'unknown',
    })).toBe('native');
    expect(selectEffectivePlayer({
      platformOS: 'android',
      isTV: false,
      preferredPlayer: 'vlc',
      streamKind: 'unknown',
    })).toBe('vlc');
  });
});
