import React from 'react';
import { ViewProps, NativeSyntheticEvent } from 'react-native';
import { SwiftTSPlayerView } from 'react-native-swift-ts-player';

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

interface SwiftTSPlayerProps extends ViewProps {
  streamUrl?: string;
  paused?: boolean;
  seekPosition?: number;
  onVideoLoad?: (event: NativeSyntheticEvent<SwiftTSVideoLoadEvent>) => void;
  onVideoError?: (event: NativeSyntheticEvent<SwiftTSVideoErrorEvent>) => void;
  onProgress?: (event: NativeSyntheticEvent<SwiftTSProgressEvent>) => void;
}

export const SwiftTSPlayer: React.FC<SwiftTSPlayerProps> = ({
  onVideoLoad,
  onVideoError,
  onProgress,
  ...props
}) => {
  return (
    <SwiftTSPlayerView
      {...props}
      onSwiftVideoLoad={onVideoLoad}
      onSwiftVideoError={onVideoError}
      onSwiftProgress={onProgress}
    />
  );
};
