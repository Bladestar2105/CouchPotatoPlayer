import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Platform, BackHandler, TVEventControl } from 'react-native';
import TVFocusGuideView from '../components/TVFocusGuideView';
import { RouteProp, useRoute, useNavigation, useIsFocused } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App';
import { Episode } from '../types';
import { useIPTVPlayback } from '../context/IPTVContext';
import Logger from '../utils/logger';
import { useSettings } from '../context/SettingsContext';
import { useTranslation } from 'react-i18next';
import { spacing, typography } from '../theme/tokens';

type EpisodeScreenRouteProp = RouteProp<RootStackParamList, 'Episode'>;
type EpisodeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Episode'>;

const EpisodeScreen = () => {
  const route = useRoute<EpisodeScreenRouteProp>();
  const navigation = useNavigation<EpisodeScreenNavigationProp>();
  const isFocused = useIsFocused();
  const { playStream } = useIPTVPlayback();
  const { colors } = useSettings();
  const { t } = useTranslation();

  const { season, series, returnGroupId, returnTab } = route.params;
  const [focusedEpisodeId, setFocusedEpisodeId] = useState<string | null>(null);

  // Handle back button / Apple TV menu button to navigate properly instead of closing app
  useEffect(() => {
    if (!isFocused) return;

    if (Platform.isTV && TVEventControl?.enableTVMenuKey) {
      TVEventControl.enableTVMenuKey();
    }

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (Platform.isTV && TVEventControl?.disableTVMenuKey) {
        TVEventControl.disableTVMenuKey();
      }
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

  const handleEpisodePress = useCallback((episode: Episode) => {
    Logger.log('[EpisodeScreen] Play episode:', episode.name);
    playStream({
      url: episode.streamUrl,
      id: episode.id,
      name: episode.name,
      type: 'series',
      icon: series?.cover,
      isAdult: series?.isAdult,
      seriesId: series?.id,
      episodeId: episode.id,
      episodeName: episode.name,
      episodeNumber: episode.episodeNumber,
      seasonNumber: season.seasonNumber,
    });
    navigation.navigate('Player', {
      returnGroupId,
      returnTab: returnTab || 'series',
      returnScreen: 'Home',
      title: episode.name,
    });
  }, [navigation, playStream, returnGroupId, returnTab, season.seasonNumber, series]);

  const renderItem = useCallback(({ item, index }: { item: Episode; index: number }) => {
    const isFocusedEpisode = focusedEpisodeId === item.id;
    return (
      <TouchableOpacity
        style={[
          styles.item,
          {
            borderColor: isFocusedEpisode ? colors.primary : colors.divider,
            backgroundColor: isFocusedEpisode ? colors.primaryLight : colors.card,
          },
        ]}
        onPress={() => handleEpisodePress(item)}
        onFocus={() => setFocusedEpisodeId(item.id)}
        onBlur={() => setFocusedEpisodeId((prev) => (prev === item.id ? null : prev))}
        activeOpacity={0.9}
        accessible={true}
        isTVSelectable={true}
        hasTVPreferredFocus={index === 0}
        tvParallaxProperties={{ enabled: false }}
        accessibilityRole="button"
        accessibilityLabel={`${t('episode')}: ${item.name}`}
        accessibilityHint={t('playEpisodeHint', { name: item.name })}
      >
        <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
      </TouchableOpacity>
    );
  }, [colors.card, colors.divider, colors.primary, colors.primaryLight, colors.text, focusedEpisodeId, handleEpisodePress, t]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TVFocusGuideView autoFocus style={styles.container}>
        <View style={styles.listShell}>
          <FlatList
            data={season.episodes}
            renderItem={renderItem}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={[styles.listContent, season.episodes.length === 0 && styles.listContentEmpty]}
            ListHeaderComponent={(
              <View style={styles.headerContainer}>
                <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
                  {season.name}
                </Text>
              </View>
            )}
            ListEmptyComponent={(
              <View style={styles.emptyState}>
                <Text style={[styles.emptyStateTitle, { color: colors.text }]}>
                  {t('noResults')}
                </Text>
                <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                  {t('focusPreviewNoEpg')}
                </Text>
              </View>
            )}
          />
        </View>
      </TVFocusGuideView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  listShell: {
    flex: 1,
    width: '100%',
    maxWidth: Platform.isTV ? 1280 : undefined,
    alignSelf: 'center',
    paddingHorizontal: Platform.isTV ? spacing.xxl : 0,
    paddingTop: Platform.isTV ? spacing.md : 0,
  },
  listContent: {
    paddingBottom: spacing.xxxl,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  headerContainer: {
    paddingVertical: spacing.lg,
  },
  headerTitle: {
    ...typography.title,
    fontSize: Platform.isTV ? 28 : typography.title.fontSize,
  },
  item: {
    paddingVertical: Platform.isTV ? spacing.xl : spacing.lg - 1,
    paddingHorizontal: Platform.isTV ? spacing.xl : spacing.lg - 1,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: spacing.sm,
  },
  name: { ...typography.body, fontSize: Platform.isTV ? 20 : 16 },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  emptyStateTitle: {
    ...typography.title,
    marginBottom: spacing.sm,
  },
  emptyStateText: {
    ...typography.body,
    textAlign: 'center',
  },
});

export default EpisodeScreen;
