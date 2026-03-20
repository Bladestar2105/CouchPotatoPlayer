import React from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Text, Image, useWindowDimensions } from 'react-native';
import { useIPTV } from '../context/IPTVContext';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App';
import { FavoriteItem } from '../types';
import { useSettings } from '../context/SettingsContext';
import { MaterialIcons as Icon } from '@expo/vector-icons';

type FavoritesScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

const FavoritesList = () => {
  const { favorites, removeFavorite, playStream, addRecentlyWatched } = useIPTV();
  const { colors } = useSettings();
  const navigation = useNavigation<FavoritesScreenNavigationProp>();
  const dimensions = useWindowDimensions();
  const isTvMode = dimensions.width >= 1200;

  const handlePress = (item: FavoriteItem) => {
    // Add to recently watched
    addRecentlyWatched({
      id: item.id,
      type: item.type,
      name: item.name,
      icon: item.icon,
      extension: item.type === 'live' ? 'm3u8' : 'mp4',
      lastWatchedAt: Date.now(),
    });

    if (item.type === 'live') {
      // For live channels, we need to get the URL from channels list
      // For now, navigate to player with the ID
      playStream({ url: '', id: item.id });
      navigation.navigate('Player');
    } else if (item.type === 'vod') {
      navigation.navigate('MediaInfo', { 
        id: item.id, 
        type: 'movie',
        title: item.name,
        cover: item.icon 
      });
    } else if (item.type === 'series') {
      navigation.navigate('MediaInfo', { 
        id: item.id, 
        type: 'series',
        title: item.name,
        cover: item.icon 
      });
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'live': return 'tv';
      case 'vod': return 'movie';
      case 'series': return 'list';
      default: return 'play-circle';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'live': return 'Live TV';
      case 'vod': return 'Film';
      case 'series': return 'Serie';
      default: return '';
    }
  };

  const renderItem = ({ item }: { item: FavoriteItem }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card }]}
      onPress={() => handlePress(item)}
    >
      <View style={[styles.imageContainer, { backgroundColor: colors.surface }]}>
        {item.icon ? (
          <Image
            source={{ uri: item.icon }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholderImage}>
            <Icon name={getTypeIcon(item.type)} size={32} color={colors.textSecondary} />
          </View>
        )}
        {/* Type Badge */}
        <View style={[styles.typeBadge, { backgroundColor: item.type === 'live' ? '#4CAF50' : item.type === 'vod' ? '#2196F3' : '#FF9800' }]}>
          <Icon name={getTypeIcon(item.type)} size={12} color="#FFF" />
        </View>
        {/* Remove Button */}
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => removeFavorite(item.id)}
        >
          <Icon name="close" size={16} color="#FFF" />
        </TouchableOpacity>
      </View>
      <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>{item.name}</Text>
      <Text style={[styles.typeLabel, { color: colors.textSecondary }]}>{getTypeLabel(item.type)}</Text>
    </TouchableOpacity>
  );

  if (favorites.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.background }]}>
        <Icon name="favorite-border" size={64} color={colors.textSecondary} />
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Keine Favoriten vorhanden.</Text>
        <Text style={[styles.emptyHint, { color: colors.textSecondary }]}>Füge Kanäle, Filme oder Serien zu deinen Favoriten hinzu.</Text>
      </View>
    );
  }

  const numColumns = isTvMode ? 6 : 3;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={favorites}
        keyExtractor={(item) => `${item.id}-${item.type}`}
        renderItem={renderItem}
        numColumns={numColumns}
        key={numColumns} // Force re-render when columns change
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    marginTop: 16,
    textAlign: 'center',
  },
  emptyHint: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    opacity: 0.7,
  },
  listContainer: {
    padding: 10,
  },
  card: {
    flex: 1,
    margin: 5,
    borderRadius: 8,
    overflow: 'hidden',
    alignItems: 'center',
    padding: 10,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: 8,
    marginBottom: 8,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
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
  typeBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 4,
  },
  typeLabel: {
    fontSize: 10,
  }
});

export default FavoritesList;