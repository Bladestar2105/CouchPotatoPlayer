import React from 'react';
import { ViewProps, Platform, View } from 'react-native';

interface KSPlayerViewProps extends ViewProps {
  source: { uri: string };
  onLoadStart?: () => void;
  onLoad?: () => void;
  onError?: (e: any) => void;
  onBuffer?: (e: { isBuffering: boolean }) => void;
  // ── Buffer & Quality Settings ──
  preferredForwardBufferDuration?: number;  // seconds (default: 10)
  maxBufferDuration?: number;               // seconds (default: 30)
  hardwareDecode?: boolean;                 // default: true
  isSecondOpen?: boolean;                   // fast channel switch (default: true)
  videoAdaptable?: boolean;                 // adaptive bitrate (default: true)
  isAutoPlay?: boolean;                     // default: true
  maxBitRate?: number;                      // 0 = unlimited
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