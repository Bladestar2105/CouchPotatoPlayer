import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App';
import { Asset } from 'expo-asset';

type SplashScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

const SplashScreen = () => {
  const navigation = useNavigation<SplashScreenNavigationProp>();
  const [videoUri, setVideoUri] = useState<string | null>(null);

  useEffect(() => {
    const loadVideo = async () => {
      try {
        const asset = Asset.fromModule(require('../assets/splash-video.mp4'));
        await asset.downloadAsync();
        setVideoUri(asset.uri);
      } catch (e) {
        console.error("Error loading video asset, navigating...", e);
        navigation.replace('Home');
      }
    };
    loadVideo();
  }, [navigation]);

  const player = useVideoPlayer(videoUri, (player) => {
    if (videoUri) {
      player.loop = false;
      player.play();
    }
  });

  useEffect(() => {
    if (player) {
      const subscription = player.addListener('statusChange', (status) => {
        if (status.status === 'readyToPlay') {
          player.play();
        }
      });

      const finishedSub = player.addListener('playingChange', (event) => {
        if (!event.isPlaying && player.currentTime >= player.duration) {
            navigation.replace('Home');
        }
      });

      return () => {
        subscription.remove();
        finishedSub.remove();
      };
    }
  }, [player, navigation]);

  if (!videoUri) {
    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      <VideoView
        style={StyleSheet.absoluteFill}
        player={player}
        nativeControls={false}
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