import { describe, expect, test } from './bunTestCompat';
import { isSelectLikeEvent, resolvePlayerRemoteAction } from '../playerRemoteEvents';

describe('playerRemoteEvents', () => {
  test('detects select-like events used for overlay and seek commit', () => {
    expect(isSelectLikeEvent('select')).toBe(true);
    expect(isSelectLikeEvent('tap')).toBe(true);
    expect(isSelectLikeEvent('left')).toBe(false);
  });

  test('ignores events when screen is not focused', () => {
    const action = resolvePlayerRemoteAction({
      isFocused: false,
      eventType: 'channelUp',
      showOverlay: false,
      canSeek: true,
      hasPendingSeek: false,
    });
    expect(action).toBe('ignore');
  });

  test('commits pending seek on play/select events', () => {
    const action = resolvePlayerRemoteAction({
      isFocused: true,
      eventType: 'playPause',
      showOverlay: false,
      canSeek: true,
      hasPendingSeek: true,
    });
    expect(action).toBe('commitPendingSeek');
  });

  test('maps channel up/down events consistently', () => {
    expect(resolvePlayerRemoteAction({
      isFocused: true,
      eventType: 'channelUp',
      showOverlay: false,
      canSeek: true,
      hasPendingSeek: false,
    })).toBe('switchChannelUp');

    expect(resolvePlayerRemoteAction({
      isFocused: true,
      eventType: 'pageDown',
      showOverlay: false,
      canSeek: true,
      hasPendingSeek: false,
    })).toBe('switchChannelDown');
  });

  test('blocks non-select events while overlay is visible', () => {
    expect(resolvePlayerRemoteAction({
      isFocused: true,
      eventType: 'up',
      showOverlay: true,
      canSeek: true,
      hasPendingSeek: false,
    })).toBe('ignore');
  });

  test('allows select-like events while overlay is visible', () => {
    expect(resolvePlayerRemoteAction({
      isFocused: true,
      eventType: 'select',
      showOverlay: true,
      canSeek: true,
      hasPendingSeek: false,
    })).toBe('showOverlay');
  });

  test('maps rewind/skip backward to previous channel action', () => {
    expect(resolvePlayerRemoteAction({
      isFocused: true,
      eventType: 'rewind',
      showOverlay: false,
      canSeek: true,
      hasPendingSeek: false,
    })).toBe('switchToPreviousChannel');
  });
});
