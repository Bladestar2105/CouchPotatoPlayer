import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, FlatList, Dimensions, Platform } from 'react-native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { useIPTV } from '../context/IPTVContext';
import { useNavigation } from '@react-navigation/native';
import { Movie } from '../types';
import { useSettings } from '../context/SettingsContext';

const defaultLogo = require('../assets/icon.png');
const POSTER_WIDTH = 120;

// ⚡ Bolt: Wrap CategoryItem in React.memo to prevent unnecessary re-renders of the entire category list
// when selecting a new group. The custom comparison function ensures that inline functions like onPress
// do not trigger re-renders.
const CategoryItem = React.memo(({ title, count, isSelected, onPress, onFocus, colors }: { title: string, count: number, isSelected: boolean, onPress: () => void, onFocus: () => void, colors: any }) => {
    const [isFocused, setIsFocused] = useState(false);
    return (
        <TouchableOpacity
            style={[
                styles.categoryItem,
                isSelected ? { backgroundColor: 'rgba(0, 122, 255, 0.4)' } : {},
                isFocused ? { backgroundColor: 'rgba(255, 255, 255, 0.4)', borderColor: colors.primary, borderWidth: 2 } : { borderWidth: 2, borderColor: 'transparent' }
            ]}
            onPress={onPress}
            onFocus={() => { setIsFocused(true); onFocus(); }}
            onBlur={() => setIsFocused(false)}
            accessibilityRole="button"
            accessibilityLabel={`Select category ${title}`}
        >
            <Text style={{ color: isSelected || isFocused ? '#FFF' : '#AAA', fontWeight: isSelected || isFocused ? 'bold' : 'normal', fontSize: Platform.isTV ? 16 : 16 }}>
                {title} ({count})
            </Text>
        </TouchableOpacity>
    );
}, (prevProps, nextProps) => {
    return prevProps.title === nextProps.title && prevProps.isSelected === nextProps.isSelected && prevProps.count === nextProps.count;
});

