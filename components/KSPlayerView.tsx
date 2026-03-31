/**
 * KSPlayerView — React Native wrapper around the native KSPlayer bridge.
 *
 * KSPlayer uses FFmpegKit (MEPlayer backend) under the hood which means:
 *   ✅ Raw MPEG-TS live streams (IPTV)
 *   ✅ HLS (.m3u8)
 *   ✅ MP4, MKV, AVI and all FFmpeg-supported formats
 *   ✅ Hardware VideoToolbox decoding (H.264 / H.265)
 *   ✅ iOS 13+ and tvOS 13+
 *
 * On platforms where KSPlayer is not available (Android, Web) this component
 * renders nothing and warns — the VideoPlayer component should route around it.
 */

import React from 'react';
import { View, StyleSheet, Platform, Text, ViewProps } from 'react-native';

export interface KSPlayerVideoMetadata {
  width?: number;
  height?: number;
  duration?: number;
}

export interface KSPlayerProps extends ViewProps {
  /** The URL to play. Supports HLS, MP4, raw TS, and all FFmpeg formats. */
  streamUrl: string;
  /** Whether playback is paused. */
  paused?: boolean;
  /** Whether to use hardware decoding */
  hardwareDecode?: boolean;
  /** Whether to use asynchronous decompression */
  asynchronousDecompression?: boolean;
  /** Whether to use adaptive display frame rate */
  displayFrameRate?: boolean;
  /** Called when the video is ready to play. */
  onVideoLoad?: (metadata: KSPlayerVideoMetadata) => void;
  /** Called when a playback error occurs. */
  onVideoError?: (error: string) => void;
  /** Called periodically with playback progress. */
  onProgress?: (data: { currentTime: number; duration: number }) => void;
  /** Called when the player state changes. */
  onPlayerState?: (state: string) => void;
}

// Only load the native component on Apple platforms
let KSPlayerNativeView: any = null;

if (Platform.OS === 'ios') {
  try {
    KSPlayerNativeView = require('react-native-ksplayer').KSPlayerNativeView;
  } catch (e) {
    console.warn('[KSPlayerView] react-native-ksplayer native module not available:', e);
  }
}

export const KSPlayerView: React.FC<KSPlayerProps> = ({
  streamUrl,
  paused = false,
  hardwareDecode = true,
  asynchronousDecompression = false,
  displayFrameRate = true,
  onVideoLoad,
  onVideoError,
  onProgress,
  onPlayerState,
  style,
  ...rest
}) => {
  if (!KSPlayerNativeView) {
    // Non-Apple platform or native module not installed
    if (__DEV__) {
      return (
        <View style={[styles.container, style]}>
          <Text style={styles.errorText}>
            KSPlayer is not available on this platform.
          </Text>
        </View>
      );
    }
    return <View style={[styles.container, style]} />;
  }

  return (
    <KSPlayerNativeView
      {...rest}
      style={[styles.video, style]}
      streamUrl={streamUrl}
      paused={paused}
      hardwareDecode={hardwareDecode}
      asynchronousDecompression={asynchronousDecompression}
      displayFrameRate={displayFrameRate}
      onKSVideoLoad={(event: any) => {
        if (onVideoLoad && event?.nativeEvent) {
          onVideoLoad({
            width: event.nativeEvent.width,
            height: event.nativeEvent.height,
            duration: event.nativeEvent.duration,
          });
        }
      }}
      onKSVideoError={(event: any) => {
        if (onVideoError && event?.nativeEvent) {
          onVideoError(event.nativeEvent.error ?? 'Unknown error');
        }
      }}
      onKSProgress={(event: any) => {
        if (onProgress && event?.nativeEvent) {
          onProgress({
            currentTime: event.nativeEvent.currentTime ?? 0,
            duration: event.nativeEvent.duration ?? 0,
          });
        }
      }}
      onKSPlayerState={(event: any) => {
        if (onPlayerState && event?.nativeEvent) {
          onPlayerState(event.nativeEvent.state ?? '');
        }
      }}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  errorText: {
    color: '#888',
    fontSize: 14,
  },
});

export default KSPlayerView;