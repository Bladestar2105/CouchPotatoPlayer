import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Platform, BackHandler, TVEventControl } from 'react-native';
import TVFocusGuideView from '../components/TVFocusGuideView';
import { RouteProp, useRoute, useNavigation, useIsFocused } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App';
import { Season, Episode } from '../types';
import { useIPTVMetadata, useIPTVProfiles } from '../context/IPTVContext';
import { useSettings } from '../context/SettingsContext';
import { spacing, typography } from '../theme/tokens';
import { useTranslation } from 'react-i18next';

type SeasonScreenRouteProp = RouteProp<RootStackParamList, 'Season'>;
type SeasonScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Season'>;

const SeasonScreen = () => {
  const route = useRoute<SeasonScreenRouteProp>();
  const navigation = useNavigation<SeasonScreenNavigationProp>();
  const isFocused = useIsFocused();
  const { getSeriesInfo } = useIPTVMetadata();
  const { currentProfile } = useIPTVProfiles();
  const { colors } = useSettings();
  const { t } = useTranslation();

  const { series, returnGroupId, returnTab } = route.params;
  const [seasons, setSeasons] = useState<Season[]>(series.seasons || []);
  const [loading, setLoading] = useState<boolean>(false);
  const [focusedSeasonId, setFocusedSeasonId] = useState<string | null>(null);

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

  useEffect(() => {
    let isCancelled = false;

    const fetchSeriesData = async () => {
      if (!currentProfile || currentProfile.type !== 'xtream') return;
      if (seasons.length > 0) return; // Already have data

      setLoading(true);
      try {
        const data = await getSeriesInfo(series.id);
        if (isCancelled || !data || !data.episodes) return;

        const loadedSeasons: Record<string, Season> = {};

        // Xtream episodes are grouped by season number: { "1": [...], "2": [...] }
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

  const renderItem = useCallback(({ item, index }: { item: Season; index: number }) => {
    const isFocusedSeason = focusedSeasonId === item.id;
    return (
      <TouchableOpacity
        style={[
          styles.item,
          {
            borderColor: isFocusedSeason ? colors.primary : colors.divider,
            backgroundColor: isFocusedSeason ? colors.primaryLight : colors.card,
          },
        ]}
        onPress={() => handleSeasonPress(item)}
        onFocus={() => setFocusedSeasonId(item.id)}
        onBlur={() => setFocusedSeasonId((prev) => (prev === item.id ? null : prev))}
        activeOpacity={0.9}
        accessible={true}
        isTVSelectable={true}
        hasTVPreferredFocus={index === 0}
        tvParallaxProperties={{ enabled: false }}
        accessibilityRole="button"
        accessibilityLabel={`Season: ${item.name}`}
        accessibilityHint={`Shows episodes for ${item.name}`}
      >
        <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
        <Text style={[styles.count, { color: colors.textSecondary }]}>
          {item.episodes.length} {t('episode')}
        </Text>
      </TouchableOpacity>
    );
  }, [colors.card, colors.divider, colors.primary, colors.primaryLight, colors.text, colors.textSecondary, focusedSeasonId, handleSeasonPress, t]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TVFocusGuideView autoFocus style={styles.container}>
        <View style={styles.listShell}>
          <FlatList
            data={seasons}
            renderItem={renderItem}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={[styles.listContent, seasons.length === 0 && styles.listContentEmpty]}
            ListHeaderComponent={(
              <View style={styles.headerContainer}>
                <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
                  {series.name}
                </Text>
                <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                  {t('tv.seasonsCount', { count: seasons.length })}
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
  headerSubtitle: {
    ...typography.caption,
    marginTop: spacing.xs,
    fontSize: Platform.isTV ? 15 : typography.caption.fontSize,
  },
  item: {
    paddingVertical: Platform.isTV ? spacing.xl : spacing.lg - 1,
    paddingHorizontal: Platform.isTV ? spacing.xl : spacing.lg - 1,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: spacing.sm,
  },
  name: { ...typography.body, fontWeight: '700' },
  count: { ...typography.caption, fontSize: Platform.isTV ? 15 : 12, marginTop: spacing.xs },
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

export default SeasonScreen;
