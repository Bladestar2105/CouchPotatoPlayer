import React, { useState, useMemo, forwardRef, useImperativeHandle, useRef } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Text, Image, useWindowDimensions } from 'react-native';
import { useIPTV } from '../context/IPTVContext';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App';
import { FavoriteItem } from '../types';
import { useSettings } from '../context/SettingsContext';
import { MaterialIcons as Icon } from '@expo/vector-icons';
export type ContentRef = { focusFirstItem: () => void };

type FavoritesScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

type SortOption = 'added' | 'name' | 'type' | 'recent';

const FavoritesList = forwardRef<ContentRef, { onReturnToSidebar?: () => void }>((props, ref) => {
  const { favorites, removeFavorite, playStream, addRecentlyWatched } = useIPTV();
  const { colors } = useSettings();
  const navigation = useNavigation<FavoritesScreenNavigationProp>();
  const dimensions = useWindowDimensions();
  const [sortBy, setSortBy] = useState<SortOption>('added');
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null);

  // Expose focusFirstItem method to parent
  useImperativeHandle(ref, () => ({
    focusFirstItem: () => {
      // Focus the first item when entering from sidebar
    }
  }));

  const handlePress = (item: FavoriteItem) => {
    addRecentlyWatched({
      id: item.id,
      type: item.type,
      name: item.name,
      icon: item.icon,
      extension: item.type === 'live' ? 'm3u8' : 'mp4',
      lastWatchedAt: Date.now(),
    });

    if (item.type === 'live') {
      playStream({ url: '', id: item.id });
      navigation.navigate('Player');
    } else if (item.type === 'vod') {
      navigation.navigate('MediaInfo', { 
        id: item.id, 
        type: 'vod',
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

  const sortedFavorites = useMemo(() => {
    const sorted = [...favorites];
    switch (sortBy) {
      case 'name':
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case 'type':
        return sorted.sort((a, b) => a.type.localeCompare(b.type));
      case 'recent':
        return sorted.sort((a, b) => (b.lastWatchedAt || 0) - (a.lastWatchedAt || 0));
      case 'added':
      default:
        return sorted.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
    }
  }, [favorites, sortBy]);

  const renderItem = ({ item }: { item: FavoriteItem }) => {
     const isFocused = focusedItemId === `${item.id}-${item.type}`;
     return (
        <TouchableOpacity
          style={[
              styles.card,
              { backgroundColor: 'rgba(30,30,30,0.8)' },
              isFocused ? { transform: [{ scale: 1.05 }], zIndex: 1, borderColor: colors.primary, borderWidth: 2 } : { borderColor: 'transparent', borderWidth: 2 }
          ]}
          onPress={() => handlePress(item)}
          onFocus={() => setFocusedItemId(`${item.id}-${item.type}`)}
          onBlur={() => setFocusedItemId(null)}
          accessibilityRole="button"
          accessibilityLabel={`${getTypeLabel(item.type)}: ${item.name}`}
          accessibilityHint={`Plays the ${item.type}`}
        >
          <View style={[styles.imageContainer, { backgroundColor: '#1C1C1E' }]}>
            {item.icon ? (
              <Image
                source={{ uri: item.icon }}
                style={styles.image}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.placeholderImage}>
                <Icon name={getTypeIcon(item.type)} size={48} color={colors.textSecondary} />
              </View>
            )}
            <View style={[styles.typeBadge, { backgroundColor: item.type === 'live' ? '#4CAF50' : item.type === 'vod' ? '#2196F3' : '#FF9800' }]}>
              <Icon name={getTypeIcon(item.type)} size={16} color="#FFF" />
            </View>
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => removeFavorite(item.id)}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${item.name} from favorites`}
            >
              <Icon name="close" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
          <View style={styles.infoContainer}>
             <Text style={[styles.name, { color: isFocused ? '#FFF' : '#AAA' }]} numberOfLines={2}>{item.name}</Text>
             <Text style={[styles.typeLabel, { color: '#666' }]}>{getTypeLabel(item.type)}</Text>
          </View>
        </TouchableOpacity>
      );
  };

  if (favorites.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: 'transparent' }]}>
        <Icon name="favorite-border" size={80} color={colors.textSecondary} />
        <Text style={[styles.emptyText, { color: '#FFF' }]}>No Favorites Found</Text>
        <Text style={[styles.emptyHint, { color: '#AAA' }]}>Add channels, movies, or series to your favorites to see them here.</Text>
      </View>
    );
  }

  const CARD_WIDTH = 160;
  // Account for padding and sidebar width
  const numColumns = Math.max(3, Math.floor((dimensions.width - 250 - 48) / (CARD_WIDTH + 16)));

  return (
    <View style={[styles.container, { backgroundColor: 'rgba(20,20,20,0.95)' }]}>
      <View style={styles.sortHeader}>
        <Text style={[styles.sortLabel, { color: '#AAA' }]}>Sort by:</Text>
        <View style={styles.sortButtons}>
          {[
            { key: 'added', label: 'Recently Added' },
            { key: 'name', label: 'Name' },
            { key: 'type', label: 'Type' },
            { key: 'recent', label: 'Recently Watched' },
          ].map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.sortButton,
                { backgroundColor: sortBy === option.key ? colors.primary : 'rgba(255,255,255,0.1)' }
              ]}
              onPress={() => setSortBy(option.key as SortOption)}
              onFocus={() => setSortBy(option.key as SortOption)}
            >
              <Text style={[styles.sortButtonText, { color: sortBy === option.key ? '#FFF' : '#AAA' }]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      <FlatList
        data={sortedFavorites}
        keyExtractor={(item, index) => `${item.id || index}-${item.type || 'unknown'}`}
        renderItem={renderItem}
        numColumns={numColumns}
        key={numColumns}
        contentContainerStyle={styles.listContainer}
        initialNumToRender={12}
        maxToRenderPerBatch={12}
        windowSize={5}
        removeClippedSubviews={true}
      />
    </View>
  );
});

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
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    textAlign: 'center',
  },
  emptyHint: {
    fontSize: 16,
    marginTop: 10,
    textAlign: 'center',
  },
  listContainer: {
    padding: 24,
  },
  card: {
    width: 160,
    marginRight: 16,
    marginBottom: 24,
    borderRadius: 12,
    overflow: 'hidden',
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
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
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContainer: {
      padding: 12,
  },
  name: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  typeLabel: {
    fontSize: 12,
  },
  sortHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  sortLabel: {
    fontSize: 16,
    marginRight: 16,
  },
  sortButtons: {
    flexDirection: 'row',
    gap: 12,
    flex: 1,
  },
  sortButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  sortButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default FavoritesList;
