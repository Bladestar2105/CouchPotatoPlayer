import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ImageBackground, ActivityIndicator, ScrollView, TouchableOpacity, useWindowDimensions, Platform, BackHandler, TVEventControl } from 'react-native';
import { RouteProp, useRoute, useNavigation, useIsFocused } from '@react-navigation/native';
import { RootStackParamList } from '../App';
import { useIPTV } from '../context/IPTVContext';
import { useSettings } from '../context/SettingsContext';
import { TMDBService } from '../services/tmdb';
import { isMobile } from '../utils/platform';
import { ChannelLogo } from '../components/ChannelLogo';
import { Play, Star, Calendar, ArrowLeft, Heart } from 'lucide-react-native';

type MediaInfoRouteProp = RouteProp<RootStackParamList, 'MediaInfo'>;

const MediaInfoScreen = () => {
  const route = useRoute<MediaInfoRouteProp>();
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const { id, type, title, cover, streamUrl, returnGroupId, returnTab } = route.params as any;
  const { getVodInfo, getSeriesInfo, playStream, series, favorites, addFavorite, removeFavorite } = useIPTV();
  const { colors, tmdbApiKey } = useSettings();
  const dimensions = useWindowDimensions();

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

    const fetchInfo = async () => {
      setLoading(true);
      let data = null;
      try {
        if (type === 'vod') data = await getVodInfo(id as string);
        else data = await getSeriesInfo(id as string);
      } catch (err) { }

      setInfo(data);

      const tmdb = new TMDBService({ apiKey: tmdbApiKey });
      if (tmdb.isAvailable()) {
        const enhanced = await tmdb.enrichTitle(title, type === 'series' ? 'tv' : 'movie');
        if (enhanced) setTmdbData(enhanced);
      }
      setLoading(false);
    };

    fetchInfo();
  }, [id, type, title, navigation]);

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

  const backdrop = tmdbData?.backdropUrl || cover;
  const poster = tmdbData?.posterUrl || cover;
  const desc = tmdbData?.overview || info?.info?.plot || 'No description available.';
  const rating = tmdbData?.rating ? `${tmdbData.rating.toFixed(1)}/10` : info?.info?.rating ? `${info.info.rating}/10` : null;
  const year = tmdbData?.releaseDate?.split('-')[0] || info?.info?.releasedate?.split('-')[0] || info?.info?.year || null;

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
<TouchableOpacity style={styles.backBtn} onPress={() => { if (navigation.canGoBack()) navigation.goBack(); else navigation.navigate('Home'); }} accessible={true} isTVSelectable={true} accessibilityRole="button" accessibilityLabel="Go back">
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

                {tmdbData?.genres ? (
                  <View style={styles.genresRow}>
                    {tmdbData.genres.map((g: string, i: number) => (
                      <View key={i} style={styles.genrePill}><Text style={styles.genreText}>{g}</Text></View>
                    ))}
                  </View>
                ) : info?.info?.genre && (
                  <View style={styles.genresRow}>
                    <View style={styles.genrePill}><Text style={styles.genreText}>{info.info.genre}</Text></View>
                  </View>
                )}

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
                  >
                    <Play color="#FFF" size={20} fill="#FFF" />
                    <Text style={styles.playText}>{type === 'series' ? 'Episodes' : 'Play'}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.favBtn} onPress={toggleFavorite} accessible={true} isTVSelectable={true} accessibilityRole="button" accessibilityLabel={isFavorite ? 'Remove from favorites' : 'Add to favorites'}>
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
  heroOverlay: { flex: 1, paddingHorizontal: 24, paddingBottom: 48 },
  backBtn: { 
    position: 'absolute', 
    top: 48, 
    left: 24, 
    zIndex: 10, 
    padding: 10, 
    backgroundColor: 'rgba(24,24,27,0.8)', 
    borderRadius: 14,
    // Shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  heroContentRow: { flexDirection: 'row', marginTop: 110, gap: 28, alignItems: 'flex-end' },
  posterWrap: { 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 12 }, 
    shadowOpacity: 0.5, 
    shadowRadius: 20,
    borderRadius: 16,
  },
  heroTextContent: { flex: 1 },
  title: { color: '#FAFAFA', fontSize: 34, fontWeight: '800', marginBottom: 14, letterSpacing: -0.5 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 18, marginBottom: 18 },
  badge: { backgroundColor: 'rgba(124,77,255,0.3)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  badgeText: { color: '#7C4DFF', fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { color: '#A1A1AA', fontSize: 14, fontWeight: '600' },
  genresRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 18 },
  genrePill: { 
    borderWidth: 1.5, 
    borderColor: 'rgba(255,255,255,0.15)', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  genreText: { color: '#A1A1AA', fontSize: 12, fontWeight: '500' },
  desc: { color: '#D4D4D8', fontSize: 15, lineHeight: 24, marginBottom: 28 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24 },
  playBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 28, 
    paddingVertical: 16, 
    borderRadius: 14, 
    gap: 10,
    // Shadow for depth
    shadowColor: '#7C4DFF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  playText: { color: '#FAFAFA', fontSize: 16, fontWeight: '600', letterSpacing: 0.3 },
  favBtn: { 
    padding: 16, 
    backgroundColor: 'rgba(255,255,255,0.08)', 
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  infoRow: { flexDirection: 'row', marginBottom: 10, marginTop: 6 },
  label: { fontWeight: '600', marginRight: 6, fontSize: 14 },
  value: { flex: 1, fontSize: 14, opacity: 0.8 },
});

export default MediaInfoScreen;
