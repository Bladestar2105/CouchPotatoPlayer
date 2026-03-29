import React, { useMemo } from 'react';
import { View, StyleSheet, Platform, NativeModules } from 'react-native';
import { useIPTV } from '../context/IPTVContext';
import { useSettings } from '../context/SettingsContext';

// ---------------------------------------------------------------------------
// Platform-gated player imports
// ---------------------------------------------------------------------------

// expo-av (web only)
let WebVideoComponent: any;

// react-native-video (iOS phone/tablet & Android, NOT tvOS)
let NativeVideoComponent: any;

// react-native-vlc-media-player (Android, iOS phone/tablet, AND tvOS via TVVLCKit)
let VLCPlayerComponent: any;

if (Platform.OS === 'web') {
  WebVideoComponent = require('expo-av').Video;
} else {
  // VLC is available on ALL native platforms including tvOS (via TVVLCKit)
  try {
    VLCPlayerComponent = require('react-native-vlc-media-player').VLCPlayer;
  } catch (e) {
    console.warn('[VideoPlayer] react-native-vlc-media-player not available:', e);
  }

  // react-native-video is only available on non-TV platforms
  if (!Platform.isTV) {
    try {
      NativeVideoComponent = require('react-native-video').default;
    } catch (e) {
      console.warn('[VideoPlayer] react-native-video not available:', e);
    }
  }
}

// ---------------------------------------------------------------------------
// Stream type detection
// ---------------------------------------------------------------------------

type StreamKind = 'hls' | 'mp4' | 'ts' | 'unknown';

function detectStreamKind(url: string): StreamKind {
  const lower = url.toLowerCase().split('?')[0].split('#')[0];
  if (lower.includes('.m3u8') || lower.includes('/m3u8')) return 'hls';
  if (lower.endsWith('.mp4') || lower.includes('.mp4?')) return 'mp4';
  if (lower.endsWith('.ts') || lower.includes('.ts?') || lower.includes('/ts')) return 'ts';
  // Many IPTV streams are raw TS without extension
  return 'unknown';
}

