import React, { useMemo } from 'react';
import { View, StyleSheet, Text, Platform } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useIPTV } from '../context/IPTVContext';

const VideoPlayer = () => {
  const { currentStream } = useIPTV();

  const streamUrl = useMemo(() => {
    if (!currentStream?.url) return null;
    if (Platform.OS === 'web') {
      return `${window.location.origin}/proxy/${currentStream.url}`;
    }
    return currentStream.url;
  }, [currentStream?.url]);

  const player = useVideoPlayer(streamUrl, player => {
    player.loop = false;
    player.play();
  });

  return (
    <View style={styles.container}>
      {currentStream ? (
        <VideoView
          key={currentStream.id}
          style={styles.video}
          player={player}
          allowsFullscreen
          allowsPictureInPicture
          nativeControls
        />
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>Aucune chaîne sélectionnée</Text>
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
  },
  placeholderText: {
    color: '#FFF',
  },
});

export default VideoPlayer;