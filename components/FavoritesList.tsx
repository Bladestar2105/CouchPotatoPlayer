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
              { backgroundColor: 'rgba(30,30,46,0.9)' },
              isFocused ? { transform: [{ scale: 1.05 }], zIndex: 1, borderColor: '#7C4DFF', borderWidth: 2 } : { borderColor: 'transparent', borderWidth: 2 }
          ]}
          onPress={() => handlePress(item)}
          onFocus={() => setFocusedItemId(`${item.id}-${item.type}`)}
          onBlur={() => setFocusedItemId(null)}
          accessible={true}
          isTVSelectable={true}
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
            <View style={[styles.typeBadge, { backgroundColor: item.type === 'live' ? '#69F0AE' : item.type === 'vod' ? '#7C4DFF' : '#FFD740' }]}>
              <Icon name={getTypeIcon(item.type)} size={16} color="#FFF" />
            </View>
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => removeFavorite(item.id)}
              accessible={true}
              isTVSelectable={true}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${item.name} from favorites`}
            >
              <Icon name="close" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
          <View style={styles.infoContainer}>
             <Text style={[styles.name, { color: isFocused ? '#FAFAFA' : '#A1A1AA' }]} numberOfLines={2}>{item.name}</Text>
             <Text style={[styles.typeLabel, { color: '#71717A' }]}>{getTypeLabel(item.type)}</Text>
          </View>
        </TouchableOpacity>
      );
  };

  if (favorites.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: 'transparent' }]}>
        <Icon name="favorite-border" size={80} color={colors.textSecondary} />
        <Text style={[styles.emptyText, { color: '#FAFAFA' }]}>No Favorites Found</Text>
        <Text style={[styles.emptyHint, { color: '#A1A1AA' }]}>Add channels, movies, or series to your favorites to see them here.</Text>
      </View>
    );
  }

  const CARD_WIDTH = 160;
  // Account for padding and sidebar width
  const numColumns = Math.max(3, Math.floor((dimensions.width - 250 - 48) / (CARD_WIDTH + 16)));

  return (
    <View style={[styles.container, { backgroundColor: 'rgba(18,18,30,0.98)' }]}>
      <View style={styles.sortHeader}>
        <Text style={[styles.sortLabel, { color: '#A1A1AA' }]}>Sort by:</Text>
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
              accessible={true}
              isTVSelectable={true}
            >
              <Text style={[styles.sortButtonText, { color: sortBy === option.key ? '#FAFAFA' : '#A1A1AA' }]}>
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
    padding: 24,
  },
  emptyText: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 24,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  emptyHint: {
    fontSize: 15,
    marginTop: 12,
    textAlign: 'center',
    opacity: 0.7,
    lineHeight: 22,
  },
  listContainer: {
    padding: 20,
  },
  card: {
    width: 160,
    marginRight: 14,
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    // Shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
    borderRadius: 14,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A1A2E',
  },
  typeBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 30,
    height: 30,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContainer: {
      padding: 14,
  },
  name: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 5,
    letterSpacing: 0.1,
  },
  typeLabel: {
    fontSize: 12,
    fontWeight: '500',
    opacity: 0.7,
  },
  sortHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  sortLabel: {
    fontSize: 14,
    marginRight: 18,
    fontWeight: '500',
  },
  sortButtons: {
    flexDirection: 'row',
    gap: 10,
    flex: 1,
  },
  sortButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  sortButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

export default FavoritesList;