const MovieList = () => {
  const { movies, isLoading, pin, isAdultUnlocked } = useIPTV();
  const { colors } = useSettings();
  const navigation = useNavigation<any>();
  const dimensions = Dimensions.get('window');

  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [focusedMovieId, setFocusedMovieId] = useState<string | null>(null);
  const [showCategories, setShowCategories] = useState<boolean>(true);

  // Mobile responsiveness
  const isMobile = dimensions.width < 768;
  const numColumns = Math.max(2, Math.floor((isMobile && !showCategories ? dimensions.width - 32 : dimensions.width - 310) / (POSTER_WIDTH + 16)));

  const groups = useMemo(() => {
    if (movies.length === 0) return [];

    // ⚡ Bolt: Consolidated filter and reduce into a single pass to save CPU and memory allocations
    const groupMap: Record<string, Movie[]> = {};
    for (let i = 0; i < movies.length; i++) {
      const movie = movies[i];
      if (!movie.isAdult || isAdultUnlocked || !pin) {
        const g = movie.group || 'Unknown';
        if (!groupMap[g]) groupMap[g] = [];
        groupMap[g].push(movie);
      }
    }

    // ⚡ Bolt: Pre-allocate array and use manual loop instead of .map() for massive datasets
    const keys = Object.keys(groupMap).sort();
    const result = new Array(keys.length);
    for (let i = 0; i < keys.length; i++) {
      const title = keys[i];
      result[i] = { title, data: groupMap[title] };
    }

    return result;
  }, [movies, isAdultUnlocked, pin]);

  // Default select first group
  useEffect(() => {
    if (groups.length > 0 && !selectedGroup) {
      setSelectedGroup(groups[0].title);
    }
  }, [groups, selectedGroup]);

  const handleGroupSelect = (title: string) => {
    setSelectedGroup(title);
    if (isMobile) {
      setShowCategories(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.centeredContainer, { backgroundColor: 'transparent' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const selectedMovies = useMemo(() => {
    return groups.find(g => g.title === selectedGroup)?.data || [];
  }, [groups, selectedGroup]);

  return (
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      {/* Categories Sidebar */}
      {showCategories && (
      <View style={[styles.categoriesSidebar, isMobile ? { width: '100%', flex: 1, borderRightWidth: 0 } : { backgroundColor: 'rgba(20,20,20,0.9)', borderRightColor: '#2C2C2E' }]}>
        {isMobile && (
            <View style={{ padding: 16, backgroundColor: 'rgba(20,20,20,1)', borderBottomWidth: 1, borderBottomColor: '#2C2C2E' }}>
              <Text style={{ color: '#FFF', fontSize: 20, fontWeight: 'bold' }}>Categories</Text>
            </View>
        )}
        <FlatList
          data={groups}
          keyExtractor={(item) => item.title}
          initialNumToRender={15}
          maxToRenderPerBatch={10}
          windowSize={5}
          renderItem={({ item }) => {
              const isSelected = selectedGroup === item.title;
              return (
                <CategoryItem
                  title={item.title}
                  count={item.data.length}
                  isSelected={isSelected}
                  onPress={() => handleGroupSelect(item.title)}
                  onFocus={() => {}} // Do not set selected group on focus to prevent Apple TV UI freezes
                  colors={colors}
                />
              );
          }}
        />
      </View>
      )}

      {/* Main Content - Movie Grid */}
      {(!isMobile || !showCategories) && (
      <View style={[styles.mainContent, isMobile ? { flex: 1 } : { backgroundColor: 'rgba(30,30,30,0.9)' }]}>
        {isMobile && (
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: 'rgba(20,20,20,1)', borderBottomWidth: 1, borderBottomColor: '#2C2C2E' }}>
              <TouchableOpacity onPress={() => setShowCategories(true)} style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Icon name="arrow-back" size={24} color="#FFF" />
                <Text style={{ color: '#FFF', marginLeft: 8, fontSize: 16, fontWeight: 'bold' }}>{selectedGroup}</Text>
              </TouchableOpacity>
            </View>
        )}
        {selectedMovies.length > 0 ? (
          <FlatList
            data={selectedMovies}
            keyExtractor={(item) => item.id}
            numColumns={numColumns}
            key={numColumns} // Force re-render if columns change
            contentContainerStyle={styles.gridContainer}
            initialNumToRender={12}
            maxToRenderPerBatch={12}
            windowSize={5}
            removeClippedSubviews={true}
            getItemLayout={(data, index) => {
               // Calculate row height based on poster + margins.
               const rowHeight = (POSTER_WIDTH * 1.5) + 8 + 16 + 24; // poster height + title margin + text approx + bottom margin
               const rowIndex = Math.floor(index / numColumns);
               return { length: rowHeight, offset: rowHeight * rowIndex, index };
            }}
            renderItem={({ item }) => {
                const isFocused = focusedMovieId === item.id;
                return (
                  <TouchableOpacity
                    style={[
                        styles.posterContainer,
                        isFocused ? { transform: [{ scale: 1.05 }], zIndex: 1 } : {}
                    ]}
                    onPress={() => navigation.navigate('MediaInfo', { id: item.id, type: 'vod', title: item.name, cover: item.cover, streamUrl: item.streamUrl })}
                    onFocus={() => setFocusedMovieId(item.id)}
                    onBlur={() => setFocusedMovieId(null)}
                  >
                    <Image
                      source={item.cover && item.cover.startsWith('http') ? { uri: item.cover } : defaultLogo}
                      style={[
                          styles.poster,
                          { borderColor: isFocused ? colors.primary : colors.divider },
                          isFocused ? { borderWidth: 3 } : {}
                      ]}
                      resizeMode="cover"
                    />
                    <Text style={[styles.title, { color: isFocused ? '#FFF' : '#AAA' }]} numberOfLines={2}>
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                );
            }}
          />
        ) : (
          <View style={styles.centeredContainer}>
            <Text style={{ color: '#AAA' }}>No movies available</Text>
          </View>
        )}
      </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoriesSidebar: {
    width: 250,
    borderRightWidth: 1,
  },
  categoryItem: {
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  mainContent: {
    flex: 1,
  },
  gridContainer: {
    padding: 24,
  },
  posterContainer: {
    width: POSTER_WIDTH,
    marginRight: 16,
    marginBottom: 24,
  },
  poster: {
    width: POSTER_WIDTH,
    height: POSTER_WIDTH * 1.5,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
    backgroundColor: '#1C1C1E',
  },
  title: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  }
});

export default MovieList;
