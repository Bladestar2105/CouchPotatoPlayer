import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { useIPTV } from '../context/IPTVContext';

const VideoPlayer = () => {

  // On lit 'currentStream' au lieu de 'currentChannel'
  const { currentStream } = useIPTV();

  const videoRef = React.useRef(null);

  return (
    <View style={styles.container}>
      {/* On vérifie 'currentStream' */}
      {currentStream ? (
        <Video
          // On utilise la 'key' de 'currentStream'
          key={currentStream.id}
          ref={videoRef}
          style={styles.video}
          // On utilise l'URL de 'currentStream'
          source={{ uri: currentStream.url }}

          useNativeControls

          resizeMode={ResizeMode.CONTAIN}
          shouldPlay // Démarre la lecture automatiquement
          isMuted={false}
          volume={1.0}
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