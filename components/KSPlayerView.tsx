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
import { View, StyleSheet, Platform, Text, ViewProps, NativeSyntheticEvent } from 'react-native';
import type { PlaybackTrackGroups } from './player/PlaybackTracks';

export interface KSPlayerVideoMetadata {
  width?: number;
  height?: number;
  duration?: number;
}

export interface KSPlayerErrorEvent {
  error: string;
}

export interface KSPlayerProgressEvent {
  currentTime: number;
  duration: number;
}

export interface KSPlayerStateEvent {
  state: string;
}

export interface KSPlayerTracksChangedEvent extends PlaybackTrackGroups {}

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
  /** Seek target in milliseconds. */
  seekPosition?: number;
  /** Explicit audio track selection by native track id. */
  selectedAudioTrackId?: number | null;
  /** Explicit subtitle track selection by native track id, null disables subtitles. */
  selectedTextTrackId?: number | null;
  /** Called when the video is ready to play. */
  onVideoLoad?: (metadata: KSPlayerVideoMetadata) => void;
  /** Called when a playback error occurs. */
  onVideoError?: (error: string) => void;
  /** Called periodically with playback progress. */
  onProgress?: (data: { currentTime: number; duration: number }) => void;
  /** Called when the player state changes. */
  onPlayerState?: (state: string) => void;
  /** Called when audio or subtitle tracks change. */
  onTracksChanged?: (tracks: PlaybackTrackGroups) => void;
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
  seekPosition,
  selectedAudioTrackId,
  selectedTextTrackId,
  onVideoLoad,
  onVideoError,
  onProgress,
  onPlayerState,
  onTracksChanged,
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
      seekPosition={seekPosition}
      selectedAudioTrackId={selectedAudioTrackId}
      selectedTextTrackId={selectedTextTrackId}
      onKSVideoLoad={(event: NativeSyntheticEvent<KSPlayerVideoMetadata>) => {
        if (onVideoLoad && event?.nativeEvent) {
          onVideoLoad({
            width: event.nativeEvent.width,
            height: event.nativeEvent.height,
            duration: event.nativeEvent.duration,
          });
        }
      }}
      onKSVideoError={(event: NativeSyntheticEvent<KSPlayerErrorEvent>) => {
        if (onVideoError && event?.nativeEvent) {
          onVideoError(event.nativeEvent.error ?? 'Unknown error');
        }
      }}
      onKSProgress={(event: NativeSyntheticEvent<KSPlayerProgressEvent>) => {
        if (onProgress && event?.nativeEvent) {
          onProgress({
            currentTime: event.nativeEvent.currentTime ?? 0,
            duration: event.nativeEvent.duration ?? 0,
          });
        }
      }}
      onKSPlayerState={(event: NativeSyntheticEvent<KSPlayerStateEvent>) => {
        if (onPlayerState && event?.nativeEvent) {
          onPlayerState(event.nativeEvent.state ?? '');
        }
      }}
      onKSTracksChanged={(event: NativeSyntheticEvent<KSPlayerTracksChangedEvent>) => {
        if (onTracksChanged && event?.nativeEvent) {
          onTracksChanged({
            audioTracks: event.nativeEvent.audioTracks ?? [],
            textTracks: event.nativeEvent.textTracks ?? [],
          });
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
