import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App';
import { Asset } from 'expo-asset';

type SplashScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Splash'>;

const SplashScreen = () => {
  const navigation = useNavigation<SplashScreenNavigationProp>();
  const videoRef = useRef<Video>(null);

  // On va stocker l'URI (le chemin) de la vidéo ici
  const [videoUri, setVideoUri] = useState<string | null>(null);

  // Ce useEffect se lance au démarrage
  useEffect(() => {
    const loadVideo = async () => {
      try {
        // On utilise Asset pour charger la vidéo
        const asset = Asset.fromModule(require('../assets/splash-video.mp4'));
        await asset.downloadAsync(); // On s'assure qu'elle est téléchargée

        setVideoUri(asset.uri); // On sauvegarde son chemin

        // On lance la lecture manuellement
        videoRef.current?.loadAsync({ uri: asset.uri }, { shouldPlay: true });

      } catch (e) {
        console.error("Error loading video asset, navigating...", e);

        navigation.replace('Home');
      }
    };
    loadVideo();
  }, []);

  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded && status.didJustFinish) {
      navigation.replace('Home');
    }
  };

  if (!videoUri) {
    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      <Video
        ref={videoRef}
        style={StyleSheet.absoluteFill}
        // On utilise l'URI de l'asset
        source={{ uri: videoUri }}
        resizeMode={ResizeMode.COVER}
        isLooping={false}
        onPlaybackStatusUpdate={onPlaybackStatusUpdate}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
});

export default SplashScreen;