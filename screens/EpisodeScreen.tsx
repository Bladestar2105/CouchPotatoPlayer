import React, { useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Platform, BackHandler, TVEventControl } from 'react-native';
import { RouteProp, useRoute, useNavigation, useIsFocused } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App';
import { Episode } from '../types';
import { useIPTV } from '../context/IPTVContext';
import Logger from '../utils/logger';
import { useSettings } from '../context/SettingsContext';
import { useTranslation } from 'react-i18next';

type EpisodeScreenRouteProp = RouteProp<RootStackParamList, 'Episode'>;
type EpisodeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Episode'>;

const EpisodeScreen = () => {
  const route = useRoute<EpisodeScreenRouteProp>();
  const navigation = useNavigation<EpisodeScreenNavigationProp>();
  const isFocused = useIsFocused();
  const { playStream } = useIPTV();
  const { colors } = useSettings();
  const { t } = useTranslation();

  const { season, returnGroupId, returnTab } = route.params;

  // Handle back button / Apple TV menu button to navigate properly instead of closing app
  useEffect(() => {
    if (!isFocused) return;

    if (Platform.isTV && TVEventControl?.enableTVMenuKey) {
      TVEventControl.enableTVMenuKey();
    }

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (navigation.canGoBack()) {
        navigation.goBack();
        return true;
      }
      navigation.navigate('Home');
      return true;
    });

    return () => {
      if (Platform.isTV && TVEventControl?.disableTVMenuKey) {
        TVEventControl.disableTVMenuKey();
      }
      backHandler.remove();
    };
  }, [isFocused, navigation]);

  const handleEpisodePress = (episode: Episode) => {
    Logger.log('[EpisodeScreen] Play episode:', episode.name);
    playStream({ url: episode.streamUrl, id: episode.id, name: episode.name, type: 'series' } as any);
    navigation.navigate('Player', {
      returnGroupId,
      returnTab: returnTab || 'series',
      returnScreen: 'Home',
      title: episode.name,
    });
  };

  const renderItem = ({ item, index }: { item: Episode; index: number }) => (
    <TouchableOpacity
      style={[styles.item, { borderBottomColor: colors.divider }]}
      onPress={() => handleEpisodePress(item)}
      accessible={true}
      isTVSelectable={true}
      hasTVPreferredFocus={index === 0}
      accessibilityRole="button"
      accessibilityLabel={`${t('episode')}: ${item.name}`}
      accessibilityHint={t('playEpisodeHint', { name: item.name })}
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
