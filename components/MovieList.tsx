import React from 'react';
import {
  View, Text, SectionList, TouchableOpacity, StyleSheet,
  Image, ActivityIndicator
} from 'react-native';
import { useIPTV } from '../context/IPTVContext';
import { useNavigation } from '@react-navigation/native';
import { Movie } from '../types';

const defaultLogo = require('../assets/icon.png');

const MovieList = () => {
  const { movies, playStream, isLoading, pin, isAdultUnlocked } = useIPTV();
  const navigation = useNavigation();

  const handleMoviePress = (movie: Movie) => {
    // @ts-ignore - Dynamic route
    navigation.navigate('MediaInfo', { id: movie.id, type: 'vod', title: movie.name, cover: movie.cover, streamUrl: movie.streamUrl });
  };

  const groupedData = React.useMemo(() => {
    if (movies.length === 0) return [];

    const safeMovies = movies.filter(m => !m.isAdult || isAdultUnlocked || !pin);

    const groups = safeMovies.reduce((acc, movie) => {
      const groupTitle = movie.group || 'Inconnu';
      if (!acc[groupTitle]) {
        acc[groupTitle] = [];
      }
      acc[groupTitle].push(movie);
      return acc;
    }, {} as Record<string, Movie[]>);

    return Object.keys(groups).sort().map(title => ({
      title: title,
      data: groups[title]
    }));
  }, [movies, pin, isAdultUnlocked]);

  const renderItem = ({ item }: { item: Movie }) => (
    <View style={styles.itemContainer}>
      <TouchableOpacity
        style={styles.card}
        onPress={() => handleMoviePress(item)}
      >
        <Image
          style={styles.logo}
          source={item.cover ? { uri: item.cover } : defaultLogo}
          defaultSource={defaultLogo}
          resizeMode="cover"
        />
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  // Group items into rows of 3
  const formatData = (data: Movie[], numColumns: number) => {
    const formattedData = [];
    for (let i = 0; i < data.length; i += numColumns) {
      formattedData.push(data.slice(i, i + numColumns));
    }
    return formattedData;
  };

  const sectionsWithRows = groupedData.map(section => ({
    ...section,
    data: formatData(section.data, 3)
  }));

  const renderRow = ({ item }: { item: Movie[] }) => (
    <View style={styles.row}>
      {item.map(movie => (
        <React.Fragment key={movie.id + movie.streamUrl}>
          {renderItem({ item: movie })}
        </React.Fragment>
      ))}
      {/* Fill empty spaces in the last row to maintain grid alignment */}
      {Array.from({ length: 3 - item.length }).map((_, i) => (
        <View key={`empty-${i}`} style={styles.itemContainer} />
      ))}
    </View>
  );

  const renderSectionHeader = ({ section: { title } }: { section: { title: string } }) => (
    <Text style={styles.header}>{title}</Text>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#FFF" />
      </View>
    );
  }

  if (movies.length === 0) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.emptyText}>Aucun film trouvé dans ce profil.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SectionList
        sections={sectionsWithRows}
        renderItem={renderRow}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={(item, index) => index.toString()}
        stickySectionHeadersEnabled={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    backgroundColor: '#222',
    padding: 10,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  emptyText: {
    color: '#888',
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  itemContainer: {
    flex: 1,
    marginHorizontal: 5,
  },
  card: {
    backgroundColor: '#1C1C1E',
    borderRadius: 8,
    overflow: 'hidden',
    aspectRatio: 2/3,
  },
  logo: {
    width: '100%',
    height: '100%',
    backgroundColor: '#333',
  },
  info: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 8,
  },
  name: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default MovieList;