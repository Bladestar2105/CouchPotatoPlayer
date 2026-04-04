import React, { useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Platform, BackHandler } from 'react-native';
import { RouteProp, useRoute, useNavigation, useIsFocused } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App';
import { Episode } from '../types';
import { useIPTV } from '../context/IPTVContext';
import Logger from '../utils/logger';
import { useSettings } from '../context/SettingsContext';

type EpisodeScreenRouteProp = RouteProp<RootStackParamList, 'Episode'>;
type EpisodeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Episode'>;

const EpisodeScreen = () => {
  const route = useRoute<EpisodeScreenRouteProp>();
  const navigation = useNavigation<EpisodeScreenNavigationProp>();
  const isFocused = useIsFocused();
  const { playStream, stopStream } = useIPTV();
  const { colors } = useSettings();

  const { season, returnGroupId, returnTab } = route.params as any;

  // Handle back button to navigate properly instead of closing app
  useEffect(() => {
    if (!isFocused) return;
    
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (navigation.canGoBack()) {
        navigation.goBack();
        return true;
      }
      navigation.navigate('Home');
      return true;
    });

    return () => backHandler.remove();
  }, [isFocused, navigation]);

  const handleEpisodePress = (episode: Episode) => {
    Logger.log('CLIC SUR ÉPISODE:', episode.name);
    playStream({ url: episode.streamUrl, id: episode.id });
    navigation.navigate('Player', {
      returnGroupId,
      returnTab: returnTab || 'series',
      returnScreen: 'Home',
    });
  };

  const renderItem = ({ item }: { item: Episode }) => (
    <TouchableOpacity
      style={[styles.item, { borderBottomColor: colors.divider }]}
      onPress={() => handleEpisodePress(item)}
      accessibilityRole="button"
      accessibilityLabel={`Episode: ${item.name}`}
      accessibilityHint={`Plays episode ${item.name}`}
    >
      <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={season.episodes}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  item: { padding: 15, borderBottomWidth: 1 },
  name: { fontSize: 16 },
});

export default EpisodeScreen;