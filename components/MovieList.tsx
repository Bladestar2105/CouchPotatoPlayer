import React, { useMemo, useState, useEffect, forwardRef, useImperativeHandle, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, FlatList, Dimensions, Platform, findNodeHandle } from 'react-native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { useIPTVAppState, useIPTVLibrary, useIPTVParental } from '../context/IPTVContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Movie } from '../types';
import { useSettings } from '../context/SettingsContext';
import { proxyImageUrl } from '../utils/imageProxy';
import { useRenderDiagnostics } from '../hooks/useRenderDiagnostics';
export type ContentRef = { focusFirstItem: () => void; handleBack?: () => boolean };

const defaultLogo = require('../assets/character_logo.png');
const BASE_POSTER_WIDTH = Platform.isTV ? 150 : 130;
const MAX_POSTER_COLUMNS = 10;
const getMoviePosterKey = (movie: Movie): string => `${movie.group || 'Unknown'}::${movie.id}::${movie.streamUrl}::${movie.name}`;
const getPosterUri = (cover?: string): string | undefined => {
  if (!cover) return undefined;
  const normalized = cover.trim().replace(/\\\//g, '/');
  if (!normalized) return undefined;
  if (normalized.startsWith('//')) return proxyImageUrl(encodeURI(`https:${normalized}`));
  if (/^https?:\/\//i.test(normalized)) return proxyImageUrl(encodeURI(normalized));
  if (normalized.startsWith('www.')) return proxyImageUrl(encodeURI(`https://${normalized}`));
  if (/^[a-z0-9.-]+\.[a-z]{2,}(\/|$)/i.test(normalized)) return proxyImageUrl(encodeURI(`https://${normalized}`));
  return undefined;
};

// ⚡ Bolt: Wrap CategoryItem in React.memo to prevent unnecessary re-renders of the entire category list
// when selecting a new group. The custom comparison function ensures that inline functions like onPress
// do not trigger re-renders.
const CategoryItem = React.memo(React.forwardRef(({ title, count, isSelected, onPress, onFocus, colors, hasTVPreferredFocus, nextFocusRight }: { title: string, count?: number, isSelected: boolean, onPress: (title: string) => void, onFocus?: (title: string) => void, colors: any, hasTVPreferredFocus?: boolean, nextFocusRight?: number }, ref: React.Ref<any>) => {
    const [isFocused, setIsFocused] = useState(false);
    return (
        <TouchableOpacity
            ref={ref}
            style={[
                styles.categoryItem,
                isSelected ? { backgroundColor: 'rgba(233, 105, 42, 0.2)', borderLeftColor: '#E9692A', borderLeftWidth: 3 } : { borderLeftWidth: 3, borderLeftColor: 'transparent' },
                isFocused ? { backgroundColor: 'rgba(233, 105, 42, 0.3)', borderLeftColor: '#E9692A', borderLeftWidth: 3 } : {}
            ]}
            onPress={() => onPress(item)}
            onFocus={() => { setIsFocused(true); onFocus(); }}
            onBlur={() => setIsFocused(false)}
            accessible={true}
            isTVSelectable={true}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={`Select category ${title}`}
            hasTVPreferredFocus={hasTVPreferredFocus}
            // @ts-ignore - supported on TV platforms
            nextFocusRight={nextFocusRight}
        >
            <Text style={{ color: isSelected || isFocused ? '#FAFAFA' : '#A1A1AA', fontWeight: isSelected || isFocused ? '600' : '400', fontSize: Platform.isTV ? 15 : 15 }}>
                {title} ({count})
            </Text>
        </TouchableOpacity>
    );
}));

const MoviePosterItem = React.memo(({
  item,
  index,
  movieKey,
  isFocused,
  isSelected,
  posterWidth,
  numColumns,
  gridGap,
  firstCategoryNode,
  shouldFocusFirstItem,
  colors,
  onPress,
  onFocus,
  onBlur,
  posterRef,
}: any) => {
  const posterUri = getPosterUri(item.cover);
  return (
    <TouchableOpacity
      accessible={true}
      isTVSelectable={true}
      activeOpacity={1}
      ref={posterRef}
      hasTVPreferredFocus={shouldFocusFirstItem && index === 0}
      style={[
        styles.posterContainer,
        {
          width: posterWidth,
          marginRight: ((index + 1) % numColumns === 0) ? 0 : gridGap,
        },
        isFocused ? { transform: [{ scale: 1.05 }], zIndex: 1, borderColor: colors.primary, borderWidth: 3, borderRadius: 16 } : {},
        !isFocused && isSelected ? { borderColor: colors.primary, borderWidth: 3, borderRadius: 16 } : {}
      ]}
      // @ts-ignore - supported on TV platforms
      nextFocusLeft={firstCategoryNode}
      tvParallaxProperties={{ enabled: false }}
      onPress={() => onPress(item)}
      onFocus={() => onFocus(movieKey)}
      onBlur={() => onBlur(movieKey)}
    >
      <Image
        source={posterUri ? { uri: posterUri } : defaultLogo}
        style={[
          styles.poster,
          { width: posterWidth, height: posterWidth * 1.5 },
          { borderColor: isFocused || isSelected ? colors.primary : colors.divider },
        ]}
        resizeMode="cover"
      />
      <Text style={[styles.title, { color: isFocused || isSelected ? colors.text : colors.textSecondary }]} numberOfLines={2}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );
}, (prev, next) => (
  prev.item.id === next.item.id &&
  prev.item.cover === next.item.cover &&
  prev.item.name === next.item.name &&
  prev.movieKey === next.movieKey &&
  prev.index === next.index &&
  prev.isFocused === next.isFocused &&
  prev.isSelected === next.isSelected &&
  prev.posterWidth === next.posterWidth &&
  prev.numColumns === next.numColumns &&
  prev.gridGap === next.gridGap &&
  prev.firstCategoryNode === next.firstCategoryNode &&
  prev.shouldFocusFirstItem === next.shouldFocusFirstItem &&
  prev.colors === next.colors
));

const MovieList = forwardRef<ContentRef, { onReturnToSidebar?: () => void }>((props, ref) => {
  const { isLoading } = useIPTVAppState();
  const { pin, isAdultUnlocked } = useIPTVParental();
  const { movies } = useIPTVLibrary();
  const { colors } = useSettings();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dimensions = Dimensions.get('window');

  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  useEffect(() => {
    if (route.params?.returnGroupId) {
      setSelectedGroup(route.params.returnGroupId);
    }
    if (route.params?.returnContentKey) {
      setSelectedMovieKey(route.params.returnContentKey);
    }
    if (route.params?.returnGroupId || route.params?.returnContentKey) {
      navigation.setParams({ returnGroupId: undefined, returnContentKey: undefined });
    }
  }, [navigation, route.params?.returnContentKey, route.params?.returnGroupId]);
  const [focusedMovieKey, setFocusedMovieKey] = useState<string | null>(null);
  const [selectedMovieKey, setSelectedMovieKey] = useState<string | null>(null);
  const [showCategories, setShowCategories] = useState<boolean>(true);
  const [shouldFocusFirstItem, setShouldFocusFirstItem] = useState(false);

  // Ref for the first category item to focus
  const firstCategoryRef = useRef<any>(null);
  const firstPosterRef = useRef<any>(null);
  const [firstCategoryNode, setFirstCategoryNode] = useState<number | undefined>(undefined);
  const [firstPosterNode, setFirstPosterNode] = useState<number | undefined>(undefined);

  // Mobile responsiveness
  const isMobile = dimensions.width < 768;
  const listPerfConfig = useMemo(() => (
    Platform.isTV
      ? { initialNumToRender: 16, maxToRenderPerBatch: 14, windowSize: 9, updateCellsBatchingPeriod: 16, removeClippedSubviews: false }
      : { initialNumToRender: 12, maxToRenderPerBatch: 12, windowSize: 6, updateCellsBatchingPeriod: 24, removeClippedSubviews: true }
  ), []);

  // Expose focusFirstItem and handleBack methods to parent
  useImperativeHandle(ref, () => ({
    focusFirstItem: () => {
      if (!isMobile) {
        firstPosterRef.current?.focus?.();
        firstPosterRef.current?.setNativeProps?.({ hasTVPreferredFocus: true });
        return;
      }
      firstCategoryRef.current?.focus?.();
      firstCategoryRef.current?.setNativeProps?.({ hasTVPreferredFocus: true });
    },
    handleBack: () => {
      // Go back from content grid to categories before leaving section
      if (!showCategories) {
        setShowCategories(true);
        return true;
      }
      return false;
    },
  }));
  const availableGridWidth = (isMobile && !showCategories ? dimensions.width - 32 : dimensions.width - 310);
  const numColumns = Math.min(
    MAX_POSTER_COLUMNS,
    Math.max(2, Math.floor(availableGridWidth / (BASE_POSTER_WIDTH + 14)))
  );
  const gridGap = 14;
  const gridPadding = 20;
  const posterWidth = Math.max(
    115,
    Math.floor((availableGridWidth - (gridPadding * 2) - (gridGap * (numColumns - 1))) / numColumns)
  );

  const { groups, groupMap } = useMemo(() => {
    if (movies.length === 0) return { groups: [], groupMap: {} };

    // ⚡ Bolt: Consolidated filter and reduce into a single pass to save CPU and memory allocations
    const map: Record<string, Movie[]> = {};
    for (let i = 0; i < movies.length; i++) {
      const item = movies[i];
      if (!item.isAdult || isAdultUnlocked || !pin) {
        const g = item.group || 'Unknown';
        if (!map[g]) map[g] = [];
        map[g].push(item);
      }
    }

    // ⚡ Bolt: Pre-allocate array and use manual loop instead of .map() for massive datasets
    const keys = Object.keys(map);
    const result = new Array(keys.length);
    for (let i = 0; i < keys.length; i++) {
      const title = keys[i];
      result[i] = { title, data: map[title] };
    }

    return { groups: result, groupMap: map };
  }, [movies, isAdultUnlocked, pin]);

  // Default select first group
  useEffect(() => {
    if (groups.length > 0 && !selectedGroup) {
      setSelectedGroup(groups[0].title);
    }
  }, [groups, selectedGroup]);

  const handleGroupSelect = useCallback((title: string) => {
    setSelectedGroup(title);
    setFocusedMovieKey(null);
    setShouldFocusFirstItem(true);
    if (isMobile) {
      setShowCategories(false);
    }
  }, [isMobile]);

  useEffect(() => {
    if (shouldFocusFirstItem) {
      const timer = setTimeout(() => setShouldFocusFirstItem(false), 100);
      return () => clearTimeout(timer);
    }
  }, [shouldFocusFirstItem]);

  if (isLoading) {
    return (
      <View style={[styles.centeredContainer, { backgroundColor: 'transparent' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const selectedMovies = useMemo(() => {
    return selectedGroup ? (groupMap[selectedGroup] || []) : [];
  }, [groupMap, selectedGroup]);
  const movieListExtraData = useMemo(() => ({
    focusedMovieKey,
    selectedMovieKey,
  }), [focusedMovieKey, selectedMovieKey]);

  useRenderDiagnostics('MovieList', {
    selectedGroup,
    groupsCount: groups.length,
    selectedMoviesCount: selectedMovies.length,
    focusedMovieKey,
    isLoading,
  });

  useEffect(() => {
    if (!focusedMovieKey && !selectedMovieKey) return;

    const keysInGroup = new Set(selectedMovies.map(getMoviePosterKey));
    if (focusedMovieKey && !keysInGroup.has(focusedMovieKey)) {
      setFocusedMovieKey(null);
    }
    if (selectedMovieKey && !keysInGroup.has(selectedMovieKey)) {
      setSelectedMovieKey(null);
    }
  }, [focusedMovieKey, selectedMovieKey, selectedMovies]);

  const renderCategoryItem = useCallback(({ item, index }: { item: { title: string; data: Movie[] }; index: number }) => {
    const isSelected = selectedGroup === item.title;
    const isFirstItem = index === 0;
    return (
      <CategoryItem
        ref={isFirstItem ? (el: any) => {
          firstCategoryRef.current = el;
          setFirstCategoryNode(findNodeHandle(el) ?? undefined);
        } : undefined}
        title={item.title}
        count={item.data.length}
        isSelected={isSelected}
        onPress={handleGroupSelect}
        onFocus={undefined} // Do not set selected group on focus to prevent Apple TV UI freezes
        colors={colors}
        // @ts-ignore - supported on TV platforms
        nextFocusRight={firstPosterNode}
      />
    );
  }, [selectedGroup, handleGroupSelect, colors, firstPosterNode]);

  const renderMovieItem = useCallback(({ item, index }: { item: Movie; index: number }) => {
    const movieKey = getMoviePosterKey(item);
    const isFocused = focusedMovieKey === movieKey;
    const isSelected = selectedMovieKey === movieKey;

    return (
      <MoviePosterItem
        item={item}
        index={index}
        movieKey={movieKey}
        isFocused={isFocused}
        isSelected={isSelected}
        posterWidth={posterWidth}
        numColumns={numColumns}
        gridGap={gridGap}
        firstCategoryNode={firstCategoryNode}
        shouldFocusFirstItem={shouldFocusFirstItem}
        colors={colors}
        posterRef={index === 0 ? (el: any) => {
          firstPosterRef.current = el;
          setFirstPosterNode(findNodeHandle(el) ?? undefined);
        } : undefined}
        onPress={() => {
          setSelectedMovieKey(movieKey);
          navigation.navigate('MediaInfo', {
            id: item.id,
            type: 'vod',
            title: item.name,
            cover: item.cover,
            streamUrl: item.streamUrl,
            returnGroupId: selectedGroup,
            returnContentKey: movieKey,
            returnScreen: 'Home',
            returnTab: 'movies',
          });
        }}
        onFocus={() => {
          setFocusedMovieKey(movieKey);
          setShouldFocusFirstItem(false);
        }}
        onBlur={() => setFocusedMovieKey((current) => (current === movieKey ? null : current))}
      />
    );
  }, [focusedMovieKey, selectedMovieKey, shouldFocusFirstItem, posterWidth, numColumns, gridGap, colors, firstCategoryNode, navigation, selectedGroup]);

  return (
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      {/* Categories Sidebar */}
      {showCategories && (
      <View style={[styles.categoriesSidebar, isMobile ? { width: '100%', flex: 1, borderRightWidth: 0 } : { backgroundColor: colors.surface, borderRightColor: colors.divider }]}>
        {isMobile && (
            <View style={{ padding: 16, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.divider }}>
              <Text style={{ color: colors.text, fontSize: 20, fontWeight: 'bold' }}>Categories</Text>
            </View>
        )}
        <FlatList
          data={groups}
          keyExtractor={(item) => item.title}
          initialNumToRender={listPerfConfig.initialNumToRender}
          maxToRenderPerBatch={listPerfConfig.maxToRenderPerBatch}
          windowSize={listPerfConfig.windowSize}
          updateCellsBatchingPeriod={listPerfConfig.updateCellsBatchingPeriod}
          removeClippedSubviews={listPerfConfig.removeClippedSubviews}
          renderItem={renderCategoryItem}
        />
      </View>
      )}

      {/* Main Content - Movie Grid */}
      {(!isMobile || !showCategories) && (
      <View style={[styles.mainContent, isMobile ? { flex: 1 } : { backgroundColor: colors.background }]}>
        {isMobile && (
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.divider }}>
              <TouchableOpacity onPress={() => setShowCategories(true)} style={{ flexDirection: 'row', alignItems: 'center' }} accessible={true} isTVSelectable={true}>
                <Icon name="arrow-back" size={24} color={colors.text} />
                <Text style={{ color: colors.text, marginLeft: 8, fontSize: 16, fontWeight: 'bold' }}>{selectedGroup}</Text>
              </TouchableOpacity>
            </View>
        )}
        {selectedMovies.length > 0 ? (
          <FlatList
            data={selectedMovies}
            keyExtractor={(item) => getMoviePosterKey(item)}
            numColumns={numColumns}
            key={numColumns} // Force re-render if columns change
            extraData={movieListExtraData}
            contentContainerStyle={styles.gridContainer}
            initialNumToRender={listPerfConfig.initialNumToRender}
            maxToRenderPerBatch={listPerfConfig.maxToRenderPerBatch}
            windowSize={listPerfConfig.windowSize}
            updateCellsBatchingPeriod={listPerfConfig.updateCellsBatchingPeriod}
            removeClippedSubviews={listPerfConfig.removeClippedSubviews}
            getItemLayout={(data, index) => {
               // Calculate row height based on poster + margins.
               const rowHeight = (posterWidth * 1.5) + 8 + 16 + 24; // poster height + title margin + text approx + bottom margin
               const rowIndex = Math.floor(index / numColumns);
               return { length: rowHeight, offset: rowHeight * rowIndex, index };
            }}
            renderItem={renderMovieItem}
          />
        ) : (
          <View style={styles.centeredContainer}>
            <Text style={{ color: colors.textMuted }}>No movies available</Text>
          </View>
        )}
      </View>
      )}
    </View>
  );
});

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
    width: 260,
    borderRightWidth: 1,
  },
  categoryItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    marginHorizontal: 8,
    marginBottom: 4,
  },
  mainContent: {
    flex: 1,
  },
  gridContainer: {
    padding: 20,
  },
  posterContainer: {
    marginBottom: 20,
    borderWidth: 3,
    borderColor: 'transparent',
    borderRadius: 16,
    padding: 4,
  },
  poster: {
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 10,
    backgroundColor: '#16161F',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '500',
    letterSpacing: 0.1,
  }
});

export default MovieList;
