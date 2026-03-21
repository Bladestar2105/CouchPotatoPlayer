import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, FlatList, Dimensions } from 'react-native';
import { useIPTV } from '../context/IPTVContext';
import { useNavigation } from '@react-navigation/native';
import { Movie } from '../types';
import { useSettings } from '../context/SettingsContext';

const defaultLogo = require('../assets/icon.png');
const { width } = Dimensions.get('window');
const POSTER_WIDTH = 120;
// Calculate columns based on remaining width (sidebar is 250px)
const numColumns = Math.max(3, Math.floor((width - 310) / (POSTER_WIDTH + 16)));

const MovieList = () => {
  const { movies, isLoading, pin, isAdultUnlocked } = useIPTV();
  const { colors } = useSettings();
  const navigation = useNavigation<any>();

  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [focusedMovieId, setFocusedMovieId] = useState<string | null>(null);

  const groups = useMemo(() => {
    if (movies.length === 0) return [];
    const safeMovies = movies.filter(c => !c.isAdult || isAdultUnlocked || !pin);
    const groupMap = safeMovies.reduce((acc, movie) => {
      const g = movie.group || 'Unknown';
      if (!acc[g]) acc[g] = [];
      acc[g].push(movie);
      return acc;
    }, {} as Record<string, Movie[]>);

    return Object.keys(groupMap).sort().map(title => ({ title, data: groupMap[title] }));
  }, [movies, isAdultUnlocked, pin]);

  // Default select first group
  useEffect(() => {
    if (groups.length > 0 && !selectedGroup) {
      setSelectedGroup(groups[0].title);
    }
  }, [groups, selectedGroup]);

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
      <View style={[styles.categoriesSidebar, { backgroundColor: 'rgba(20,20,20,0.9)', borderRightColor: '#2C2C2E' }]}>
        <FlatList
          data={groups}
          keyExtractor={(item) => item.title}
          initialNumToRender={15}
          maxToRenderPerBatch={10}
          windowSize={5}
          renderItem={({ item }) => {
              const isSelected = selectedGroup === item.title;
              return (
                <TouchableOpacity
                  style={[
                    styles.categoryItem,
                    isSelected ? { backgroundColor: 'rgba(0, 122, 255, 0.4)' } : {}
                  ]}
                  onPress={() => setSelectedGroup(item.title)}
                  onFocus={() => setSelectedGroup(item.title)}
                  accessibilityRole="button"
                  accessibilityLabel={`Select category ${item.title}`}
                >
                  <Text style={{ color: isSelected ? '#FFF' : '#AAA', fontWeight: isSelected ? 'bold' : 'normal', fontSize: 16 }}>
                    {item.title} ({item.data.length})
                  </Text>
                </TouchableOpacity>
              );
          }}
        />
      </View>

      {/* Main Content - Movie Grid */}
      <View style={[styles.mainContent, { backgroundColor: 'rgba(30,30,30,0.9)' }]}>
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
                      source={item.cover ? { uri: item.cover } : defaultLogo}
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
