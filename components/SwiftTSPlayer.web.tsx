import React from 'react';
import { View, ViewProps, NativeSyntheticEvent } from 'react-native';
import type { PlaybackTrackGroups } from './player/PlaybackTracks';

export interface SwiftTSVideoLoadEvent {
  width: number;
  height: number;
}

export interface SwiftTSVideoErrorEvent {
  error: string;
}

export interface SwiftTSProgressEvent {
  currentTime: number;
  duration: number;
}

export interface SwiftTSTracksChangedEvent extends PlaybackTrackGroups {}

interface SwiftTSPlayerProps extends ViewProps {
  streamUrl?: string;
  paused?: boolean;
  seekPosition?: number;
  selectedAudioTrackId?: number | null;
  selectedTextTrackId?: number | null;
  onVideoLoad?: (event: NativeSyntheticEvent<SwiftTSVideoLoadEvent>) => void;
  onVideoError?: (event: NativeSyntheticEvent<SwiftTSVideoErrorEvent>) => void;
  onProgress?: (event: NativeSyntheticEvent<SwiftTSProgressEvent>) => void;
  onTracksChanged?: (event: NativeSyntheticEvent<SwiftTSTracksChangedEvent>) => void;
}

export const SwiftTSPlayer: React.FC<SwiftTSPlayerProps> = (props) => {
  return <View {...props} />;
};

export default SwiftTSPlayer;
