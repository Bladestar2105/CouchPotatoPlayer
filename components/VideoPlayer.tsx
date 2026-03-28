import React, { useMemo } from 'react';
import { View, StyleSheet, Text, Platform } from 'react-native';
import { useIPTV } from '../context/IPTVContext';
import { useSettings } from '../context/SettingsContext';

let WebVideoComponent: any;
let VLCPlayerComponent: any;
let NativeVideoComponent: any;

if (Platform.OS === 'web') {
  WebVideoComponent = require('expo-av').Video;
} else {
  VLCPlayerComponent = require('react-native-vlc-media-player').VLCPlayer;
  NativeVideoComponent = require('react-native-video').default;
}

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
  onProgress?: (data: { currentTime: number, duration: number }) => void;
  onVideoLoad?: (metadata: VideoMetadata) => void;
}

const VideoPlayer = React.forwardRef(({ paused = false, onSeek, seekPosition, onProgress, onVideoLoad }: VideoPlayerProps, ref) => {
  const { currentStream } = useIPTV();
  const { bufferSize, playerType, vlcHardwareAcceleration } = useSettings();

  const streamUrl = useMemo(() => {
    if (!currentStream?.url) return null;
    if (Platform.OS === 'web') {
      // In web platform, redirect network requests through the proxy
      return `/proxy/${currentStream.url}`;
    }
    return currentStream.url;
  }, [currentStream?.url]);

  // Only pass the ref if we are not on web (where expo-av handles it differently)
  const videoRef = React.useRef<any>(null);

  React.useImperativeHandle(ref, () => ({
    seek: (position: number) => {
      if (videoRef.current && videoRef.current.seek) {
        // react-native-vlc-media-player expects position in float (0.0 to 1.0) for tvOS
        // We handle exact ms on other platforms but stick to what the underlying player allows.
        // Since we don't have total duration here, passing absolute ms directly works on Android,
        // but for iOS it might need proper mapping. For now, try passing ms directly.
        videoRef.current.seek(position / 1000); // converting ms to seconds as a safer bet or fallback depending on exact fork
      }
    }
  }));

  // Handle seeking if passed as prop (for declarative seeking)
  React.useEffect(() => {
    if (seekPosition !== undefined && videoRef.current && videoRef.current.seek) {
       // Assuming it takes normalized or direct seconds since behavior varies wildly across vlc wrapper forks
       if (Platform.OS !== 'web' && playerType === 'native') {
          // react-native-video usually expects seconds
          videoRef.current.seek(seekPosition / 1000.0);
       } else {
          videoRef.current.seek(seekPosition / 1000.0);
       }
    }
  }, [seekPosition, playerType]);

  const renderPlayer = () => {
    if (Platform.OS === 'web') {
      return (
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
    }

    if (playerType === 'native') {
      // Extract type for react-native-video if stream is specific format
      // .ts requires explicit type on iOS/tvOS often
      let sourceType = undefined;
      const lowerUrl = streamUrl?.toLowerCase() || '';
      if (lowerUrl.includes('.m3u8')) sourceType = 'm3u8';
      else if (lowerUrl.includes('.ts')) sourceType = 'ts';
      else if (lowerUrl.includes('.mp4')) sourceType = 'mp4';

      return (
        <NativeVideoComponent
          ref={videoRef}
          key={currentStream?.id}
          source={{
            uri: streamUrl!,
            type: sourceType
          }}
          paused={paused}
          style={styles.video}
          resizeMode="contain"
          onProgress={onProgress}
          onError={(error: any) => {
            console.warn('[NativeVideoComponent] Playback error:', error);
          }}
          onLoad={(payload: any) => {
            if (onVideoLoad && payload && payload.naturalSize) {
              onVideoLoad({
                width: payload.naturalSize.width,
                height: payload.naturalSize.height,
                fps: payload.videoTrack ? payload.videoTrack.frameRate : undefined,
                bitrate: payload.videoTrack ? payload.videoTrack.bitrate : undefined
              });
            }
          }}
          bufferConfig={{
            minBufferMs: bufferSize * 1000,
            maxBufferMs: bufferSize * 2000,
            bufferForPlaybackMs: 2500,
            bufferForPlaybackAfterRebufferMs: 5000
          }}
        />
      );
    }

    // VLC Player
    // The context gives us bufferSize. 32 milliseconds is too low for live streams on 4K.
    // Ensure we send a meaningful value in milliseconds. If it's single digits or low, it might be meant as Seconds or Megabytes from an older config.
    // Let's assume minimum 1000ms for safety. We map the MB value (e.g., 32) to roughly 100x ms so it's around 3200ms instead of 32 seconds (32000ms) which breaks sync.
    const safeVlcBufferSizeMs = Math.max(bufferSize > 100 ? bufferSize : bufferSize * 100, 1500);
    const vlcInitOptions = [
      `--network-caching=${safeVlcBufferSizeMs}`,
      `--live-caching=${safeVlcBufferSizeMs}`,
      `--file-caching=${safeVlcBufferSizeMs}`,
      vlcHardwareAcceleration ? '--avcodec-hw=any' : '--avcodec-hw=none'
    ];

    return (
      <VLCPlayerComponent
        ref={videoRef}
        key={currentStream?.id}
        onProgress={onProgress}
        source={{
          uri: streamUrl!,
          initOptions: vlcInitOptions
        }}
        paused={paused}
        autoplay={!paused}
        style={styles.video}
        resizeMode="contain"
        onPlaying={(event: any) => {
          // VLC might send some metadata here, though often limited
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

  return (
    <View style={styles.container}>
      {streamUrl ? renderPlayer() : (
        <View style={styles.placeholder}>
          {/* <Text style={styles.placeholderText}>No channel selected</Text> */}
        </View>
      )}
    </View>
  );
});

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
