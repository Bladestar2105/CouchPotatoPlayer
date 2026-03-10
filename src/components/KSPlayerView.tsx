import React from 'react';
import { ViewProps, Platform, View } from 'react-native';

interface KSPlayerViewProps extends ViewProps {
  source: { uri: string };
  onLoadStart?: () => void;
  onLoad?: () => void;
  onError?: (e: any) => void;
}

let RNKSPlayerView: any;

if (Platform.OS === 'ios' || Platform.OS === 'macos' || Platform.OS === 'tvos') {
  try {
    RNKSPlayerView = require('react-native-ksplayer').RNKSPlayerView;
  } catch (e) {
    console.warn('react-native-ksplayer module not found', e);
  }
}

export const KSPlayerView: React.FC<KSPlayerViewProps> = (props) => {
  if (RNKSPlayerView) {
    return <RNKSPlayerView {...props} />;
  }
  return <View {...props} />;
};
