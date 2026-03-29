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
  // VLC is available on all native platforms including tvOS (via TVVLCKit)
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
// Stream type detection
// ---------------------------------------------------------------------------
// AVPlayer ONLY works with HLS (.m3u8) and progressive MP4/MOV.
// Raw MPEG-TS streams MUST use VLC.  This is a hard Apple platform limitation.

type StreamKind = 'hls' | 'mp4' | 'ts' | 'unknown';

function detectStreamKind(url: string): StreamKind {
  const lower = url.toLowerCase().split('?')[0]; // strip query params
  if (lower.endsWith('.m3u8') || lower.includes('.m3u8?') || lower.includes('/live/') && lower.includes('.m3u8')) return 'hls';
  // Some Xtream Codes URLs contain /live/ with format params
  if (lower.includes('output=m3u8') || lower.includes('type=m3u8')) return 'hls';
  if (lower.endsWith('.mp4') || lower.endsWith('.mov')) return 'mp4';
  if (lower.endsWith('.ts')) return 'ts';
  // Xtream Codes API: URLs with /live/user/pass/channelid — these serve raw TS
  // URLs with no extension that come from IPTV providers are almost always TS
  return 'unknown';
}

function canAVPlayerHandle(kind: StreamKind): boolean {
  return kind === 'hls' || kind === 'mp4';
}

// ---------------------------------------------------------------------------
// Helper: get a proxy URL for VLC on Apple platforms
// ---------------------------------------------------------------------------
async function getProxyUrl(url: string): Promise<string> {
  if (Platform.OS !== 'ios') return url;
  try {
    const { SwiftTSPlayerProxyModule } = NativeModules;
    if (SwiftTSPlayerProxyModule?.registerStream) {
      return await SwiftTSPlayerProxyModule.registerStream(url);
    }
  } catch (e) {
    console.warn('[VideoPlayer] Proxy not available, using direct URL');
  }
  return url;
}

// ---------------------------------------------------------------------------
// Apple AVPlayer wrapper (HLS / MP4 ONLY)
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
      onVideoLoad={(event) => {
        if (onVideoLoad && event.nativeEvent) {
          onVideoLoad({
            width: event.nativeEvent.width,
            height: event.nativeEvent.height,
          });
        }
      }}
      onVideoError={(event) => {
        console.warn('[AVPlayer] Playback error:', event.nativeEvent?.error);
      }}
    />
  );
};

