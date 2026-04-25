import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ImageBackground, ActivityIndicator, ScrollView, Platform, BackHandler, TVEventControl } from 'react-native';
import { RouteProp, useRoute, useNavigation, useIsFocused } from '@react-navigation/native';
import { RootStackParamList } from '../App';
import { useIPTVCollections, useIPTVMetadata, useIPTVPlayback } from '../context/IPTVContext';
import { useSettings } from '../context/SettingsContext';
import { useTheme } from '../context/ThemeContext';
import { TMDBService } from '../services/tmdb';
import { isMobile } from '../utils/platform';
import { ChannelLogo } from '../components/ChannelLogo';
import { Play, Star, Calendar, ArrowLeft, Heart, Clapperboard } from 'lucide-react-native';
import { FocusableButton, FocusableCard } from '../components/Focusable';
import { colors, radii, shadows, spacing, typography } from '../theme/tokens';

type MediaInfoRouteProp = RouteProp<RootStackParamList, 'MediaInfo'>;

const firstNonEmptyString = (...values: unknown[]): string | null => {
  for (const value of values) {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.length > 0) return trimmed;
    }
  }
  return null;
};

const parseGenres = (rawGenre: unknown): string[] => {
  if (typeof rawGenre !== 'string') return [];
  return rawGenre
    .split(',')
    .map(g => g.trim())
    .filter(Boolean);
};

const formatRating = (rawRating: string | null, tmdbRating?: number): string | null => {
  if (rawRating) {
    return rawRating.includes('/') ? rawRating : `${rawRating}/10`;
  }
  if (typeof tmdbRating === 'number' && Number.isFinite(tmdbRating)) {
    return `${tmdbRating.toFixed(1)}/10`;
  }
  return null;
};

