import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
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
  const { playStream } = useIPTV();
  const { colors } = useSettings();

  const { season } = route.params;

  const handleEpisodePress = (episode: Episode) => {
    Logger.log('CLIC SUR ÉPISODE:', episode.name);
    playStream({ url: episode.streamUrl, id: episode.id });
    navigation.navigate('Player');
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