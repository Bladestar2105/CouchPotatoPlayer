import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, FlatList, Dimensions } from 'react-native';
import { useIPTV } from '../context/IPTVContext';
import { useNavigation } from '@react-navigation/native';
import { Movie } from '../types';
import { useSettings } from '../context/SettingsContext';

const defaultLogo = require('../assets/icon.png');
const { width } = Dimensions.get('window');
const POSTER_WIDTH = 120;
const numColumns = Math.floor((width - 200) / (POSTER_WIDTH + 16)); // calculate cols based on remaining width

const MovieList = () => {
  const { movies, isLoading, pin, isAdultUnlocked } = useIPTV();
  const { colors } = useSettings();
  const navigation = useNavigation<any>();

  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

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
      <View style={[styles.centeredContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const selectedMovies = useMemo(() => {
    return groups.find(g => g.title === selectedGroup)?.data || [];
  }, [groups, selectedGroup]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Categories Sidebar */}
      <View style={[styles.categoriesSidebar, { backgroundColor: colors.surface, borderRightColor: colors.divider }]}>
        <FlatList
          data={groups}
          keyExtractor={(item) => item.title}
          initialNumToRender={15}
          maxToRenderPerBatch={10}
          windowSize={5}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.categoryItem,
                selectedGroup === item.title ? { backgroundColor: colors.primary + '33', borderLeftColor: colors.primary, borderLeftWidth: 4 } : { borderLeftColor: 'transparent', borderLeftWidth: 4 }
              ]}
              onPress={() => setSelectedGroup(item.title)}
              accessibilityRole="button"
              accessibilityLabel={`Select category ${item.title}`}
            >
              <Text style={{ color: selectedGroup === item.title ? colors.primary : colors.textSecondary, fontWeight: selectedGroup === item.title ? 'bold' : 'normal' }}>
                {item.title} ({item.data.length})
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Main Content - Movie Grid */}
      <View style={styles.mainContent}>
        {selectedMovies.length > 0 ? (
          <FlatList
            data={selectedMovies}
            keyExtractor={(item) => item.id}
            numColumns={numColumns > 0 ? numColumns : 3}
            key={numColumns} // Force re-render if columns change
            contentContainerStyle={styles.gridContainer}
            initialNumToRender={12}
            maxToRenderPerBatch={12}
            windowSize={5}
            removeClippedSubviews={true}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.posterContainer}
                onPress={() => navigation.navigate('MediaInfo', { id: item.id, type: 'vod', title: item.name, cover: item.cover, streamUrl: item.streamUrl })}
              >
                <Image
                  source={item.cover ? { uri: item.cover } : defaultLogo}
                  style={[styles.poster, { borderColor: colors.divider }]}
                  resizeMode="cover"
                />
                <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            )}
          />
        ) : (
          <View style={styles.centeredContainer}>
            <Text style={{ color: colors.textSecondary }}>No movies available</Text>
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
    width: 200,
    borderRightWidth: 1,
  },
  categoryItem: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  mainContent: {
    flex: 1,
  },
  gridContainer: {
    padding: 16,
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
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
  }
});

export default MovieList;
