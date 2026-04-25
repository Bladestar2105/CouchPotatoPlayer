import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Platform, BackHandler, TVEventControl } from 'react-native';
import TVFocusGuideView from '../components/TVFocusGuideView';
import { RouteProp, useRoute, useNavigation, useIsFocused } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App';
import { Season, Episode } from '../types';
import { useIPTVMetadata, useIPTVProfiles } from '../context/IPTVContext';
import { useTheme } from '../context/ThemeContext';
import { FocusableCard } from '../components/Focusable';
import { colors, radii, spacing, typography } from '../theme/tokens';
import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react-native';

type SeasonScreenRouteProp = RouteProp<RootStackParamList, 'Season'>;
type SeasonScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Season'>;

const SeasonScreen = () => {
  const route = useRoute<SeasonScreenRouteProp>();
  const navigation = useNavigation<SeasonScreenNavigationProp>();
  const isFocused = useIsFocused();
  const { getSeriesInfo } = useIPTVMetadata();
  const { currentProfile } = useIPTVProfiles();
  const { accent } = useTheme();
  const { t } = useTranslation();

  const { series, returnGroupId, returnTab } = route.params;
  const [seasons, setSeasons] = useState<Season[]>(series.seasons || []);
  const [loading, setLoading] = useState<boolean>(false);

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

  useEffect(() => {
    let isCancelled = false;

    const fetchSeriesData = async () => {
      if (!currentProfile || currentProfile.type !== 'xtream') return;
      if (seasons.length > 0) return;

      setLoading(true);
      try {
        const data = await getSeriesInfo(series.id);
        if (isCancelled || !data || !data.episodes) return;

        const loadedSeasons: Record<string, Season> = {};

        Object.keys(data.episodes).forEach((seasonNum) => {
          const episodesArr = data.episodes[seasonNum];
          const parsedEpisodes: Episode[] = episodesArr.map((ep: any) => ({
            id: ep.id,
            name: ep.title || `Episode ${ep.episode_num}`,
            streamUrl: `${currentProfile.url.trim().replace(/\/+$/, '')}/series/${encodeURIComponent(currentProfile.username || '')}/${encodeURIComponent(currentProfile.password || '')}/${encodeURIComponent(ep.id)}.${encodeURIComponent(ep.container_extension || 'mp4')}`,
            episodeNumber: ep.episode_num,
          }));

          loadedSeasons[seasonNum] = {
            id: `${series.id}_s${seasonNum}`,
            name: `Season ${seasonNum}`,
            seasonNumber: parseInt(seasonNum, 10),
            episodes: parsedEpisodes,
          };
        });

        const sortedSeasons = Object.values(loadedSeasons).sort((a, b) => a.seasonNumber - b.seasonNumber);
        setSeasons(sortedSeasons);
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    fetchSeriesData();
    return () => {
      isCancelled = true;
    };
  }, [currentProfile, getSeriesInfo, seasons.length, series.id]);

  const handleSeasonPress = useCallback((season: Season) => {
    navigation.navigate('Episode', { season, series, returnGroupId, returnTab });
  }, [navigation, returnGroupId, returnTab, series]);

  const renderItem = useCallback(({ item, index }: { item: Season; index: number }) => (
    <FocusableCard
      style={styles.item}
      onSelect={() => handleSeasonPress(item)}
      hasTVPreferredFocus={index === 0}
      accessibilityRole="button"
      accessibilityLabel={`Season: ${item.name}`}
      accessibilityHint={`Shows episodes for ${item.name}`}
    >
      <View style={styles.itemRow}>
        <View style={[styles.ordinal, { backgroundColor: `${accent}1F`, borderColor: accent }]}>
          <Text style={[styles.ordinalText, { color: accent }]}>{item.seasonNumber}</Text>
        </View>
        <View style={styles.itemText}>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.count}>
            {item.episodes.length} {t('episode')}
          </Text>
        </View>
        <ChevronRight size={20} color={colors.textDim} />
      </View>
    </FocusableCard>
  ), [accent, handleSeasonPress, t]);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TVFocusGuideView autoFocus style={styles.container}>
        <View style={styles.listShell}>
          <FlatList
            data={seasons}
            renderItem={renderItem}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={[styles.listContent, seasons.length === 0 && styles.listContentEmpty]}
            ListHeaderComponent={(
              <View style={styles.headerContainer}>
                <Text style={styles.headerTitle} numberOfLines={1}>{series.name}</Text>
                <Text style={styles.headerSubtitle}>
                  {t('tv.seasonsCount', { count: seasons.length })}
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
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
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
    width: 44,
    height: 44,
    borderRadius: radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ordinalText: {
    fontSize: 18,
    fontWeight: '800',
  },
  itemText: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    ...typography.subtitle,
    color: colors.text,
    fontWeight: '700',
  },
  count: {
    ...typography.caption,
    color: colors.textDim,
    marginTop: spacing.xs,
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

export default SeasonScreen;
