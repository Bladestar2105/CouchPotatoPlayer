import { Platform } from 'react-native';
import type { PlayerType } from '../../context/SettingsContext';

export type StreamKind = 'hls' | 'mp4' | 'ts' | 'unknown';
export type EffectivePlayer = 'web' | 'native' | 'avkit' | 'ksplayer' | 'vlc';

export interface PlayerSelectionInput {
  platformOS: typeof Platform.OS;
  isTV: boolean;
  preferredPlayer: PlayerType;
  streamKind: StreamKind;
}

export const detectStreamKind = (url: string): StreamKind => {
  const lower = url.toLowerCase().split('?')[0].split('#')[0];
  if (lower.includes('.m3u8') || lower.includes('/m3u8')) return 'hls';
  if (lower.endsWith('.mp4') || lower.includes('.mp4?')) return 'mp4';
  if (lower.endsWith('.ts') || lower.includes('.ts?') || lower.includes('/ts')) return 'ts';
  return 'unknown';
};

export const canAVPlayerHandle = (kind: StreamKind): boolean => {
  return kind === 'hls' || kind === 'mp4';
};

export const getAvailablePlayerTypesForPlatform = (
  platformOS: typeof Platform.OS = Platform.OS,
  isTV: boolean = Platform.isTV,
): PlayerType[] => {
  if (platformOS === 'web') return ['native'];
  if (platformOS === 'ios') return isTV ? ['ksplayer', 'avkit'] : ['ksplayer', 'avkit', 'native'];
  return ['vlc', 'native'];
};

export const getDefaultPlayerTypeForPlatform = (
  platformOS: typeof Platform.OS = Platform.OS,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _isTV: boolean = Platform.isTV,
): PlayerType => {
  if (platformOS === 'web') return 'native';
  // KSPlayer is bridged through `react-native-ksplayer` which only ships an
  // iOS / tvOS implementation, so it must NEVER be returned on Android (TV).
  // The previous `if (isTV) return 'ksplayer'` branch wrongly chose ksplayer
  // for Android TV — Android TV's allowed list is ['vlc', 'native'], and the
  // mismatch left the Settings picker without a matching option.
  if (platformOS === 'ios') return 'ksplayer';
  if (platformOS === 'android') return 'vlc';
  return 'native';
};

export const normalizePlayerTypeForPlatform = (
  type: PlayerType,
  platformOS: typeof Platform.OS = Platform.OS,
  isTV: boolean = Platform.isTV,
): PlayerType => {
  const allowed = getAvailablePlayerTypesForPlatform(platformOS, isTV);
  return allowed.includes(type) ? type : getDefaultPlayerTypeForPlatform(platformOS, isTV);
};

export const selectEffectivePlayer = ({
  platformOS,
  isTV,
  preferredPlayer,
  streamKind,
}: PlayerSelectionInput): EffectivePlayer => {
  if (platformOS === 'web') return 'web';

  const player = normalizePlayerTypeForPlatform(preferredPlayer, platformOS, isTV);

  if (platformOS === 'ios') {
    if (player === 'avkit' && canAVPlayerHandle(streamKind)) return 'avkit';
    if (player === 'native' && !isTV) return 'native';
    return 'ksplayer';
  }

  if (platformOS === 'android') {
    if (player === 'native') return 'native';
    return 'vlc';
  }

  return 'native';
};
