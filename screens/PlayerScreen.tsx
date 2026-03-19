import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import VideoPlayer from '../components/VideoPlayer';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useIsFocused } from '@react-navigation/native';
import { useIPTV } from '../context/IPTVContext';

const PlayerScreen = () => {
  const isFocused = useIsFocused();
  const { currentStream, addRecentlyWatched } = useIPTV();

  useEffect(() => {
    if (isFocused && currentStream && currentStream.id) {
       addRecentlyWatched(currentStream.id);
    }
  }, [isFocused, currentStream]);

  useEffect(() => {
    const setOrientation = async () => {
      if (isFocused) {
        await ScreenOrientation.unlockAsync();
      } else {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      }
    };

    setOrientation();

    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };
  }, [isFocused]);

  return (
    <View style={styles.container}>
      <VideoPlayer />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});

export default PlayerScreen;