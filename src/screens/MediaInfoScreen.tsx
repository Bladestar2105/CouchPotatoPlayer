import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import { useAppStore } from '../store';
import { XtreamService } from '../services/xtream';
import { Play, ArrowLeft, ChevronLeft, Heart } from 'lucide-react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { isTV, isMobile } from '../utils/platform';
import { showToast } from '../components/Toast';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FavoriteItem } from '../types/iptv';

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
  const displayCover = info?.cover_big || info?.cover || cover;
  const description = info?.plot || info?.description || 'No description available.';
  const rating = info?.rating ? `Rating: ${info.rating}` : '';
  const director = info?.director ? `Director: ${info.director}` : '';
  const cast = info?.cast ? `Cast: ${info.cast}` : '';
  const releaseDate = info?.releasedate || info?.release_date ? `Released: ${info.releasedate || info.release_date}` : '';

  // ── Mobile Layout ──────────────────────────────────────────────
  if (isMobile) {
    return (
      <SafeAreaView style={mStyles.container} edges={['top']}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header with back button over cover image */}
          <View style={mStyles.coverContainer}>
            {displayCover ? (
              <Image source={{ uri: displayCover }} style={mStyles.coverImage} resizeMode="cover" />
            ) : (
              <View style={mStyles.coverPlaceholder} />
            )}
            <TouchableOpacity style={mStyles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
              <ChevronLeft color="#FFF" size={24} />
            </TouchableOpacity>
            {/* Gradient overlay at bottom of cover */}
            <View style={mStyles.coverGradient} />
          </View>

          {/* Details */}
          <View style={mStyles.detailsContainer}>
            <Text style={mStyles.title}>{displayTitle}</Text>

            <View style={mStyles.metaRow}>
              {rating ? <View style={mStyles.metaBadge}><Text style={mStyles.metaBadgeText}>{info?.rating}</Text></View> : null}
              {releaseDate ? <Text style={mStyles.metaText}>{releaseDate}</Text> : null}
            </View>

            {/* Action buttons */}
            <View style={mStyles.actionRow}>
              <TouchableOpacity style={mStyles.playButton} onPress={handlePlay} activeOpacity={0.8}>
                <Play color="#FFF" size={20} fill="#FFF" />
                <Text style={mStyles.playButtonText}>Play</Text>
              </TouchableOpacity>
              <TouchableOpacity style={mStyles.favButtonMedia} onPress={toggleFavorite} activeOpacity={0.7}>
                <Heart size={22} color={isFav ? '#FF453A' : '#FFF'} fill={isFav ? '#FF453A' : 'none'} />
              </TouchableOpacity>
            </View>

            <Text style={mStyles.description}>{description}</Text>

            {director ? <Text style={mStyles.castText}>{director}</Text> : null}
            {cast ? <Text style={mStyles.castText}>{cast}</Text> : null}

            <View style={{ height: 40 }} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── TV Layout (original) ───────────────────────────────────────
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <ArrowLeft color="#FFF" size={24} />
        <Text style={styles.backButtonText}>Back</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        {displayCover ? (
          <Image source={{ uri: displayCover }} style={styles.cover} resizeMode="contain" />
        ) : (
          <View style={styles.placeholderCover} />
        )}

        <View style={styles.detailsContainer}>
          <Text style={styles.title}>{displayTitle}</Text>

          <View style={styles.metaRow}>
            {rating ? <Text style={styles.metaText}>{rating}</Text> : null}
            {releaseDate ? <Text style={styles.metaText}>{releaseDate}</Text> : null}
          </View>

          <Text style={styles.description}>{description}</Text>

          {director ? <Text style={styles.castText}>{director}</Text> : null}
          {cast ? <Text style={styles.castText}>{cast}</Text> : null}

          <TouchableOpacity style={styles.playButton} onPress={handlePlay}>
            <Play color="#FFF" size={24} fill="#FFF" />
            <Text style={styles.playButtonText}>Play</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

// ── TV styles (original) ──────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
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
    marginBottom: 20,
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
    marginTop: 20,
  },
  playButtonText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});

// ── Mobile styles ─────────────────────────────────────────────────
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
    marginBottom: 16,
    gap: 12,
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