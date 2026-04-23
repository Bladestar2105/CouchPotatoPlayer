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
  isTV: boolean = Platform.isTV,
): PlayerType => {
  if (platformOS === 'ios') return 'ksplayer';
  if (platformOS === 'web') return 'native';
  if (isTV) return 'ksplayer';
  return 'vlc';
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
