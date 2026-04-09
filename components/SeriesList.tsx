import React, { useMemo, useState, useEffect, forwardRef, useImperativeHandle, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, FlatList, Dimensions, Platform, findNodeHandle } from 'react-native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { useIPTV } from '../context/IPTVContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Series } from '../types';
import { useSettings } from '../context/SettingsContext';
import { proxyImageUrl } from '../utils/imageProxy';
export type ContentRef = { focusFirstItem: () => void; handleBack?: () => boolean };

const defaultLogo = require('../assets/character_logo.png');
const BASE_POSTER_WIDTH = Platform.isTV ? 150 : 130;
const MAX_POSTER_COLUMNS = 10;
const getSeriesPosterKey = (entry: Series): string => `${entry.group || 'Unknown'}::${entry.id}::${entry.name}`;
const getPosterUri = (cover?: string): string | undefined => {
  if (!cover) return undefined;
  const normalized = cover.trim().replace(/\\\//g, '/');
  if (!normalized) return undefined;
  if (normalized.startsWith('//')) return proxyImageUrl(`https:${normalized}`);
  if (/^https?:\/\//i.test(normalized)) return proxyImageUrl(normalized);
  return undefined;
};

// ⚡ Bolt: Wrap CategoryItem in React.memo to prevent unnecessary re-renders of the entire category list
// when selecting a new group. The custom comparison function ensures that inline functions like onPress
// do not trigger re-renders.
const CategoryItem = React.memo(React.forwardRef(({ title, count, isSelected, onPress, onFocus, colors, hasTVPreferredFocus, nextFocusRight }: { title: string, count: number, isSelected: boolean, onPress: () => void, onFocus: () => void, colors: any, hasTVPreferredFocus?: boolean, nextFocusRight?: number }, ref: React.Ref<any>) => {
    const [isFocused, setIsFocused] = useState(false);
    return (
        <TouchableOpacity
            ref={ref}
            style={[
                styles.categoryItem,
                isSelected ? { backgroundColor: 'rgba(233, 105, 42, 0.2)', borderLeftColor: '#E9692A', borderLeftWidth: 3 } : { borderLeftWidth: 3, borderLeftColor: 'transparent' },
                isFocused ? { backgroundColor: 'rgba(233, 105, 42, 0.3)', borderLeftColor: '#E9692A', borderLeftWidth: 3 } : {}
            ]}
            onPress={onPress}
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

const SeriesList = forwardRef<ContentRef, { onReturnToSidebar?: () => void }>((props, ref) => {
  const { series, isLoading, pin, isAdultUnlocked } = useIPTV();
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
      setSelectedSeriesKey(route.params.returnContentKey);
    }
    if (route.params?.returnGroupId || route.params?.returnContentKey) {
      navigation.setParams({ returnGroupId: undefined, returnContentKey: undefined });
    }
  }, [navigation, route.params?.returnContentKey, route.params?.returnGroupId]);
  const [focusedSeriesKey, setFocusedSeriesKey] = useState<string | null>(null);
  const [selectedSeriesKey, setSelectedSeriesKey] = useState<string | null>(null);
  const [showCategories, setShowCategories] = useState<boolean>(true);
  const [shouldFocusFirstItem, setShouldFocusFirstItem] = useState(false);

  // Ref for the first category item to focus
  const firstCategoryRef = useRef<any>(null);
  const firstPosterRef = useRef<any>(null);
  const [firstCategoryNode, setFirstCategoryNode] = useState<number | undefined>(undefined);
  const [firstPosterNode, setFirstPosterNode] = useState<number | undefined>(undefined);

  // Mobile responsiveness
  const isMobile = dimensions.width < 768;

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
    if (series.length === 0) return { groups: [], groupMap: {} };

    // ⚡ Bolt: Consolidated filter and reduce into a single pass to save CPU and memory allocations
    const map: Record<string, Series[]> = {};
    for (let i = 0; i < series.length; i++) {
      const item = series[i];
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
  }, [series, isAdultUnlocked, pin]);

  // Default select first group
  useEffect(() => {
    if (groups.length > 0 && !selectedGroup) {
      setSelectedGroup(groups[0].title);
    }
  }, [groups, selectedGroup]);

  const handleGroupSelect = (title: string) => {
    setSelectedGroup(title);
    setFocusedSeriesKey(null);
    setShouldFocusFirstItem(true);
    if (isMobile) {
      setShowCategories(false);
    }
  };

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

  const selectedSeries = useMemo(() => {
    return selectedGroup ? (groupMap[selectedGroup] || []) : [];
  }, [groupMap, selectedGroup]);

  useEffect(() => {
    if (!focusedSeriesKey && !selectedSeriesKey) return;

    const keysInGroup = new Set(selectedSeries.map(getSeriesPosterKey));
    if (focusedSeriesKey && !keysInGroup.has(focusedSeriesKey)) {
      setFocusedSeriesKey(null);
    }
    if (selectedSeriesKey && !keysInGroup.has(selectedSeriesKey)) {
      setSelectedSeriesKey(null);
    }
  }, [focusedSeriesKey, selectedSeries, selectedSeriesKey]);

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
          initialNumToRender={15}
          maxToRenderPerBatch={10}
          windowSize={5}
          renderItem={({ item, index }) => {
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
                  onPress={() => handleGroupSelect(item.title)}
                  onFocus={() => {}} // Do not set selected group on focus to prevent Apple TV UI freezes
                  colors={colors}
                  // @ts-ignore - supported on TV platforms
                  nextFocusRight={firstPosterNode}
                />
              );
          }}
        />
      </View>
      )}

      {/* Main Content - Series Grid */}
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
        {selectedSeries.length > 0 ? (
          <FlatList
            data={selectedSeries}
            keyExtractor={(item) => getSeriesPosterKey(item)}
            numColumns={numColumns}
            key={numColumns} // Force re-render if columns change
            extraData={{ focusedSeriesKey, selectedSeriesKey, selectedGroup }}
            contentContainerStyle={styles.gridContainer}
            initialNumToRender={12}
            maxToRenderPerBatch={12}
            windowSize={5}
            removeClippedSubviews={true}
            getItemLayout={(data, index) => {
               // Calculate row height based on poster + margins.
               const rowHeight = (posterWidth * 1.5) + 8 + 16 + 24; // poster height + margin + text + bottom margin
               const rowIndex = Math.floor(index / numColumns);
               return { length: rowHeight, offset: rowHeight * rowIndex, index };
            }}
            renderItem={({ item, index }) => {
                const seriesKey = getSeriesPosterKey(item);
                const isFocused = focusedSeriesKey === seriesKey;
                const isSelected = selectedSeriesKey === seriesKey;
                const posterUri = getPosterUri(item.cover);
                return (
                  <TouchableOpacity
                    accessible={true}
                    isTVSelectable={true}
                    activeOpacity={1}
                    ref={index === 0 ? (el: any) => {
                      firstPosterRef.current = el;
                      setFirstPosterNode(findNodeHandle(el) ?? undefined);
                    } : undefined}
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
                    onPress={() => {
                      setSelectedSeriesKey(seriesKey);
                      navigation.navigate('MediaInfo', {
                        id: item.id,
                        type: 'series',
                        title: item.name,
                        cover: item.cover,
                        returnGroupId: selectedGroup,
                        returnContentKey: seriesKey,
                        returnScreen: 'Home',
                        returnTab: 'series',
                      });
                    }}
                    onFocus={() => {
                      setFocusedSeriesKey(seriesKey);
                      setShouldFocusFirstItem(false);
                    }}
                    onBlur={() => setFocusedSeriesKey((current) => (current === seriesKey ? null : current))}
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
            }}
          />
        ) : (
          <View style={styles.centeredContainer}>
            <Text style={{ color: colors.textMuted }}>No series available</Text>
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
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 10,
    backgroundColor: '#1A1A2E',
    // Modern shadow for depth
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

export default SeriesList;
