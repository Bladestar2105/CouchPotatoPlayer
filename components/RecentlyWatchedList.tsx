import React from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Text, Image } from 'react-native';
import { useIPTV } from '../context/IPTVContext';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App';

type RecentlyWatchedScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

const RecentlyWatchedList = () => {
  const { channels, movies, series, recentlyWatched, playStream } = useIPTV();
  const navigation = useNavigation<RecentlyWatchedScreenNavigationProp>();

  // Aggregate all items into a single list
  const allItems = [
    ...channels.map(c => ({ ...c, mediaType: 'channel' as const })),
    ...movies.map(m => ({ ...m, mediaType: 'movie' as const })),
    ...series.map(s => ({ ...s, mediaType: 'series' as const }))
  ];

  const recentItems = recentlyWatched
    .map(id => allItems.find(item => item.id === id))
    .filter(Boolean); // removes undefined

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

  if (recentItems.length === 0) {
     return (
        <View style={styles.emptyContainer}>
           <Text style={styles.emptyText}>Aucun historique pour le moment.</Text>
        </View>
     );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={recentItems}
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

export default RecentlyWatchedList;