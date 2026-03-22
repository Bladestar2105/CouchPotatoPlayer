import React, { useMemo } from 'react';
import { View, StyleSheet, Text, Platform } from 'react-native';
import { useIPTV } from '../context/IPTVContext';
import { useSettings } from '../context/SettingsContext';

let VideoComponent: any;
if (Platform.OS === 'web') {
  VideoComponent = require('expo-av').Video;
} else {
  VideoComponent = require('react-native-vlc-media-player').VLCPlayer;
}

const VideoPlayer = () => {
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

  return (
    <View style={styles.container}>
      {streamUrl ? (
        <VideoComponent
          key={currentStream?.id}
          source={{
            uri: streamUrl,
            initOptions: [
              `--network-caching=${bufferSize * 1000}`,
              `--live-caching=${bufferSize * 1000}`,
              `--file-caching=${bufferSize * 1000}`,
              '--clock-jitter=0',
              '--clock-synchro=0'
            ]
          }}
          autoplay={true}
          shouldPlay={true}
          style={styles.video}
          resizeMode="contain"
          useNativeControls={Platform.OS === 'web'}
        />
      ) : (
        <View style={styles.placeholder}>
          {/* <Text style={styles.placeholderText}>No channel selected</Text> */}
        </View>
      )}
    </View>
  );
};

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
