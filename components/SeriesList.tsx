import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, FlatList, Dimensions } from 'react-native';
import { useIPTV } from '../context/IPTVContext';
import { useNavigation } from '@react-navigation/native';
import { Series } from '../types';
import { useSettings } from '../context/SettingsContext';

const defaultLogo = require('../assets/icon.png');
const POSTER_WIDTH = 120;

const SeriesList = () => {
  const { series, isLoading, pin, isAdultUnlocked } = useIPTV();
  const { colors } = useSettings();
  const navigation = useNavigation<any>();
  const dimensions = Dimensions.get('window');

  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [focusedSeriesId, setFocusedSeriesId] = useState<string | null>(null);
  const [showCategories, setShowCategories] = useState<boolean>(true);

  // Mobile responsiveness
  const isMobile = dimensions.width < 768;
  const numColumns = Math.max(2, Math.floor((isMobile && !showCategories ? dimensions.width - 32 : dimensions.width - 310) / (POSTER_WIDTH + 16)));

  const groups = useMemo(() => {
    if (series.length === 0) return [];
    const safeSeries = series.filter(c => !c.isAdult || isAdultUnlocked || !pin);
    const groupMap = safeSeries.reduce((acc, s) => {
      const g = s.group || 'Unknown';
      if (!acc[g]) acc[g] = [];
      acc[g].push(s);
      return acc;
    }, {} as Record<string, Series[]>);

    return Object.keys(groupMap).sort().map(title => ({ title, data: groupMap[title] }));
  }, [series, isAdultUnlocked, pin]);

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

  const selectedSeries = useMemo(() => {
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
                <TouchableOpacity
                  style={[
                    styles.categoryItem,
                    isSelected ? { backgroundColor: 'rgba(0, 122, 255, 0.4)' } : {}
                  ]}
                  onPress={() => handleGroupSelect(item.title)}
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
      )}

      {/* Main Content - Series Grid */}
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
        {selectedSeries.length > 0 ? (
          <FlatList
            data={selectedSeries}
            keyExtractor={(item) => item.id}
            numColumns={numColumns}
            key={numColumns} // Force re-render if columns change
            contentContainerStyle={styles.gridContainer}
            initialNumToRender={12}
            maxToRenderPerBatch={12}
            windowSize={5}
            removeClippedSubviews={true}
            renderItem={({ item }) => {
                const isFocused = focusedSeriesId === item.id;
                return (
                  <TouchableOpacity
                    style={[
                        styles.posterContainer,
                        isFocused ? { transform: [{ scale: 1.05 }], zIndex: 1 } : {}
                    ]}
                    onPress={() => navigation.navigate('MediaInfo', { id: item.id, type: 'series', title: item.name, cover: item.cover })}
                    onFocus={() => setFocusedSeriesId(item.id)}
                    onBlur={() => setFocusedSeriesId(null)}
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
            <Text style={{ color: '#AAA' }}>No series available</Text>
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

export default SeriesList;
