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

interface SwiftTSPlayerProps extends ViewProps {
  streamUrl?: string;
  paused?: boolean;
  onVideoLoad?: (event: NativeSyntheticEvent<SwiftTSVideoLoadEvent>) => void;
  onVideoError?: (event: NativeSyntheticEvent<SwiftTSVideoErrorEvent>) => void;
}

export const SwiftTSPlayer: React.FC<SwiftTSPlayerProps> = ({
  onVideoLoad,
  onVideoError,
  ...props
}) => {
  return (
    <SwiftTSPlayerView
      {...props}
      onSwiftVideoLoad={onVideoLoad}
      onSwiftVideoError={onVideoError}
    />
  );
};
