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
  // For Apple environments (tvOS and iOS), expo-video is supported (AVKit)
  if (Platform.isTV || Platform.OS === 'ios') {
    try {
      const expoVideo = require('expo-video');
      ExpoVideoView = expoVideo.VideoView;
      useExpoVideoPlayer = expoVideo.useVideoPlayer;
    } catch (e) {
      console.warn('[VideoPlayer] expo-video not available on Apple environment:', e);
    }
  }

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

// ---------------------------------------------------------------------------
// tvOS player sub-component (expo-video)
// ---------------------------------------------------------------------------
// Defined as a separate inner component so that `useExpoVideoPlayer` hook
// is always called unconditionally at the top of a React component, avoiding
// the "Rules of Hooks" violation that would happen if we called it
// conditionally inside `renderPlayer`.
const TVOSVideoPlayer = ({
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
  if (!useExpoVideoPlayer || !ExpoVideoView) {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>expo-video not available</Text>
      </View>
    );
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const player = useExpoVideoPlayer(streamUrl, (p: any) => {
    p.loop = false;
    p.muted = false;
    if (!paused) {
      p.play();
    }
  });

  // Sync play/pause state
  React.useEffect(() => {
    if (!player) return;
    if (paused) {
      player.pause();
    } else {
      player.play();
    }
  }, [paused, player]);

  // Forward progress events
  React.useEffect(() => {
    if (!player || !onProgress) return;
    const interval = setInterval(() => {
      try {
        const currentTime = (player.currentTime ?? 0) * 1000; // seconds → ms
        const duration = (player.duration ?? 0) * 1000;
        onProgress({ currentTime, duration });
      } catch (_) {}
    }, 1000);
    return () => clearInterval(interval);
  }, [player, onProgress]);

  return (
    <ExpoVideoView
      player={player}
      style={styles.video}
      contentFit="contain"
      nativeControls={false}
      onPlaybackStatusUpdate={(status: any) => {
        if (status && onVideoLoad && status.videoWidth && status.videoHeight) {
          onVideoLoad({
            width: status.videoWidth,
            height: status.videoHeight,
          });
        }
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

    // Declarative seeking for non-expo-video players
    React.useEffect(() => {
      if (seekPosition === undefined) return;
      if (Platform.isTV || (Platform.OS === 'ios' && playerType === 'avkit')) return; // expo-video handles seek differently
      if (videoRef.current && videoRef.current.seek) {
        videoRef.current.seek(seekPosition / 1000.0);
      }
    }, [seekPosition, playerType]);

    // -----------------------------------------------------------------------
    // Render helpers
    // -----------------------------------------------------------------------

    const renderExpoVideoPlayer = () => {
      if (!streamUrl) return null;
      return (
        <TVOSVideoPlayer
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

      // tvOS: always use expo-video regardless of playerType setting
      if (Platform.isTV) return renderExpoVideoPlayer();

      // iOS (phone/tablet)
      if (Platform.OS === 'ios' && playerType === 'avkit') return renderExpoVideoPlayer();

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