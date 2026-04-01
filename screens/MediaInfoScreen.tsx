import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ImageBackground, ActivityIndicator, ScrollView, TouchableOpacity, useWindowDimensions } from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
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
  const { id, type, title, cover, streamUrl } = route.params;
  const { getVodInfo, getSeriesInfo, playStream, series, favorites, addFavorite, removeFavorite } = useIPTV();
  const { colors } = useSettings();
  const dimensions = useWindowDimensions();

  const [info, setInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tmdbData, setTmdbData] = useState<any>(null);

  const isFavorite = favorites.some(f => f.id === id && f.type === type);

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

      const tmdb = new TMDBService({ apiKey: 'YOUR_API_KEY_HERE' });
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
      navigation.navigate('Player');
    } else if (type === 'series') {
      const seriesObj = series.find(s => s.id?.toString() === id?.toString()) || { id, name: title, cover, seasons: [], group: '' };
      navigation.navigate('Season', { series: seriesObj });
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
          <View style={[styles.heroOverlay, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
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
                  >
                    <Play color="#FFF" size={20} fill="#FFF" />
                    <Text style={styles.playText}>{type === 'series' ? 'Episodes' : 'Play'}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.favBtn} onPress={toggleFavorite}>
                    {isFavorite ? <Heart color="#FF453A" size={24} fill="#FF453A" /> : <Heart color="#FFF" size={24} />}
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
  heroBackdrop: { width: '100%', minHeight: 450 },
  heroOverlay: { flex: 1, paddingHorizontal: 20, paddingBottom: 40 },
  backBtn: { position: 'absolute', top: 40, left: 20, zIndex: 10, padding: 8, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20 },
  heroContentRow: { flexDirection: 'row', marginTop: 100, gap: 24, alignItems: 'flex-end' },
  posterWrap: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 10 },
  heroTextContent: { flex: 1 },
  title: { color: '#FFF', fontSize: 32, fontWeight: '900', marginBottom: 12 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
  badge: { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { color: '#FFF', fontSize: 11, fontWeight: 'bold', letterSpacing: 1 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { color: '#CCC', fontSize: 14, fontWeight: '600' },
  genresRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  genrePill: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  genreText: { color: '#AAA', fontSize: 12 },
  desc: { color: '#DDD', fontSize: 15, lineHeight: 22, marginBottom: 24 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
  playBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, gap: 8 },
  playText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  favBtn: { padding: 14, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12 },
  infoRow: { flexDirection: 'row', marginBottom: 8, marginTop: 4 },
  label: { fontWeight: 'bold', marginRight: 4, fontSize: 14 },
  value: { flex: 1, fontSize: 14 },
});

export default MediaInfoScreen;
