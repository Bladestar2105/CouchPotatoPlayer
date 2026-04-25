import React, { useState, useMemo, forwardRef, useImperativeHandle, useCallback } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Text, Image, useWindowDimensions } from 'react-native';
import { useIPTVCollections, useIPTVLibrary, useIPTVPlayback } from '../context/IPTVContext';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App';
import { FavoriteItem } from '../types';
import { useSettings } from '../context/SettingsContext';
import { useTheme } from '../context/ThemeContext';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
export type ContentRef = { focusFirstItem: () => void; handleBack?: () => boolean };

type FavoritesScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

type SortOption = 'added' | 'name' | 'type' | 'recent';

// ⚡ Bolt: Extract FavoriteCard to prevent unnecessary re-renders of list items when parent state changes.
// Using React.memo allows us to only re-render the focused item, avoiding updates to the entire list.
const FavoriteCard = React.memo(({
  item,
  isFocused,
  handlePress,
  setFocusedItemId,
  getTypeLabel,
  getTypeIcon,
  colors,
  removeFavorite,
  t,
}: {
  item: FavoriteItem;
  isFocused: boolean;
  handlePress: (item: FavoriteItem) => void;
  setFocusedItemId: (id: string | null) => void;
  getTypeLabel: (type: string) => string;
  getTypeIcon: (type: string) => any;
  colors: any;
  removeFavorite: (id: string) => void;
  t: (key: string, options?: any) => string;
}) => {
  return (
    <TouchableOpacity
      style={[
          styles.card,
          { backgroundColor: 'rgba(30,30,46,0.9)' },
          isFocused ? { transform: [{ scale: 1.05 }], zIndex: 1, borderColor: colors.primary, borderWidth: 2 } : { borderColor: 'transparent', borderWidth: 2 }
      ]}
      onPress={() => handlePress(item)}
      onFocus={() => setFocusedItemId(`${item.id}-${item.type}`)}
      onBlur={() => setFocusedItemId(null)}
      accessible={true}
      isTVSelectable={true}
      accessibilityRole="button"
      accessibilityLabel={`${getTypeLabel(item.type)}: ${item.name}`}
      accessibilityHint={t('a11y.playTypeHint', { type: getTypeLabel(item.type) })}
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
        <View style={[styles.typeBadge, { backgroundColor: item.type === 'live' ? '#69F0AE' : item.type === 'vod' ? '#E9692A' : '#FFD740' }]}>
          <Icon name={getTypeIcon(item.type)} size={16} color="#FFF" />
        </View>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => removeFavorite(item.id)}
          accessible={true}
          isTVSelectable={true}
          accessibilityRole="button"
          accessibilityLabel={t('a11y.removeFromFavorites', { name: item.name })}
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
});

const FavoritesList = forwardRef<ContentRef, { onReturnToSidebar?: () => void }>((_props, ref) => {
  const { favorites, removeFavorite, addRecentlyWatched } = useIPTVCollections();
  const { channels } = useIPTVLibrary();
  const { playStream } = useIPTVPlayback();
  const { colors: legacyColors } = useSettings();
  const { accent, accentSoft } = useTheme();
  const colors = useMemo(
    () => ({ ...legacyColors, primary: accent, primaryLight: accentSoft }),
    [legacyColors, accent, accentSoft],
  );
  const { t } = useTranslation();
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

  const channelUrlById = useMemo(() => {
    const map = new Map<string, string>();
    for (const channel of channels) {
      if (channel.id && channel.url) {
        map.set(channel.id, channel.url);
      }
    }
    return map;
  }, [channels]);

  const handlePress = useCallback((item: FavoriteItem) => {
    addRecentlyWatched({
      id: item.id,
      type: item.type,
      name: item.name,
      icon: item.icon,
      extension: item.type === 'live' ? 'm3u8' : 'mp4',
      lastWatchedAt: Date.now(),
    });

    if (item.type === 'live') {
      const streamUrl = channelUrlById.get(item.id);
      if (!streamUrl) return;
      playStream({ url: streamUrl, id: item.id });
      navigation.navigate('Player', {
        focusChannelId: item.id,
        returnTab: 'favorites',
        returnScreen: 'Home',
      });
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
  }, [addRecentlyWatched, playStream, navigation, channelUrlById]);

  const getTypeIcon = useCallback((type: string) => {
    switch (type) {
      case 'live': return 'tv';
      case 'vod': return 'movie';
      case 'series': return 'list';
      default: return 'play-circle';
    }
  }, []);

  const getTypeLabel = useCallback((type: string) => {
    switch (type) {
      case 'live': return t('live');
      case 'vod': return t('vod');
      case 'series': return t('series');
      default: return '';
    }
  }, [t]);

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

  const renderItem = useCallback(({ item }: { item: FavoriteItem }) => {
     const isFocused = focusedItemId === `${item.id}-${item.type}`;
     return (
       <FavoriteCard
         item={item}
         isFocused={isFocused}
         handlePress={handlePress}
         setFocusedItemId={setFocusedItemId}
         getTypeLabel={getTypeLabel}
         getTypeIcon={getTypeIcon}
         colors={colors}
         removeFavorite={removeFavorite}
         t={t}
       />
     );
  }, [focusedItemId, handlePress, getTypeLabel, getTypeIcon, colors, removeFavorite, t]);

  if (favorites.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: 'transparent' }]}>
        <Icon name="favorite-border" size={80} color={colors.textSecondary} />
        <Text style={[styles.emptyText, { color: '#FAFAFA' }]}>{t('favorites.emptyTitle')}</Text>
        <Text style={[styles.emptyHint, { color: '#A1A1AA' }]}>{t('favorites.emptyHint')}</Text>
      </View>
    );
  }

  const CARD_WIDTH = 160;
  // Account for padding and sidebar width
  const numColumns = Math.max(3, Math.floor((dimensions.width - 250 - 48) / (CARD_WIDTH + 16)));

  return (
    <View style={[styles.container, { backgroundColor: 'rgba(18,18,30,0.98)' }]}>
      <View style={styles.sortHeader}>
        <Text style={[styles.sortLabel, { color: '#A1A1AA' }]}>{t('favorites.sortBy')}</Text>
        <View style={styles.sortButtons}>
          {[
            { key: 'added', label: t('favorites.sortAdded') },
            { key: 'name', label: t('favorites.sortName') },
            { key: 'type', label: t('favorites.sortType') },
            { key: 'recent', label: t('favorites.sortRecent') },
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
              accessibilityRole="tab"
              accessibilityState={{ selected: sortBy === option.key }}
              accessibilityLabel={t('favorites.sortByOption', { option: option.label })}
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