/** AVPlayer can only handle HLS and MP4 natively */
function canAVPlayerHandle(kind: StreamKind): boolean {
  return kind === 'hls' || kind === 'mp4';
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
// Apple AVPlayer component (HLS & MP4 ONLY)
// ---------------------------------------------------------------------------
const AppleAVPlayer = ({
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
      onVideoLoad={(event: any) => {
        if (onVideoLoad && event.nativeEvent) {
          onVideoLoad({
            width: event.nativeEvent.width,
            height: event.nativeEvent.height,
          });
        }
      }}
      onVideoError={(event: any) => {
        console.warn('[SwiftTSPlayerView] Playback error:', event.nativeEvent?.error);
      }}
    />
  );
};

// ---------------------------------------------------------------------------
// Helper: resolve proxy URL for VLC/KSPlayer on Apple platforms
// ---------------------------------------------------------------------------
const resolveProxyUrl = async (url: string): Promise<string> => {
  if (Platform.OS !== 'ios') return url;

  // HLS and MP4 don't need proxy — players handle them directly
  const kind = detectStreamKind(url);
  if (kind === 'hls' || kind === 'mp4') return url;

  // For raw TS / unknown streams on Apple, route through the local Swift proxy
  // for header forwarding and ATS bypass
  try {
    const { SwiftTSPlayerProxyModule } = NativeModules;
    if (SwiftTSPlayerProxyModule?.registerStream) {
      const proxyUrl = await SwiftTSPlayerProxyModule.registerStream(url);
      return proxyUrl;
    }
  } catch (e) {
    console.warn('[VideoPlayer] SwiftTSPlayerProxyModule not available, using direct URL');
  }

  return url;
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

    // Detect stream kind
    const streamKind = useMemo((): StreamKind => {
      if (!streamUrl) return 'unknown';
      return detectStreamKind(streamUrl);
    }, [streamUrl]);

    // Resolve proxy URL for VLC/KSPlayer on Apple platforms (async)
    const [resolvedProxyUrl, setResolvedProxyUrl] = React.useState<string | null>(null);
    React.useEffect(() => {
      if (!streamUrl) {
        setResolvedProxyUrl(null);
        return;
      }
      // Only VLC and KSPlayer need proxy resolution on Apple platforms
      if (Platform.OS === 'ios' && (playerType === 'vlc' || playerType === 'ksplayer')) {
        let cancelled = false;
        resolveProxyUrl(streamUrl).then((url) => {
          if (!cancelled) setResolvedProxyUrl(url);
        });
        return () => { cancelled = true; };
      }
      setResolvedProxyUrl(streamUrl);
    }, [streamUrl, playerType]);

    // Determine the effective player to use (with smart fallback)
    const effectivePlayer = useMemo(() => {
      if (Platform.OS === 'web') return 'web';

      if (Platform.isTV) {
        // tvOS: if user chose avkit but stream is TS, auto-fallback to vlc
        if (playerType === 'avkit' && canAVPlayerHandle(streamKind)) return 'avkit';
        if (playerType === 'ksplayer') return 'ksplayer';
        // Default: VLC for everything on tvOS (handles all formats)
        return 'vlc';
      }

      // iOS (phone/tablet)
      if (Platform.OS === 'ios') {
        if (playerType === 'avkit' && canAVPlayerHandle(streamKind)) return 'avkit';
        if (playerType === 'avkit' && !canAVPlayerHandle(streamKind)) {
          // AVKit can't handle TS — auto-fallback
          console.warn('[VideoPlayer] AVKit cannot play TS stream, falling back to VLC');
          return 'vlc';
        }
        if (playerType === 'vlc') return 'vlc';
        if (playerType === 'ksplayer') return 'ksplayer';
        return 'native';
      }

      // Android
      if (playerType === 'vlc') return 'vlc';
      return 'native';
    }, [playerType, streamKind]);

    // Ref for imperative seek
    const videoRef = React.useRef<any>(null);

    React.useImperativeHandle(ref, () => ({
      seek: (position: number) => {
        if (videoRef.current?.seek) {
          videoRef.current.seek(position / 1000);
        }
      },
    }));

    React.useEffect(() => {
      if (seekPosition === undefined) return;
      if (effectivePlayer === 'avkit') return;
      if (videoRef.current?.seek) {
        videoRef.current.seek(seekPosition / 1000.0);
      }
    }, [seekPosition, effectivePlayer]);

    // -----------------------------------------------------------------------
    // Render helpers
    // -----------------------------------------------------------------------

    const renderAVPlayer = () => {
      if (!streamUrl) return null;
      return (
        <AppleAVPlayer
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
      if (!NativeVideoComponent || !streamUrl) return null;

      let sourceType: string | undefined;
      const lowerUrl = streamUrl.toLowerCase();
      if (lowerUrl.includes('.m3u8')) sourceType = 'm3u8';
      else if (lowerUrl.includes('.ts')) sourceType = 'ts';
      else if (lowerUrl.includes('.mp4')) sourceType = 'mp4';

      return (
        <NativeVideoComponent
          ref={videoRef}
          key={currentStream?.id}
          source={{ uri: streamUrl, type: sourceType }}
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

    const renderVLCPlayer = (url?: string) => {
      const effectiveUrl = url || resolvedProxyUrl || streamUrl;
      if (!VLCPlayerComponent || !effectiveUrl) return null;

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
          source={{ uri: effectiveUrl, initOptions: vlcInitOptions }}
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

    // KSPlayer uses VLC as fallback for now — will be replaced with actual
    // KSPlayer React Native bridge when available. The proxy URL setup is
    // already compatible since KSPlayer supports raw TS via FFmpeg.
    const renderKSPlayer = () => {
      // KSPlayer native bridge not yet available —
      // fall back to VLC which uses the same proxy infrastructure
      console.warn('[VideoPlayer] KSPlayer bridge not yet available, using VLC as fallback');
      return renderVLCPlayer();
    };

    const renderPlayer = () => {
      if (!streamUrl) return null;

      switch (effectivePlayer) {
        case 'web':
          return renderWebPlayer();
        case 'avkit':
          return renderAVPlayer();
        case 'vlc':
          return renderVLCPlayer();
        case 'ksplayer':
          return renderKSPlayer();
        case 'native':
          return renderNativePlayer();
        default:
          return renderNativePlayer();
      }
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
});

export default VideoPlayer;