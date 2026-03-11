import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, ActivityIndicator, Image, Platform, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Search, Tv, Clock, X } from 'lucide-react-native';
import { ChannelLogo } from '../components/ChannelLogo';
import { useAppStore } from '../store';
import { LiveChannel } from '../types/iptv';
import { XtreamService } from '../services/xtream';
import { isTV, isMobile, gridColumns } from '../utils/platform';
import { SafeAreaView } from 'react-native-safe-area-context';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Search'>;
type FilterType = 'all' | 'live' | 'vod' | 'series';

export const SearchScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { t } = useTranslation();
  const config = useAppStore(state => state.config);

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [results, setResults] = useState<LiveChannel[]>([]);
  const [loading, setLoading] = useState(false);
  const [numColumns, setNumColumns] = useState(gridColumns());
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  // TV focus states
  const [focusedFilter, setFocusedFilter] = useState<FilterType | null>(null);

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', () => {
      setNumColumns(gridColumns());
    });
    return () => sub?.remove();
  }, []);

  useEffect(() => {
    const fetchResults = async () => {
      if (!config || query.length < 3) {
        setResults([]);
        return;
      }

      setLoading(true);
      // Save to search history
      setSearchHistory(prev => {
        const newHistory = [query, ...prev.filter(h => h !== query)].slice(0, 10);
        return newHistory;
      });
      try {
        if (config.type === 'xtream') {
          const xtream = new XtreamService(config);
          let allResults: LiveChannel[] = [];

          if (filter === 'all' || filter === 'live') {
            const live = await xtream.getLiveStreams();
            const filteredLive = live.filter(c => (c.name || c.title || '').toLowerCase().includes(query.toLowerCase()));
            allResults = [...allResults, ...filteredLive.map(c => ({...c, _type: 'live'} as any))];
          }
          if (filter === 'all' || filter === 'vod') {
            const vod = await xtream.getVodStreams();
            const filteredVod = vod.filter(c => (c.name || c.title || '').toLowerCase().includes(query.toLowerCase()));
            allResults = [...allResults, ...filteredVod.map(c => ({...c, _type: 'vod'} as any))];
          }
          if (filter === 'all' || filter === 'series') {
            const series = await xtream.getSeries();
            const filteredSeries = series.filter(c => (c.name || c.title || '').toLowerCase().includes(query.toLowerCase()));
            allResults = [...allResults, ...filteredSeries.map(c => ({...c, _type: 'series'} as any))];
          }
          setResults(allResults);
        } else if (config.type === 'm3u') {
          const storeChannels = useAppStore.getState().channels;
          if (storeChannels && storeChannels.length > 0) {
            const filtered = storeChannels.filter(c => (c.name || c.title || '').toLowerCase().includes(query.toLowerCase()));
            setResults(filtered);
          }
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(() => {
      fetchResults();
    }, 500);

    return () => clearTimeout(debounce);
  }, [query, filter, config]);

  const handleChannelPress = (channel: any) => {
    let activeTab = channel._type || 'live';
    let extension = 'm3u8';

    if (activeTab === 'live' && channel.stream_type === 'live') {
      extension = 'm3u8';  // HLS for ALL platforms
    } else if (activeTab === 'vod' || activeTab === 'series') {
      extension = channel.container_extension || 'mp4';
    }

    if (activeTab === 'vod' || activeTab === 'series') {
      navigation.navigate('MediaInfo', {
        id: activeTab === 'series' ? (channel.series_id as number) : channel.stream_id,
        type: activeTab,
        title: channel.title || channel.name,
        cover: channel.cover || channel.stream_icon,
        extension: extension,
      });
    } else {
      navigation.navigate('LivePlayer', {
        channelId: channel.stream_id,
        channelName: channel.title || channel.name,
        extension: extension,
        directSource: channel.direct_source,
        type: 'live',
      });
    }
  };

  const renderChannel = ({ item }: { item: any }) => {
    if (isMobile) {
      return (
        <TouchableOpacity
          style={mStyles.channelCard}
          onPress={() => handleChannelPress(item)}
          activeOpacity={0.7}
        >
          <View style={mStyles.channelImageContainer}>
            {(item.stream_icon || item.cover) ? (
              <Image
                source={{ uri: item.stream_icon || item.cover }}
                style={mStyles.channelIcon}
                resizeMode="cover"
              />
            ) : (
              <ChannelLogo
                name={item.title || item.name || 'CH'}
                size={48}
                borderRadius={8}
              />
            )}
          </View>
          <Text style={mStyles.channelName} numberOfLines={2}>
            {item.title || item.name}
          </Text>
          <Text style={mStyles.channelType} numberOfLines={1}>
            {item._type ? item._type.toUpperCase() : 'UNKNOWN'}
          </Text>
        </TouchableOpacity>
      );
    }

    // TV card
    return (
      <TouchableOpacity
        style={styles.channelCard}
        onPress={() => handleChannelPress(item)}
      >
        <View style={styles.channelImageContainer}>
          {(item.stream_icon || item.cover) ? (
            <Image
              source={{ uri: item.stream_icon || item.cover }}
              style={styles.channelIcon}
              resizeMode="contain"
            />
          ) : (
            <Tv size={48} color="#444" />
          )}
        </View>
        <Text style={styles.channelName} numberOfLines={2}>
          {item.title || item.name}
        </Text>
        <Text style={styles.channelType} numberOfLines={1}>
          {item._type ? item._type.toUpperCase() : 'UNKNOWN'}
        </Text>
      </TouchableOpacity>
    );
  };

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'live', label: 'Live TV' },
    { key: 'vod', label: 'Movies' },
    { key: 'series', label: 'Series' },
  ];

  const Wrapper = isMobile ? SafeAreaView : View;
  const wrapperProps = isMobile ? { edges: ['top'] as const, style: mStyles.container } : { style: styles.container };

  return (
    <Wrapper {...wrapperProps}>
      {/* Header */}
      <View style={isMobile ? mStyles.header : styles.header}>
        {/* Back button – only show on TV or when not inside bottom tabs */}
        {isTV && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={t('common.back') || 'Go back'}
          >
            <ChevronLeft size={32} color="#FFF" />
          </TouchableOpacity>
        )}

        <View style={isMobile ? mStyles.searchContainer : styles.searchContainer}>
          <Search size={isMobile ? 20 : 24} color="#888" style={isMobile ? mStyles.searchIcon : styles.searchIcon} />
          <TextInput
            style={isMobile ? mStyles.searchInput : styles.searchInput}
            placeholder={t('sidebar.search') + "..."}
            placeholderTextColor="#888"
            value={query}
            onChangeText={setQuery}
            autoFocus={!isTV}
          />
        </View>
      </View>

      {/* Filters */}
      <View style={isMobile ? mStyles.filtersContainer : styles.filtersContainer}>
        {filters.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[
              isMobile ? mStyles.filterButton : styles.filterButton,
              filter === f.key && (isMobile ? mStyles.filterButtonSelected : styles.filterButtonSelected),
              ...(isTV && focusedFilter === f.key ? [styles.filterButtonFocused] : []),
            ]}
            {...(isTV ? {
              onFocus: () => setFocusedFilter(f.key),
              onBlur: () => setFocusedFilter(null),
            } : {})}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[
              isMobile ? mStyles.filterText : styles.filterText,
              (filter === f.key || focusedFilter === f.key) && (isMobile ? mStyles.filterTextSelected : styles.filterTextSelected),
            ]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Results */}
      <View style={styles.resultsContainer}>
        {loading ? (
          <ActivityIndicator size="large" color="#007AFF" />
        ) : query.length === 0 && searchHistory.length > 0 ? (
          <View style={isMobile ? mStyles.historyContainer : styles.resultsContainer}>
            <Text style={isMobile ? mStyles.historyTitle : styles.emptyText}>Recent Searches</Text>
            {searchHistory.map((h, i) => (
              <TouchableOpacity
                key={`hist-${i}`}
                style={isMobile ? mStyles.historyItem : styles.filterButton}
                onPress={() => setQuery(h)}
              >
                <Clock size={14} color="#888" />
                <Text style={isMobile ? mStyles.historyText : styles.filterText}>{h}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : query.length > 0 && query.length < 3 ? (
          <Text style={isMobile ? mStyles.emptyText : styles.emptyText}>Type at least 3 characters to search...</Text>
        ) : results.length === 0 && query.length >= 3 ? (
          <Text style={isMobile ? mStyles.emptyText : styles.emptyText}>No results found.</Text>
        ) : (
          <FlatList
            key={`search-grid-${numColumns}`}
            data={results}
            keyExtractor={(item, index) => `${item.stream_id || item.series_id || index}`}
            renderItem={renderChannel}
            numColumns={numColumns}
            columnWrapperStyle={isMobile ? mStyles.channelsRow : styles.channelsRow}
            contentContainerStyle={isMobile ? mStyles.channelsList : styles.channelsList}
          />
        )}
      </View>
    </Wrapper>
  );
};

// ── TV styles (original) ──────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: 30,
    paddingBottom: 20,
    backgroundColor: '#1C1C1E',
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  backButton: {
    marginRight: 20,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
    borderRadius: 10,
    paddingHorizontal: 15,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#FFF',
    fontSize: 20,
    paddingVertical: 15,
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: 30,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  filterButton: {
    paddingHorizontal: 25,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#1C1C1E',
    marginRight: 15,
  },
  filterButtonSelected: {
    backgroundColor: '#2C2C2E',
  },
  filterButtonFocused: {
    backgroundColor: '#007AFF',
  },
  filterText: {
    color: '#888',
    fontSize: 16,
    fontWeight: '600',
  },
  filterTextSelected: {
    color: '#FFF',
  },
  resultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#888',
    fontSize: 18,
  },
  channelsList: {
    padding: 30,
  },
  channelsRow: {
    justifyContent: 'flex-start',
    marginBottom: 30,
  },
  channelCard: {
    width: '23%',
    marginRight: '2.6%',
    backgroundColor: '#1C1C1E',
    borderRadius: 15,
    padding: 15,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  channelImageContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#2C2C2E',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    overflow: 'hidden',
  },
  channelIcon: {
    width: '100%',
    height: '100%',
  },
  channelName: {
    color: '#FFF',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: 5,
  },
  channelType: {
    color: '#007AFF',
    fontSize: 12,
    fontWeight: 'bold',
  }
});

// ── Mobile styles ─────────────────────────────────────────────────
const mStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1C1C1E',
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#FFF',
    fontSize: 16,
    paddingVertical: 12,
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1C1C1E',
  },
  filterButtonSelected: {
    backgroundColor: '#007AFF',
  },
  filterText: {
    color: '#888',
    fontSize: 13,
    fontWeight: '600',
  },
  filterTextSelected: {
    color: '#FFF',
  },
  emptyText: {
    color: '#888',
    fontSize: 15,
  },
  channelsList: {
    padding: 12,
  },
  channelsRow: {
    justifyContent: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  channelCard: {
    flex: 1,
    maxWidth: '48%',
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
  },
  channelImageContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  channelIcon: {
    width: '100%',
    height: '100%',
  },
  channelName: {
    color: '#FFF',
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '500',
    padding: 8,
    paddingBottom: 2,
  },
  channelType: {
    color: '#007AFF',
    fontSize: 11,
    fontWeight: 'bold',
    paddingBottom: 8,
  },
  historyContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  historyTitle: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2C2C2E',
    gap: 10,
  },
  historyText: {
    color: '#CCC',
    fontSize: 15,
  },
});