const MediaInfoScreen = () => {
  const route = useRoute<MediaInfoRouteProp>();
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const { id, type, title, cover, streamUrl, returnGroupId, returnTab } = route.params;
  const { getVodInfo, getSeriesInfo, series } = useIPTVMetadata();
  const { favorites, addFavorite, removeFavorite } = useIPTVCollections();
  const { playStream } = useIPTVPlayback();
  const { tmdbApiKey } = useSettings();
  const { accent } = useTheme();

  const [info, setInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tmdbData, setTmdbData] = useState<any>(null);

  const isFavorite = favorites.some(f => f.id === id && f.type === type);

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
    navigation.setOptions({ headerShown: false });

    let isCancelled = false;

    const fetchInfo = async () => {
      setLoading(true);
      let data = null;
      try {
        if (type === 'vod') data = await getVodInfo(id as string);
        else data = await getSeriesInfo(id as string);
      } catch { /* ignore */ }

      if (isCancelled) return;
      setInfo(data);

      const providerInfo = data?.info || {};
      const hasProviderMetadata = Boolean(
        firstNonEmptyString(
          providerInfo.plot,
          providerInfo.description,
          providerInfo.cover_big,
          providerInfo.movie_image,
          providerInfo.cover,
          providerInfo.backdrop_path,
          providerInfo.genre
        ) || providerInfo.rating || providerInfo.year || providerInfo.releasedate
      );

      const tmdb = new TMDBService({ apiKey: tmdbApiKey });
      if (tmdb.isAvailable() && !hasProviderMetadata) {
        const enhanced = await tmdb.enrichTitle(title, type === 'series' ? 'tv' : 'movie');
        if (isCancelled) return;
        if (enhanced) setTmdbData(enhanced);
      }
      if (isCancelled) return;
      setLoading(false);
    };

    fetchInfo();
    return () => {
      isCancelled = true;
    };
  }, [id, type, title, navigation, getVodInfo, getSeriesInfo, tmdbApiKey]);

  const toggleFavorite = () => {
    if (isFavorite) {
      removeFavorite(id as string);
    } else {
      addFavorite({ id: id as string, type, name: title, icon: cover, addedAt: Date.now() });
    }
  };

  const handlePlay = () => {
    if (type === 'vod') {
      playStream({
        id,
        url: streamUrl,
        name: title,
        type: 'vod',
        extension: info?.info?.container_extension,
        direct_source: streamUrl,
      } as any);
      navigation.navigate('Player', {
        returnGroupId,
        returnTab: returnTab || 'movies',
        returnScreen: 'Home',
      });
    } else if (type === 'series') {
      const seriesObj = series.find(s => s.id?.toString() === id?.toString()) || { id, name: title, cover, seasons: [], group: '' };
      navigation.navigate('Season', { series: seriesObj, returnGroupId, returnTab: returnTab || 'series' });
    }
  };

  const providerInfo = info?.info || {};
  const providerBackdrop = firstNonEmptyString(
    providerInfo.backdrop_path,
    ...(Array.isArray(providerInfo.backdrop_paths) ? providerInfo.backdrop_paths : []),
  );
  const providerPoster = firstNonEmptyString(
    providerInfo.cover_big,
    providerInfo.movie_image,
    providerInfo.cover,
  );
  const providerDescription = firstNonEmptyString(providerInfo.plot, providerInfo.description);
  const providerRating = firstNonEmptyString(providerInfo.rating, providerInfo.vote_average);
  const providerYear = firstNonEmptyString(
    providerInfo.year,
    typeof providerInfo.releasedate === 'string' ? providerInfo.releasedate.split('-')[0] : null,
    typeof providerInfo.release_date === 'string' ? providerInfo.release_date.split('-')[0] : null,
  );
  const providerGenres = parseGenres(providerInfo.genre);

  const backdrop = providerBackdrop || tmdbData?.backdropUrl || cover;
  const poster = providerPoster || tmdbData?.posterUrl || cover;
  const desc = providerDescription || tmdbData?.overview || 'No description available.';
  const rating = formatRating(providerRating, tmdbData?.rating);
  const year = providerYear || tmdbData?.releaseDate?.split('-')[0] || null;

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.huge }} bounces={false}>
        <ImageBackground source={{ uri: backdrop }} style={styles.heroBackdrop}>
          <View style={styles.scrim} />
          <View style={styles.heroOverlay}>
            <FocusableCard
              style={styles.backBtn}
              onSelect={() => { if (navigation.canGoBack()) navigation.goBack(); else navigation.navigate('Home'); }}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              accessibilityHint="Returns to the previous screen"
            >
              <ArrowLeft color={colors.text} size={20} />
            </FocusableCard>

            <View style={[styles.heroContentRow, isMobile && styles.heroContentRowMobile]}>
              <View style={[styles.posterWrap, isMobile && styles.posterWrapMobile, shadows.modal]}>
                <ChannelLogo url={poster} name={title} size={isMobile ? 180 : 220} borderRadius={radii.lg} />
              </View>

              <View style={styles.heroTextContent}>
                <View style={styles.eyebrowRow}>
                  <Clapperboard size={14} color={accent} />
                  <Text style={[styles.eyebrow, { color: accent }]}>
                    {type === 'vod' ? 'MOVIE' : 'SERIES'}
                  </Text>
                </View>

                <Text style={styles.title} numberOfLines={2}>{title}</Text>

                <View style={styles.metaRow}>
                  {rating && rating !== '0/10' && (
                    <View style={styles.metaItem}>
                      <Star color={colors.warning} size={14} fill={colors.warning} />
                      <Text style={styles.metaText}>{rating}</Text>
                    </View>
                  )}
                  {year && (
                    <View style={styles.metaItem}>
                      <Calendar color={colors.textDim} size={14} />
                      <Text style={styles.metaText}>{year}</Text>
                    </View>
                  )}
                </View>

                {(providerGenres.length > 0 || tmdbData?.genres?.length) && (
                  <View style={styles.genresRow}>
                    {(providerGenres.length > 0 ? providerGenres : tmdbData.genres).map((g: string, i: number) => (
                      <View key={`${g}-${i}`} style={styles.genrePill}>
                        <Text style={styles.genreText}>{g}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <Text style={[styles.desc, isMobile && styles.descMobile]} numberOfLines={isMobile ? 4 : 6}>{desc}</Text>

                <View style={[styles.actionRow, isMobile && styles.actionRowMobile]}>
                  <FocusableButton
                    variant="primary"
                    label={type === 'series' ? 'Episodes' : 'Play'}
                    leading={<Play color="#FFF" size={16} fill="#FFF" />}
                    onPress={handlePlay}
                    hasTVPreferredFocus
                    accessibilityLabel={type === 'series' ? 'Episodes' : 'Play'}
                    accessibilityHint={type === 'series' ? 'Shows episodes for this series' : 'Plays this media'}
                  />

                  <FocusableCard
                    style={styles.favBtn}
                    onSelect={toggleFavorite}
                    accessibilityRole="button"
                    accessibilityLabel={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                    accessibilityHint={isFavorite ? 'Removes this media from your favorites list' : 'Adds this media to your favorites list'}
                  >
                    {isFavorite
                      ? <Heart color={colors.danger} size={22} fill={colors.danger} />
                      : <Heart color={colors.text} size={22} />}
                  </FocusableCard>
                </View>

                {info?.info?.cast && (
                  <View style={styles.metaBlock}>
                    <Text style={styles.metaLabel}>Cast</Text>
                    <Text style={styles.metaValue} numberOfLines={2}>{info.info.cast}</Text>
                  </View>
                )}

                {info?.info?.director && (
                  <View style={styles.metaBlock}>
                    <Text style={styles.metaLabel}>Director</Text>
                    <Text style={styles.metaValue}>{info.info.director}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </ImageBackground>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroBackdrop: {
    width: '100%',
    minHeight: 520,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(7,7,10,0.78)',
  },
  heroOverlay: {
    flex: 1,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxxl + spacing.lg,
    paddingBottom: spacing.xxxl + spacing.lg,
  },
  backBtn: {
    position: 'absolute',
    top: spacing.xxxl,
    left: spacing.xxl,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: 'rgba(7,7,10,0.6)',
    borderWidth: 1,
    borderColor: colors.borderSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroContentRow: {
    flexDirection: 'row',
    marginTop: spacing.xxxl + spacing.xl,
    gap: spacing.xxl + 4,
    alignItems: 'flex-end',
  },
  heroContentRowMobile: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingTop: spacing.xxxl,
    gap: spacing.lg,
  },
  posterWrap: {
    borderRadius: radii.lg,
  },
  posterWrapMobile: {
    marginBottom: spacing.lg,
  },
  heroTextContent: {
    flex: 1,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm - 2,
    marginBottom: spacing.sm,
  },
  eyebrow: {
    ...typography.eyebrow,
  },
  title: {
    ...typography.display,
    color: colors.text,
    fontSize: 36,
    lineHeight: 40,
    marginBottom: spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm - 2,
  },
  metaText: {
    ...typography.caption,
    color: colors.textDim,
    fontWeight: '600',
  },
  genresRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  genrePill: {
    borderWidth: 1,
    borderColor: colors.borderSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
  },
  genreText: {
    ...typography.caption,
    color: colors.textDim,
    fontSize: 12,
  },
  desc: {
    ...typography.body,
    color: colors.text,
    marginBottom: spacing.xl,
    opacity: 0.85,
  },
  descMobile: {
    textAlign: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  actionRowMobile: {
    justifyContent: 'center',
  },
  favBtn: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaBlock: {
    marginTop: spacing.sm + 2,
  },
  metaLabel: {
    ...typography.eyebrow,
    color: colors.textDim,
    marginBottom: spacing.xs,
  },
  metaValue: {
    ...typography.body,
    color: colors.text,
    opacity: 0.9,
  },
});

export default MediaInfoScreen;
