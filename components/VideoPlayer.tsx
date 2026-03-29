import React, { useMemo } from 'react';
import { View, StyleSheet, Text, Platform } from 'react-native';
import { useIPTV } from '../context/IPTVContext';
import { useSettings } from '../context/SettingsContext';

// ---------------------------------------------------------------------------
// Platform-gated player imports
// ---------------------------------------------------------------------------
// expo-video: used on tvOS (Platform.isTV) — AVKit-based, works on Apple TV
// Simulator. react-native-video uses a lower-level AVPlayer pipeline that
// triggers error -11850 ("Operation Stopped / server not correctly
// configured") on the tvOS Simulator when Metal GPU access is restricted.
let ExpoVideoView: any;
let useExpoVideoPlayer: any;

// expo-av (web only)
let WebVideoComponent: any;

// react-native-video (iOS phone/tablet & Android, NOT tvOS)
let NativeVideoComponent: any;

// react-native-vlc-media-player (Android & iOS phone/tablet, NOT tvOS)
let VLCPlayerComponent: any;

if (Platform.OS === 'web') {
  WebVideoComponent = require('expo-av').Video;
} else {
  // Note: Instead of expo-video, we use a custom native SwiftTSPlayerView for Apple environments
  // to support low-latency local TS proxies for IPTV playback.

  // For iOS and Android, other native players are supported
  if (!Platform.isTV) {
    VLCPlayerComponent = require('react-native-vlc-media-player').VLCPlayer;
    NativeVideoComponent = require('react-native-video').default;
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface VideoMetadata {
  width?: number;
  height?: number;
  fps?: number;
  bitrate?: number;
}

interface VideoPlayerProps {
  paused?: boolean;
  onSeek?: (position: number) => void;
  seekPosition?: number;
  onProgress?: (data: { currentTime: number; duration: number }) => void;
  onVideoLoad?: (metadata: VideoMetadata) => void;
}

import { SwiftTSPlayer } from './SwiftTSPlayer';

// ---------------------------------------------------------------------------
// Apple environment custom player (SwiftTSPlayerView)
// ---------------------------------------------------------------------------
const AppleCustomVideoPlayer = ({
  streamUrl,
  paused,
  onProgress,
  onVideoLoad,
}: {
  streamUrl: string;
  paused: boolean;
  onProgress?: VideoPlayerProps['onProgress'];
  onVideoLoad?: VideoPlayerProps['onVideoLoad'];
}) => {
  // Use a simple timer to emulate progress since the native view currently
  // does not report progress directly, though it could be added to the module.
  React.useEffect(() => {
    if (!onProgress) return;
    let time = 0;
    const interval = setInterval(() => {
      if (!paused) {
        time += 1;
        onProgress({ currentTime: time * 1000, duration: 0 });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [paused, onProgress]);

  return (
    <SwiftTSPlayer
      streamUrl={streamUrl}
      paused={paused}
      style={styles.video}
      onVideoLoad={(event) => {
        if (onVideoLoad && event.nativeEvent) {
          onVideoLoad({
            width: event.nativeEvent.width,
            height: event.nativeEvent.height,
          });
        }
      }}
      onVideoError={(event) => {
        console.warn('[SwiftTSPlayerView] Playback error:', event.nativeEvent?.error);
      }}
    />
  );
};

// ---------------------------------------------------------------------------
// Main VideoPlayer component
// ---------------------------------------------------------------------------

const VideoPlayer = React.forwardRef(
  (
    {
      paused = false,
      onSeek,
      seekPosition,
      onProgress,
      onVideoLoad,
    }: VideoPlayerProps,
    ref,
  ) => {
    const { currentStream } = useIPTV();
    const { bufferSize, playerType, vlcHardwareAcceleration } = useSettings();

    const streamUrl = useMemo(() => {
      if (!currentStream?.url) return null;
      if (Platform.OS === 'web') {
        return `/proxy/${currentStream.url}`;
      }
      return currentStream.url;
    }, [currentStream?.url]);

    // Ref used by non-tvOS players for imperative seek
    const videoRef = React.useRef<any>(null);

    React.useImperativeHandle(ref, () => ({
      seek: (position: number) => {
        if (videoRef.current && videoRef.current.seek) {
          videoRef.current.seek(position / 1000);
        }
      },
    }));

    // Declarative seeking for non-SwiftTS players
    React.useEffect(() => {
      if (seekPosition === undefined) return;
      if (Platform.isTV || (Platform.OS === 'ios' && playerType === 'avkit')) return; // SwiftTSPlayer handles seek differently
      if (videoRef.current && videoRef.current.seek) {
        videoRef.current.seek(seekPosition / 1000.0);
      }
    }, [seekPosition, playerType]);

    // -----------------------------------------------------------------------
    // Render helpers
    // -----------------------------------------------------------------------

    const renderAppleCustomPlayer = () => {
      if (!streamUrl) return null;
      return (
        <AppleCustomVideoPlayer
          streamUrl={streamUrl}
          paused={paused}
          onProgress={onProgress}
          onVideoLoad={onVideoLoad}
        />
      );
    };

    const renderWebPlayer = () => (
      <WebVideoComponent
        ref={videoRef}
        key={currentStream?.id}
        onProgress={onProgress}
        source={{ uri: streamUrl! }}
        paused={paused}
        autoplay={!paused}
        shouldPlay={!paused}
        style={styles.video}
        resizeMode="contain"
        useNativeControls={true}
      />
    );

    const renderNativePlayer = () => {
      let sourceType: string | undefined;
      const lowerUrl = streamUrl?.toLowerCase() || '';
      if (lowerUrl.includes('.m3u8')) sourceType = 'm3u8';
      else if (lowerUrl.includes('.ts')) sourceType = 'ts';
      else if (lowerUrl.includes('.mp4')) sourceType = 'mp4';

      return (
        <NativeVideoComponent
          ref={videoRef}
          key={currentStream?.id}
          source={{ uri: streamUrl!, type: sourceType }}
          paused={paused}
          style={styles.video}
          resizeMode="contain"
          onProgress={onProgress}
          onError={(error: any) => {
            console.warn('[NativeVideoComponent] Playback error:', error);
          }}
          onLoad={(payload: any) => {
            if (onVideoLoad && payload?.naturalSize) {
              onVideoLoad({
                width: payload.naturalSize.width,
                height: payload.naturalSize.height,
                fps: payload.videoTrack?.frameRate,
                bitrate: payload.videoTrack?.bitrate,
              });
            }
          }}
          bufferConfig={{
            minBufferMs: Math.max(
              bufferSize > 100 ? bufferSize : bufferSize * 100,
              1500,
            ),
            maxBufferMs: Math.max(
              bufferSize > 100 ? bufferSize * 2 : bufferSize * 200,
              3000,
            ),
            bufferForPlaybackMs: 2500,
            bufferForPlaybackAfterRebufferMs: 5000,
          }}
        />
      );
    };

    const renderVLCPlayer = () => {
      const safeVlcBufferSizeMs = Math.max(
        bufferSize > 100 ? bufferSize : bufferSize * 100,
        1500,
      );
      const vlcInitOptions = [
        `--network-caching=${safeVlcBufferSizeMs}`,
        `--live-caching=${safeVlcBufferSizeMs}`,
        `--file-caching=${safeVlcBufferSizeMs}`,
        vlcHardwareAcceleration ? '--avcodec-hw=any' : '--avcodec-hw=none',
      ];

      return (
        <VLCPlayerComponent
          ref={videoRef}
          key={currentStream?.id}
          onProgress={onProgress}
          source={{ uri: streamUrl!, initOptions: vlcInitOptions }}
          paused={paused}
          autoplay={!paused}
          style={styles.video}
          resizeMode="contain"
          onPlaying={(event: any) => {
            if (onVideoLoad && event) {
              onVideoLoad({
                width: event.videoWidth || event.target?.videoWidth,
                height: event.videoHeight || event.target?.videoHeight,
              });
            }
          }}
        />
      );
    };

    const renderPlayer = () => {
      if (!streamUrl) return null;

      if (Platform.OS === 'web') return renderWebPlayer();

      // tvOS: always use custom AVKit player
      if (Platform.isTV) return renderAppleCustomPlayer();

      // iOS (phone/tablet)
      if (Platform.OS === 'ios' && playerType === 'avkit') return renderAppleCustomPlayer();

      // iOS (phone/tablet) & Android
      if (playerType === 'native') return renderNativePlayer();
      return renderVLCPlayer();
    };

    return (
      <View style={styles.container}>
        {streamUrl ? (
          renderPlayer()
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  placeholderText: {
    color: '#FFF',
  },
});

export default VideoPlayer;