// ---------------------------------------------------------------------------
// Helper: get a proxy URL for VLC on Apple platforms (tvOS / iOS)
// The SwiftTSPlayerProxy provides a direct TS pass-through endpoint that
// VLC can consume natively without the HLS segmentation layer.
// ---------------------------------------------------------------------------
const getVLCProxyUrl = async (url: string): Promise<string> => {
  if (Platform.OS !== 'ios') return url;

  // If the URL is already HLS or MP4, VLC can handle it directly
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('.m3u8') || lowerUrl.includes('.mp4')) {
    return url;
  }

  // For raw TS streams on Apple platforms, route through the local Swift proxy
  // using the direct pass-through endpoint. This ensures proper TS handling
  // without the HLS segmentation overhead.
  try {
    const { SwiftTSPlayerProxyModule } = NativeModules;
    if (SwiftTSPlayerProxyModule && SwiftTSPlayerProxyModule.registerStreamDirect) {
      const proxyUrl = await SwiftTSPlayerProxyModule.registerStreamDirect(url);
      return proxyUrl;
    }
  } catch (e) {
    console.warn('[VideoPlayer] SwiftTSPlayerProxyModule not available for VLC, using direct URL');
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
      if (Platform.OS === 'web') return `/proxy/${currentStream.url}`;
      return currentStream.url;
    }, [currentStream?.url]);

    const streamKind = useMemo(() => {
      if (!streamUrl) return 'unknown' as StreamKind;
      return detectStreamKind(streamUrl);
    }, [streamUrl]);

    // For VLC on Apple platforms, resolve proxy URL asynchronously
    const [resolvedVlcUrl, setResolvedVlcUrl] = React.useState<string | null>(null);
    React.useEffect(() => {
      if (!streamUrl) { setResolvedVlcUrl(null); return; }
      // Only proxy non-HLS/MP4 streams on iOS (TS and unknown streams)
      if (Platform.OS === 'ios' && !canAVPlayerHandle(streamKind)) {
        let cancelled = false;
        getProxyUrl(streamUrl).then((url) => {
          if (!cancelled) setResolvedVlcUrl(url);
        });
        return () => { cancelled = true; };
      }
      setResolvedVlcUrl(streamUrl);
    }, [streamUrl, streamKind]);

    const videoRef = React.useRef<any>(null);

    React.useImperativeHandle(ref, () => ({
      seek: (position: number) => {
        if (videoRef.current?.seek) videoRef.current.seek(position / 1000);
      },
    }));

    React.useEffect(() => {
      if (seekPosition === undefined) return;
      if (playerType === 'avkit') return; // SwiftTSPlayer doesn't support imperative seek
      if (videoRef.current?.seek) videoRef.current.seek(seekPosition / 1000.0);
    }, [seekPosition, playerType]);

    // -----------------------------------------------------------------------
    // Player renderers
    // -----------------------------------------------------------------------

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

    const renderAVPlayer = () => (
      <AppleAVPlayer
        streamUrl={streamUrl!}
        paused={paused}
        onProgress={onProgress}
        onVideoLoad={onVideoLoad}
      />
    );

    const renderVLCPlayer = (url: string) => {
      const safeBufferMs = Math.max(
        bufferSize > 100 ? bufferSize : bufferSize * 100,
        1500,
      );
      const initOptions = [
        `--network-caching=${safeBufferMs}`,
        `--live-caching=${safeBufferMs}`,
        `--file-caching=${safeBufferMs}`,
        vlcHardwareAcceleration ? '--avcodec-hw=any' : '--avcodec-hw=none',
      ];

      return (
        <VLCPlayerComponent
          ref={videoRef}
          key={currentStream?.id}
          onProgress={onProgress}
          source={{ uri: url, initOptions }}
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

    const renderNativePlayer = () => {
      let sourceType: string | undefined;
      if (streamKind === 'hls') sourceType = 'm3u8';
      else if (streamKind === 'ts') sourceType = 'ts';
      else if (streamKind === 'mp4') sourceType = 'mp4';

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
            console.warn('[NativeVideo] Playback error:', error);
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
            minBufferMs: Math.max(bufferSize > 100 ? bufferSize : bufferSize * 100, 1500),
            maxBufferMs: Math.max(bufferSize > 100 ? bufferSize * 2 : bufferSize * 200, 3000),
            bufferForPlaybackMs: 2500,
            bufferForPlaybackAfterRebufferMs: 5000,
          }}
        />
      );
    };

    // -----------------------------------------------------------------------
    // Player selection logic
    // -----------------------------------------------------------------------
    const renderPlayer = () => {
      if (!streamUrl) return null;

      // Web: always use expo-av
      if (Platform.OS === 'web') return renderWebPlayer();

      // --- tvOS ---
      if (Platform.isTV) {
        // User explicitly chose AVKit AND stream is AVPlayer-compatible
        if (playerType === 'avkit' && canAVPlayerHandle(streamKind)) {
          return renderAVPlayer();
        }
        // Everything else: VLC (the only player that handles raw TS on Apple)
        if (VLCPlayerComponent && resolvedVlcUrl) {
          return renderVLCPlayer(resolvedVlcUrl);
        }
        // Fallback: try AVPlayer (will only work for HLS/MP4)
        if (canAVPlayerHandle(streamKind)) return renderAVPlayer();
        // Nothing works — VLC not available and stream is TS
        console.warn('[VideoPlayer] No player available for TS stream on tvOS');
        return null;
      }

      // --- iOS (phone/tablet) ---
      if (Platform.OS === 'ios') {
        if (playerType === 'avkit' && canAVPlayerHandle(streamKind)) {
          return renderAVPlayer();
        }
        if (playerType === 'vlc' && VLCPlayerComponent && resolvedVlcUrl) {
          return renderVLCPlayer(resolvedVlcUrl);
        }
        if (playerType === 'native' && NativeVideoComponent) {
          return renderNativePlayer();
        }
        // Smart fallback: if user chose AVKit but stream is TS, use VLC
        if (playerType === 'avkit' && !canAVPlayerHandle(streamKind) && VLCPlayerComponent && resolvedVlcUrl) {
          return renderVLCPlayer(resolvedVlcUrl);
        }
        // Default fallback chain
        if (VLCPlayerComponent && resolvedVlcUrl) return renderVLCPlayer(resolvedVlcUrl);
        if (NativeVideoComponent) return renderNativePlayer();
        return null;
      }

      // --- Android ---
      if (playerType === 'vlc' && VLCPlayerComponent) {
        return renderVLCPlayer(streamUrl);
      }
      if (NativeVideoComponent) return renderNativePlayer();
      if (VLCPlayerComponent) return renderVLCPlayer(streamUrl);
      return null;
    };

    return (
      <View style={styles.container}>
        {streamUrl ? renderPlayer() : <View style={styles.placeholder} />}
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