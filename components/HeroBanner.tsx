import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';

const TMDB_API_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY || '';
const TRENDING_URL = `https://api.themoviedb.org/3/trending/all/day?api_key=${TMDB_API_KEY}&language=fr-FR`;
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w780';

const HeroBanner = () => {
  const [trending, setTrending] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrending = async () => {
      if (!TMDB_API_KEY) {
         setLoading(false);
         return;
      }
      try {
        const response = await fetch(TRENDING_URL);
        const data = await response.json();
        if (data && data.results && data.results.length > 0) {
           // Pick a random trending item for the hero
           const randomIndex = Math.floor(Math.random() * Math.min(5, data.results.length));
           setTrending(data.results[randomIndex]);
        }
      } catch (error) {
        console.error('Failed to fetch TMDB trending', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrending();
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color="#E50914" />
      </View>
    );
  }

  if (!trending) {
     return null;
  }

  return (
    <View style={styles.container}>
      <Image
        source={{ uri: `${IMAGE_BASE_URL}${trending.backdrop_path || trending.poster_path}` }}
        style={styles.image}
      />
      <View style={styles.gradientOverlay} />
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {trending.title || trending.name}
        </Text>
        <Text style={styles.overview} numberOfLines={3}>
          {trending.overview}
        </Text>
      </View>
    </View>
  );
};

const { height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    height: height * 0.3,
    width: '100%',
    backgroundColor: '#111',
    position: 'relative',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  content: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  title: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10
  },
  overview: {
    color: '#DDD',
    fontSize: 14,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10
  }
});

export default HeroBanner;