import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ImageBackground, ActivityIndicator, ScrollView, TouchableOpacity, Platform, BackHandler, TVEventControl } from 'react-native';
import { RouteProp, useRoute, useNavigation, useIsFocused } from '@react-navigation/native';
import { RootStackParamList } from '../App';
import { useIPTVCollections, useIPTVMetadata, useIPTVPlayback } from '../context/IPTVContext';
import { useSettings } from '../context/SettingsContext';
import { TMDBService } from '../services/tmdb';
import { isMobile } from '../utils/platform';
import { ChannelLogo } from '../components/ChannelLogo';
import { Play, Star, Calendar, ArrowLeft, Heart } from 'lucide-react-native';
import { radii, spacing } from '../theme/tokens';

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
  const { colors, tmdbApiKey } = useSettings();

  const [info, setInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tmdbData, setTmdbData] = useState<any>(null);

  const isFavorite = favorites.some(f => f.id === id && f.type === type);

  // Handle back button / Apple TV menu button to navigate properly instead of closing app
  useEffect(() => {
    if (!isFocused) return;

    // Enable menu key interception on tvOS so the remote's menu button
    // triggers hardwareBackPress instead of exiting the app
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
    navigation.setOptions({ headerShown: false }); // Hide header for modern look

    // Guard every setState with `isCancelled` so that navigating away (or
    // switching to a different media item while a fetch is in flight) does
    // not overwrite the new screen's state with a stale response and does
    // not produce "setState on unmounted component" warnings. The TMDB
    // enrichment call can outlast the primary lookup by several seconds on
    // slow networks, so it must be guarded independently.
    let isCancelled = false;

    const fetchInfo = async () => {
      setLoading(true);
      let data = null;
      try {
        if (type === 'vod') data = await getVodInfo(id as string);
        else data = await getSeriesInfo(id as string);
      } catch (err) { }

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
        direct_source: streamUrl
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
    ...(Array.isArray(providerInfo.backdrop_paths) ? providerInfo.backdrop_paths : [])
  );
  const providerPoster = firstNonEmptyString(
    providerInfo.cover_big,
    providerInfo.movie_image,
    providerInfo.cover
  );
  const providerDescription = firstNonEmptyString(providerInfo.plot, providerInfo.description);
  const providerRating = firstNonEmptyString(providerInfo.rating, providerInfo.vote_average);
  const providerYear = firstNonEmptyString(
    providerInfo.year,
    typeof providerInfo.releasedate === 'string' ? providerInfo.releasedate.split('-')[0] : null,
    typeof providerInfo.release_date === 'string' ? providerInfo.release_date.split('-')[0] : null
  );
  const providerGenres = parseGenres(providerInfo.genre);

  // Provider data is primary. TMDB only enriches when provider data is missing.
  const backdrop = providerBackdrop || tmdbData?.backdropUrl || cover;
  const poster = providerPoster || tmdbData?.posterUrl || cover;
  const desc = providerDescription || tmdbData?.overview || 'No description available.';
  const rating = formatRating(providerRating, tmdbData?.rating);
  const year = providerYear || tmdbData?.releaseDate?.split('-')[0] || null;

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} bounces={false}>

        {/* Modern Hero Backdrop */}
        <ImageBackground source={{ uri: backdrop }} style={styles.heroBackdrop}>
          <View style={[styles.heroOverlay, { backgroundColor: 'rgba(13,13,15,0.85)' }]}>
<TouchableOpacity style={styles.backBtn} onPress={() => { if (navigation.canGoBack()) navigation.goBack(); else navigation.navigate('Home'); }} accessible={true} isTVSelectable={true} accessibilityRole="button" accessibilityLabel="Go back" accessibilityHint="Returns to the previous screen">
              <ArrowLeft color="#FFF" size={24} />
            </TouchableOpacity>

            <View style={[styles.heroContentRow, isMobile && { flexDirection: 'column', alignItems: 'center', paddingTop: 60 }]}>
              <View style={[styles.posterWrap, isMobile && { marginBottom: 20 }]}>
                <ChannelLogo url={poster} name={title} size={isMobile ? 180 : 220} borderRadius={16} />
              </View>

              <View style={styles.heroTextContent}>
                <Text style={styles.title} numberOfLines={2}>{title}</Text>

                <View style={styles.metaRow}>
                  <View style={styles.badge}><Text style={styles.badgeText}>{type === 'vod' ? 'MOVIE' : 'SERIES'}</Text></View>
                  {rating && rating !== "0/10" && (
                    <View style={styles.metaItem}>
                      <Star color="#FFD700" size={16} fill="#FFD700" />
                      <Text style={styles.metaText}>{rating}</Text>
                    </View>
                  )}
                  {year && (
                    <View style={styles.metaItem}>
                      <Calendar color="#CCC" size={16} />
                      <Text style={styles.metaText}>{year}</Text>
                    </View>
                  )}
                </View>

                {providerGenres.length > 0 ? (
                  <View style={styles.genresRow}>
                    {providerGenres.map((g, i) => (
                      <View key={i} style={styles.genrePill}><Text style={styles.genreText}>{g}</Text></View>
                    ))}
                  </View>
                ) : tmdbData?.genres?.length ? (
                  <View style={styles.genresRow}>
                    {tmdbData.genres.map((g: string, i: number) => (
                      <View key={i} style={styles.genrePill}><Text style={styles.genreText}>{g}</Text></View>
                    ))}
                  </View>
                ) : null}

                <Text style={[styles.desc, isMobile && { textAlign: 'center' }]} numberOfLines={isMobile ? 4 : 6}>{desc}</Text>

                <View style={[styles.actionRow, isMobile && { justifyContent: 'center' }]}>
                  <TouchableOpacity
                    style={[styles.playBtn, { backgroundColor: colors.primary }]}
                    onPress={handlePlay}
                    accessible={true}
                    isTVSelectable={true}
                    hasTVPreferredFocus={true}
                    accessibilityRole="button"
                    accessibilityLabel={type === 'series' ? 'Episodes' : 'Play'}
                    accessibilityHint={type === 'series' ? 'Shows episodes for this series' : 'Plays this media'}
                  >
                    <Play color="#FFF" size={20} fill="#FFF" />
                    <Text style={styles.playText}>{type === 'series' ? 'Episodes' : 'Play'}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.favBtn} onPress={toggleFavorite} accessible={true} isTVSelectable={true} accessibilityRole="button" accessibilityLabel={isFavorite ? 'Remove from favorites' : 'Add to favorites'} accessibilityHint={isFavorite ? 'Removes this media from your favorites list' : 'Adds this media to your favorites list'}>
                    {isFavorite ? <Heart color="#EF4444" size={24} fill="#EF4444" /> : <Heart color="#FAFAFA" size={24} />}
                  </TouchableOpacity>
                </View>

                {info?.info?.cast && (
                  <View style={styles.infoRow}>
                    <Text style={[styles.label, { color: colors.text }]}>Cast: </Text>
                    <Text style={[styles.value, { color: colors.textSecondary }]} numberOfLines={2}>{info.info.cast}</Text>
                  </View>
                )}

                {info?.info?.director && (
                  <View style={styles.infoRow}>
                    <Text style={[styles.label, { color: colors.text }]}>Director: </Text>
                    <Text style={[styles.value, { color: colors.textSecondary }]}>{info.info.director}</Text>
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
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1 },
  heroBackdrop: { width: '100%', minHeight: 480 },
  heroOverlay: { flex: 1, paddingHorizontal: spacing.xxl, paddingBottom: spacing.xxxl + 16 },
  backBtn: { 
    position: 'absolute', 
    top: spacing.xxxl + 16, 
    left: spacing.xxl, 
    zIndex: 10, 
    padding: spacing.sm + 2, 
    backgroundColor: 'rgba(24,24,27,0.8)', 
    borderRadius: radii.lg - 2,
    // Shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  heroContentRow: { flexDirection: 'row', marginTop: 110, gap: spacing.xxl + 4, alignItems: 'flex-end' },
  posterWrap: { 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 12 }, 
    shadowOpacity: 0.5, 
    shadowRadius: 20,
    borderRadius: radii.lg,
  },
  heroTextContent: { flex: 1 },
  title: { color: '#FAFAFA', fontSize: 34, fontWeight: '800', marginBottom: 14, letterSpacing: -0.5 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg + 2, marginBottom: spacing.lg + 2 },
  badge: { backgroundColor: 'rgba(233,105,42,0.3)', paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.xs + 1, borderRadius: radii.sm },
  badgeText: { color: '#E9692A', fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm - 2 },
  metaText: { color: '#A1A1AA', fontSize: 14, fontWeight: '600' },
  genresRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm + 2, marginBottom: spacing.lg + 2 },
  genrePill: { 
    borderWidth: 1.5, 
    borderColor: 'rgba(255,255,255,0.15)', 
    paddingHorizontal: spacing.md, 
    paddingVertical: spacing.sm - 2, 
    borderRadius: spacing.xl,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  genreText: { color: '#A1A1AA', fontSize: 12, fontWeight: '500' },
  desc: { color: '#D4D4D8', fontSize: 15, lineHeight: 24, marginBottom: spacing.xxl + 4 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginBottom: spacing.xxl },
  playBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: spacing.xxl + 4, 
    paddingVertical: spacing.lg, 
    borderRadius: radii.lg - 2, 
    gap: spacing.sm + 2,
    // Shadow for depth
    shadowColor: '#E9692A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  playText: { color: '#FAFAFA', fontSize: 16, fontWeight: '600', letterSpacing: 0.3 },
  favBtn: {
    padding: spacing.lg, 
    backgroundColor: 'rgba(255,255,255,0.08)', 
    borderRadius: radii.lg - 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  infoRow: { flexDirection: 'row', marginBottom: 10, marginTop: 6 },
  label: { fontWeight: '600', marginRight: 6, fontSize: 14 },
  value: { flex: 1, fontSize: 14, opacity: 0.8 },
});

export default MediaInfoScreen;
