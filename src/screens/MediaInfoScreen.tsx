import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import { useAppStore } from '../store';
import { XtreamService } from '../services/xtream';
import { Play, ArrowLeft, ChevronLeft, Heart, Star } from 'lucide-react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { isTV, isMobile } from '../utils/platform';
import { showToast } from '../components/Toast';
import { SafeAreaView } from 'react-native-safe-area-context';
import { proxyImageUrl } from '../utils/imageProxy';
import { FavoriteItem } from '../types/iptv';
import { TMDBService, TMDBSearchResult } from '../services/tmdb';

type MediaInfoRouteProp = RouteProp<RootStackParamList, 'MediaInfo'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'MediaInfo'>;

export const MediaInfoScreen = () => {
  const route = useRoute<MediaInfoRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { id, type, title, cover, extension } = route.params;
  const config = useAppStore(state => state.config);
  const favorites = useAppStore(state => state.favorites);
  const addFavorite = useAppStore(state => state.addFavorite);
  const removeFavorite = useAppStore(state => state.removeFavorite);
  const addRecentlyWatched = useAppStore(state => state.addRecentlyWatched);

  const isFav = favorites.some(f => f.id === id);

  const toggleFavorite = () => {
    if (isFav) {
      removeFavorite(id);
      showToast('Removed from favorites', 'info');
    } else {
      addFavorite({
        id,
        type,
        name: title,
        icon: cover,
        addedAt: Date.now(),
      });
      showToast('Added to favorites', 'success');
    }
  };

  const [info, setInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tmdbData, setTmdbData] = useState<TMDBSearchResult | null>(null);

  useEffect(() => {
    const fetchInfo = async () => {
      if (!config || config.type !== 'xtream') {
        setLoading(false);
        return;
      }
      try {
        const xtream = new XtreamService(config);
        if (type === 'vod') {
          const data = await xtream.getVodInfo(id as number);
          setInfo(data.info);
        } else if (type === 'series') {
          const data = await xtream.getSeriesInfo(id as number);
          setInfo(data.info);
        }
      } catch (err) {
        console.error('Failed to get media info:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchInfo();
  }, [config, id, type]);

  // TMDB enrichment — runs after initial load
  useEffect(() => {
    const enrichWithTMDB = async () => {
      try {
        const mediaType = type === 'series' ? 'tv' : 'movie';
        const tmdb = new TMDBService({ apiKey: '0fd7a8764e6522629a3b7e78c452c348', language: 'de-DE' });
        const result = await tmdb.enrichTitle(title, mediaType);
        if (result) {
          setTmdbData(result);
        }
      } catch (err) {
        // TMDB is optional enrichment — don't break the UI
        console.log('TMDB enrichment skipped:', err);
      }
    };
    enrichWithTMDB();
  }, [title, type]);

  const handlePlay = () => {
    // Track recently watched
    addRecentlyWatched({
      id: id as number,
      type,
      name: title,
      icon: cover,
      extension,
      lastWatchedAt: Date.now(),
    });
    navigation.navigate('LivePlayer', {
      channelId: id as number,
      channelName: title,
      extension: extension,
      type: type
    });
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  const displayTitle = info?.name || info?.title || title;
  // Use TMDB cover/backdrop as fallback if Xtream has none
  const displayCover = info?.cover_big || info?.cover || cover || tmdbData?.posterUrl || tmdbData?.backdropUrl;
  const backdropUrl = tmdbData?.backdropUrl || null;
  const description = info?.plot || info?.description || tmdbData?.overview || 'No description available.';
  
  // Merge rating: prefer Xtream rating, fallback to TMDB
  const xtreamRating = info?.rating ? parseFloat(info.rating) : null;
  const tmdbRating = tmdbData?.rating || null;
  const displayRating = xtreamRating || tmdbRating;
  
  const director = info?.director ? `Director: ${info.director}` : '';
  const cast = info?.cast ? `Cast: ${info.cast}` : '';
  const releaseDate = info?.releasedate || info?.release_date || tmdbData?.releaseDate || '';
  const releaseDateLabel = releaseDate ? `Released: ${releaseDate}` : '';
  
  // TMDB genres
  const genres = tmdbData?.genres || [];
  
  // Year extraction
  const year = releaseDate ? releaseDate.substring(0, 4) : '';

  // Rating stars component
  const RatingBadge = ({ rating: r }: { rating: number }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Star size={isMobile ? 14 : 18} color="#FFD700" fill="#FFD700" />
      <Text style={{ color: '#FFD700', fontSize: isMobile ? 14 : 16, fontWeight: 'bold' }}>
        {r.toFixed(1)}
      </Text>
      <Text style={{ color: '#888', fontSize: isMobile ? 12 : 14 }}>/10</Text>
    </View>
  );

  // Genre pills component
  const GenrePills = () => {
    if (genres.length === 0) return null;
    return (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
        {genres.slice(0, 5).map((genre, i) => (
          <View key={i} style={{ backgroundColor: '#2C2C2E', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
            <Text style={{ color: '#CCC', fontSize: isMobile ? 12 : 13 }}>{genre}</Text>
          </View>
        ))}
      </View>
    );
  };

  // ── Mobile Layout ──────────────────────────────────────────────
  if (isMobile) {
    return (
      <SafeAreaView style={mStyles.container} edges={['top']}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header with back button over cover image */}
          <View style={mStyles.coverContainer}>
            {/* Use TMDB backdrop as background if available, otherwise cover */}
            {(backdropUrl || displayCover) ? (
              <Image source={{ uri: proxyImageUrl(backdropUrl || displayCover) }} style={mStyles.coverImage} resizeMode="cover" />
            ) : (
              <View style={mStyles.coverPlaceholder} />
            )}
            <TouchableOpacity
              style={mStyles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <ChevronLeft color="#FFF" size={24} />
            </TouchableOpacity>
            {/* Gradient overlay at bottom of cover */}
            <View style={mStyles.coverGradient} />
          </View>

          {/* Details */}
          <View style={mStyles.detailsContainer}>
            <Text style={mStyles.title}>{displayTitle}</Text>

            <View style={mStyles.metaRow}>
              {displayRating ? <RatingBadge rating={displayRating} /> : null}
              {year ? <Text style={mStyles.metaText}>{year}</Text> : null}
              {type === 'series' ? (
                <View style={mStyles.typeBadge}><Text style={mStyles.typeBadgeText}>Series</Text></View>
              ) : (
                <View style={mStyles.typeBadge}><Text style={mStyles.typeBadgeText}>Movie</Text></View>
              )}
            </View>

            <GenrePills />

            {/* Action buttons */}
            <View style={mStyles.actionRow}>
              <TouchableOpacity style={mStyles.playButton} onPress={handlePlay} activeOpacity={0.8}>
                <Play color="#FFF" size={20} fill="#FFF" />
                <Text style={mStyles.playButtonText}>Play</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={mStyles.favButtonMedia}
                onPress={toggleFavorite}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={isFav ? "Remove from favorites" : "Add to favorites"}
              >
                <Heart size={22} color={isFav ? '#FF453A' : '#FFF'} fill={isFav ? '#FF453A' : 'none'} />
              </TouchableOpacity>
            </View>

            <Text style={mStyles.description}>{description}</Text>

            {director ? <Text style={mStyles.castText}>{director}</Text> : null}
            {cast ? <Text style={mStyles.castText}>{cast}</Text> : null}
            {releaseDateLabel && !year ? <Text style={mStyles.castText}>{releaseDateLabel}</Text> : null}

            {/* TMDB attribution */}
            {tmdbData && (
              <Text style={{ color: '#555', fontSize: 10, marginTop: 16 }}>
                Additional data provided by TMDB
              </Text>
            )}

            <View style={{ height: 40 }} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── TV Layout ─────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Backdrop background image for TV */}
      {backdropUrl && (
        <Image 
          source={{ uri: proxyImageUrl(backdropUrl) }} 
          style={styles.backdrop} 
          resizeMode="cover" 
          blurRadius={3}
        />
      )}
      <View style={styles.backdropOverlay} />
      
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.contentContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft color="#FFF" size={24} />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        <View style={styles.content}>
          {displayCover ? (
            <Image source={{ uri: proxyImageUrl(displayCover) }} style={styles.cover} resizeMode="contain" />
          ) : (
            <View style={styles.placeholderCover} />
          )}

          <View style={styles.detailsContainer}>
            <Text style={styles.title}>{displayTitle}</Text>

            <View style={styles.metaRow}>
              {displayRating ? <RatingBadge rating={displayRating} /> : null}
              {year ? <Text style={styles.metaText}>{year}</Text> : null}
              {releaseDateLabel && !year ? <Text style={styles.metaText}>{releaseDateLabel}</Text> : null}
              {type === 'series' ? (
                <View style={{ backgroundColor: '#007AFF', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6 }}>
                  <Text style={{ color: '#FFF', fontSize: 14, fontWeight: 'bold' }}>Series</Text>
                </View>
              ) : null}
            </View>

            <GenrePills />

            <Text style={styles.description}>{description}</Text>

            {director ? <Text style={styles.castText}>{director}</Text> : null}
            {cast ? <Text style={styles.castText}>{cast}</Text> : null}

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
              <TouchableOpacity style={styles.playButton} onPress={handlePlay}>
                <Play color="#FFF" size={24} fill="#FFF" />
                <Text style={styles.playButtonText}>Play</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  backgroundColor: isFav ? 'rgba(255,69,58,0.2)' : '#2C2C2E',
                  paddingHorizontal: 24,
                  paddingVertical: 15,
                  borderRadius: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  borderWidth: isFav ? 1 : 0,
                  borderColor: '#FF453A',
                }}
                onPress={toggleFavorite}
                accessibilityRole="button"
                accessibilityLabel={isFav ? "Remove from favorites" : "Add to favorites"}
              >
                <Heart size={22} color={isFav ? '#FF453A' : '#FFF'} fill={isFav ? '#FF453A' : 'none'} />
                <Text style={{ color: '#FFF', fontSize: 18, fontWeight: 'bold' }}>
                  {isFav ? 'Favorited' : 'Favorite'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* TMDB attribution */}
            {tmdbData && (
              <Text style={{ color: '#555', fontSize: 11, marginTop: 20 }}>
                Additional data provided by TMDB
              </Text>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

// ── TV styles ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 500,
    opacity: 0.4,
  },
  backdropOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 500,
    backgroundColor: 'rgba(15,15,15,0.6)',
  },
  contentContainer: {
    padding: 30,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F0F0F',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    color: '#FFF',
    fontSize: 18,
    marginLeft: 10,
  },
  content: {
    flexDirection: 'row',
  },
  cover: {
    width: 300,
    height: 450,
    borderRadius: 15,
    backgroundColor: '#1C1C1E',
  },
  placeholderCover: {
    width: 300,
    height: 450,
    borderRadius: 15,
    backgroundColor: '#2C2C2E',
  },
  detailsContainer: {
    flex: 1,
    marginLeft: 40,
  },
  title: {
    color: '#FFF',
    fontSize: 40,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 20,
  },
  metaText: {
    color: '#888',
    fontSize: 16,
  },
  description: {
    color: '#DDD',
    fontSize: 18,
    lineHeight: 28,
    marginBottom: 20,
  },
  castText: {
    color: '#AAA',
    fontSize: 16,
    marginBottom: 10,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  playButtonText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});

// ── Mobile styles ─────────────────────────────────────────────
const { width: screenWidth } = Dimensions.get('window');

const mStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },
  coverContainer: {
    width: '100%',
    height: screenWidth * 0.65,
    backgroundColor: '#1C1C1E',
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#2C2C2E',
  },
  backButton: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  coverGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: 'transparent',
  },
  detailsContainer: {
    padding: 20,
  },
  title: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  typeBadge: {
    backgroundColor: '#2C2C2E',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeBadgeText: {
    color: '#AAA',
    fontSize: 12,
    fontWeight: '600',
  },
  metaBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  metaBadgeText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  metaText: {
    color: '#888',
    fontSize: 14,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  playButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 12,
  },
  playButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  favButtonMedia: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  description: {
    color: '#DDD',
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 16,
  },
  castText: {
    color: '#AAA',
    fontSize: 14,
    marginBottom: 8,
  },
});