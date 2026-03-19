import React from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Text, Image } from 'react-native';
import { useIPTV } from '../context/IPTVContext';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App';
import { Channel, Movie, Series } from '../types';

type FavoritesScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

const FavoritesList = () => {
  const { channels, movies, series, favorites, playStream } = useIPTV();
  const navigation = useNavigation<FavoritesScreenNavigationProp>();

  // ⚡ Bolt Optimization: Prevented O(N) array copying and mapping on every render.
  // Instead of eagerly copying and modifying every single channel/movie/series into
  // one massive array, we only lookup and map the items that are actually in favorites.
  // This drastically reduces memory allocation and execution time.
  const favoriteItems = React.useMemo(() => {
    return favorites.reduce((acc: any[], id: string) => {
      let item: any = channels.find(c => c.id === id);
      if (item) { acc.push({ ...item, mediaType: 'channel' }); return acc; }

      item = movies.find(m => m.id === id);
      if (item) { acc.push({ ...item, mediaType: 'movie' }); return acc; }

      item = series.find(s => s.id === id);
      if (item) { acc.push({ ...item, mediaType: 'series' }); return acc; }

      return acc;
    }, []);
  }, [channels, movies, series, favorites]);

  const handlePress = (item: any) => {
    if (item.mediaType === 'channel' || item.mediaType === 'movie') {
       playStream({ url: item.url || item.streamUrl, id: item.id });
       navigation.navigate('Player');
    } else if (item.mediaType === 'series') {
       navigation.navigate('Season', { series: item });
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => handlePress(item)}
    >
      <View style={styles.imageContainer}>
        {item.logo || item.cover ? (
          <Image
            source={{ uri: item.logo || item.cover }}
            style={styles.image}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.placeholderImage}>
             <Text style={styles.placeholderText}>{item.name.charAt(0)}</Text>
          </View>
        )}
      </View>
      <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
      <Text style={styles.typeLabel}>
        {item.mediaType === 'channel' ? 'Live TV' : item.mediaType === 'movie' ? 'Film' : 'Série'}
      </Text>
    </TouchableOpacity>
  );

  if (favoriteItems.length === 0) {
     return (
        <View style={styles.emptyContainer}>
           <Text style={styles.emptyText}>Aucun favori pour le moment.</Text>
        </View>
     );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={favoriteItems}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        numColumns={3}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  emptyContainer: {
     flex: 1,
     justifyContent: 'center',
     alignItems: 'center',
     backgroundColor: '#121212',
  },
  emptyText: {
     color: '#888',
     fontSize: 16,
  },
  listContainer: {
    padding: 10,
  },
  card: {
    flex: 1,
    margin: 5,
    backgroundColor: '#1E1E1E',
    borderRadius: 8,
    overflow: 'hidden',
    alignItems: 'center',
    padding: 10,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    marginBottom: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#555',
    fontSize: 24,
    fontWeight: 'bold',
  },
  name: {
    color: '#FFF',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 4,
  },
  typeLabel: {
    color: '#AAA',
    fontSize: 10,
  }
});

export default FavoritesList;