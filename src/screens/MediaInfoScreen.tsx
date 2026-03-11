import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import { useAppStore } from '../store';
import { XtreamService } from '../services/xtream';
import { Play, ArrowLeft } from 'lucide-react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type MediaInfoRouteProp = RouteProp<RootStackParamList, 'MediaInfo'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'MediaInfo'>;

export const MediaInfoScreen = () => {
  const route = useRoute<MediaInfoRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { id, type, title, cover, extension } = route.params;
  const config = useAppStore(state => state.config);

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