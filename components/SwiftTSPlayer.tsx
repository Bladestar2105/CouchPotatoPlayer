import React from 'react';
import { ViewProps } from 'react-native';
import { SwiftTSPlayerView } from 'react-native-swift-ts-player';

interface SwiftTSPlayerProps extends ViewProps {
  streamUrl?: string;
  paused?: boolean;
  onVideoLoad?: (event: any) => void;
  onVideoError?: (event: any) => void;
}

export const SwiftTSPlayer: React.FC<SwiftTSPlayerProps> = (props) => {
  return <SwiftTSPlayerView {...props} />;
};
