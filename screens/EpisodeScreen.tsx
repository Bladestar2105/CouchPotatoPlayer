import React, { useCallback, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, Platform, BackHandler, TVEventControl } from 'react-native';
import TVFocusGuideView from '../components/TVFocusGuideView';
import { RouteProp, useRoute, useNavigation, useIsFocused } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App';
import { Episode } from '../types';
import { useIPTVPlayback } from '../context/IPTVContext';
import Logger from '../utils/logger';
import { useTheme } from '../context/ThemeContext';
import { FocusableCard } from '../components/Focusable';
import { colors, radii, spacing, typography } from '../theme/tokens';
import { useTranslation } from 'react-i18next';
import { Play } from 'lucide-react-native';

type EpisodeScreenRouteProp = RouteProp<RootStackParamList, 'Episode'>;
type EpisodeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Episode'>;

const EpisodeScreen = () => {
  const route = useRoute<EpisodeScreenRouteProp>();
  const navigation = useNavigation<EpisodeScreenNavigationProp>();
  const isFocused = useIsFocused();
  const { playStream } = useIPTVPlayback();
  const { accent } = useTheme();
  const { t } = useTranslation();

  const { season, series, returnGroupId, returnTab } = route.params;

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

  const renderItem = useCallback(({ item, index }: { item: Episode; index: number }) => (
    <FocusableCard
      style={styles.item}
      onSelect={() => handleEpisodePress(item)}
      hasTVPreferredFocus={index === 0}
      accessibilityRole="button"
      accessibilityLabel={`${t('episode')}: ${item.name}`}
      accessibilityHint={t('playEpisodeHint', { name: item.name })}
    >
      <View style={styles.itemRow}>
        <View style={[styles.ordinal, { backgroundColor: `${accent}1F`, borderColor: accent }]}>
          <Text style={[styles.ordinalText, { color: accent }]}>
            {typeof item.episodeNumber === 'number' ? item.episodeNumber : index + 1}
          </Text>
        </View>
        <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
        <Play size={16} color={colors.textDim} fill={colors.textDim} />
      </View>
    </FocusableCard>
  ), [accent, handleEpisodePress, t]);

  return (
    <View style={styles.container}>
      <TVFocusGuideView autoFocus style={styles.container}>
        <View style={styles.listShell}>
          <FlatList
            data={season.episodes}
            renderItem={renderItem}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={[styles.listContent, season.episodes.length === 0 && styles.listContentEmpty]}
            ListHeaderComponent={(
              <View style={styles.headerContainer}>
                <Text style={styles.headerTitle} numberOfLines={1}>{season.name}</Text>
                <Text style={styles.headerSubtitle}>
                  {season.episodes.length} {t('episode')}
                </Text>
              </View>
            )}
            ListEmptyComponent={(
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateTitle}>{t('noResults')}</Text>
                <Text style={styles.emptyStateText}>{t('focusPreviewNoEpg')}</Text>
              </View>
            )}
          />
        </View>
      </TVFocusGuideView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  listShell: {
    flex: 1,
    width: '100%',
    maxWidth: Platform.isTV ? 1280 : undefined,
    alignSelf: 'center',
    paddingHorizontal: Platform.isTV ? spacing.xxl : spacing.lg,
    paddingTop: Platform.isTV ? spacing.md : spacing.sm,
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
    ...typography.headline,
    color: colors.text,
    fontSize: Platform.isTV ? 32 : 24,
  },
  headerSubtitle: {
    ...typography.caption,
    color: colors.textDim,
    marginTop: spacing.xs,
  },
  item: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radii.lg,
    marginBottom: spacing.sm + 2,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Platform.isTV ? spacing.xl : spacing.lg,
    paddingVertical: Platform.isTV ? spacing.lg : spacing.md + 2,
    gap: spacing.md,
  },
  ordinal: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ordinalText: {
    fontSize: 14,
    fontWeight: '800',
  },
  name: {
    ...typography.subtitle,
    color: colors.text,
    flex: 1,
    minWidth: 0,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  emptyStateTitle: {
    ...typography.title,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptyStateText: {
    ...typography.body,
    color: colors.textDim,
    textAlign: 'center',
  },
});

export default EpisodeScreen;
