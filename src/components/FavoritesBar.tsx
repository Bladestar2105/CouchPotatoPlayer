import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Star, ChevronRight } from 'lucide-react-native';
import { ChannelLogo } from './ChannelLogo';
import { isMobile, isTV } from '../utils/platform';

interface FavoriteItem {
  id: number | string;
  type: 'live' | 'vod' | 'series';
  name: string;
  icon?: string;
  extension?: string;
  directSource?: string;
}

interface FavoritesBarProps {
  favorites: FavoriteItem[];
  onPress: (item: FavoriteItem) => void;
  onViewAll?: () => void;
}

export const FavoritesBar: React.FC<FavoritesBarProps> = ({ favorites, onPress, onViewAll }) => {
  if (!favorites || favorites.length === 0) return null;

  const renderItem = ({ item }: { item: FavoriteItem }) => (
    <TouchableOpacity
      style={styles.favItem}
      onPress={() => onPress(item)}
      activeOpacity={0.7}
      {...(isTV ? { hasTVPreferredFocus: false } : {})}
    >
      <ChannelLogo uri={item.icon} name={item.name} size={isMobile ? 48 : 60} />
      <Text style={styles.favName} numberOfLines={2}>{item.name}</Text>
      {item.type === 'live' && (
        <View style={styles.liveDot} />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Star color="#FFD60A" size={isMobile ? 16 : 20} fill="#FFD60A" />
          <Text style={styles.title}>Favorites</Text>
        </View>
        {onViewAll && favorites.length > 5 && (
          <TouchableOpacity style={styles.viewAllBtn} onPress={onViewAll}>
            <Text style={styles.viewAllText}>View All</Text>
            <ChevronRight color="#007AFF" size={16} />
          </TouchableOpacity>
        )}
      </View>
      <FlatList
        data={favorites.slice(0, 20)}
        renderItem={renderItem}
        keyExtractor={(item) => `fav-${item.id}-${item.type}`}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ width: isMobile ? 10 : 14 }} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: isMobile ? 16 : 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: isMobile ? 16 : 24,
    marginBottom: isMobile ? 10 : 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    color: '#FFF',
    fontSize: isMobile ? 17 : 22,
    fontWeight: 'bold',
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewAllText: {
    color: '#007AFF',
    fontSize: isMobile ? 13 : 16,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: isMobile ? 16 : 24,
  },
  favItem: {
    alignItems: 'center',
    width: isMobile ? 72 : 90,
    position: 'relative',
  },
  favName: {
    color: '#CCC',
    fontSize: isMobile ? 11 : 13,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: isMobile ? 14 : 16,
  },
  liveDot: {
    position: 'absolute',
    top: 2,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
    borderWidth: 1.5,
    borderColor: '#1C1C1E',
  },
});