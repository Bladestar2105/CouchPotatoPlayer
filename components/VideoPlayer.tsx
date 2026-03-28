import React, { useMemo } from 'react';
import { View, StyleSheet, Text, Platform } from 'react-native';
import { useIPTV } from '../context/IPTVContext';
import { useSettings } from '../context/SettingsContext';

let VideoComponent: any;
if (Platform.OS === 'web') {
  VideoComponent = require('expo-video').VideoView;
} else {
  VideoComponent = require('react-native-vlc-media-player').VLCPlayer;
}

interface VideoPlayerProps {
  paused?: boolean;
  onSeek?: (position: number) => void;
  seekPosition?: number;
  onProgress?: (data: { currentTime: number, duration: number }) => void;
}

// Custom wrapper for expo-video to match the old api temporarily
const WebVideoPlayer = React.forwardRef(({ source, paused, onProgress, style, ...props }: any, ref) => {
  const { useVideoPlayer } = require('expo-video');
  const player = useVideoPlayer(source?.uri || null, (p: any) => {
    p.loop = false;
    if (!paused) {
      p.play();
    }
  });

  React.useEffect(() => {
    if (player) {
      if (paused) {
        player.pause();
      } else {
        player.play();
      }
    }
  }, [paused, player]);

  React.useImperativeHandle(ref, () => ({
    seek: (position: number) => {
      if (player) {
        player.currentTime = position / 1000;
      }
    }
  }));

  // Simple polling for progress
  React.useEffect(() => {
    if (!player || !onProgress) return;
    const interval = setInterval(() => {
      if (player.status === 'readyToPlay' || player.status === 'playing') {
        onProgress({ currentTime: player.currentTime * 1000, duration: player.duration * 1000 });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [player, onProgress]);


  return <VideoComponent player={player} style={style} nativeControls {...props} />;
});

const VideoPlayer = React.forwardRef(({ paused = false, onSeek, seekPosition, onProgress }: VideoPlayerProps, ref) => {
  const { currentStream } = useIPTV();
  const { bufferSize } = useSettings();

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
        videoRef.current.seek(Platform.OS === 'web' ? position : position / 1000); // converting ms to seconds as a safer bet or fallback depending on exact fork
      }
    }
  }));

  // Handle seeking if passed as prop (for declarative seeking)
  React.useEffect(() => {
    if (seekPosition !== undefined && videoRef.current && videoRef.current.seek) {
       // Assuming it takes normalized or direct seconds since behavior varies wildly across vlc wrapper forks
       videoRef.current.seek(Platform.OS === 'web' ? seekPosition : seekPosition / 1000.0);
    }
  }, [seekPosition]);

  return (
    <View style={styles.container}>
      {streamUrl ? (
        Platform.OS === 'web' ? (
          <WebVideoPlayer
             ref={videoRef}
             key={currentStream?.id}
             onProgress={onProgress}
             source={{ uri: streamUrl }}
             paused={paused}
             style={styles.video}
          />
        ) : (
          <VideoComponent
            ref={videoRef}
            key={currentStream?.id}
            onProgress={onProgress}
            source={{
              uri: streamUrl,
              initOptions: [
                `--network-caching=${bufferSize}`,
                `--live-caching=${bufferSize}`,
                `--file-caching=${bufferSize}`
              ]
            }}
            paused={paused}
            autoplay={!paused}
            shouldPlay={!paused}
            style={styles.video}
            resizeMode="contain"
            useNativeControls={false}
          />
        )
      ) : (
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
