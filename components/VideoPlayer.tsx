import React, { useMemo } from 'react';
import { View, StyleSheet, Text, Platform } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { useIPTV } from '../context/IPTVContext';

const VideoPlayer = () => {
  const { currentStream } = useIPTV();

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
        <Video
          key={currentStream?.id}
          source={{ uri: streamUrl }}
          style={styles.video}
          // useNativeControls // Removed to allow custom UI overlay
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay
          isLooping={false}
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
