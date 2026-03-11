import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, ActivityIndicator, Image, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Search, Tv } from 'lucide-react-native';
import { useAppStore } from '../store';
import { LiveChannel } from '../types/iptv';
import { XtreamService } from '../services/xtream';

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

  // Focus states
  const [focusedFilter, setFocusedFilter] = useState<FilterType | null>(null);

  useEffect(() => {
    const fetchResults = async () => {
      if (!config || query.length < 3) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        if (config.type === 'xtream') {
          const xtream = new XtreamService(config);
          let allResults: LiveChannel[] = [];

          if (filter === 'all' || filter === 'live') {
            // Very naive search: Xtream API doesn't have a global search endpoint.
            // In a real app we'd need to cache all streams or have a specific server-side search.
            // For now we simulate by fetching a few categories or just telling the user it's limited.
            // Wait, we can fetch all channels if categoryId is omitted, but it might be massive.
            // Let's assume XtreamService.getLiveStreams() returns all if no category is passed.
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
          // M3U logic is local and synchronous if stored in the store, but we might not have all channels here unless loaded.
          // Fallback empty for now or rely on store channels.
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
      extension = Platform.OS === 'web' || Platform.OS === 'ios' ? 'm3u8' : 'ts';
    } else if (activeTab === 'vod' || activeTab === 'series') {
      extension = channel.container_extension || 'mp4';
    }

    navigation.navigate('LivePlayer', {
      channelId: activeTab === 'series' ? (channel.series_id as number) : channel.stream_id,
      channelName: channel.title || channel.name,
      extension: extension,
      directSource: channel.direct_source,
      type: activeTab
    });
  };

  const renderChannel = ({ item }: { item: any }) => {
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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={t('common.back') || 'Go back'}
        >
          <ChevronLeft size={32} color="#FFF" />
        </TouchableOpacity>

        <View style={styles.searchContainer}>
          <Search size={24} color="#888" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('sidebar.search') + "..."}
            placeholderTextColor="#888"
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.filterButtonSelected, focusedFilter === 'all' && styles.filterButtonFocused]}
          onFocus={() => setFocusedFilter('all')}
          onBlur={() => setFocusedFilter(null)}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, (filter === 'all' || focusedFilter === 'all') && styles.filterTextSelected]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'live' && styles.filterButtonSelected, focusedFilter === 'live' && styles.filterButtonFocused]}
          onFocus={() => setFocusedFilter('live')}
          onBlur={() => setFocusedFilter(null)}
          onPress={() => setFilter('live')}
        >
          <Text style={[styles.filterText, (filter === 'live' || focusedFilter === 'live') && styles.filterTextSelected]}>Live TV</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'vod' && styles.filterButtonSelected, focusedFilter === 'vod' && styles.filterButtonFocused]}
          onFocus={() => setFocusedFilter('vod')}
          onBlur={() => setFocusedFilter(null)}
          onPress={() => setFilter('vod')}
        >
          <Text style={[styles.filterText, (filter === 'vod' || focusedFilter === 'vod') && styles.filterTextSelected]}>Movies</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'series' && styles.filterButtonSelected, focusedFilter === 'series' && styles.filterButtonFocused]}
          onFocus={() => setFocusedFilter('series')}
          onBlur={() => setFocusedFilter(null)}
          onPress={() => setFilter('series')}
        >
          <Text style={[styles.filterText, (filter === 'series' || focusedFilter === 'series') && styles.filterTextSelected]}>Series</Text>
        </TouchableOpacity>
      </View>

      {/* Results */}
      <View style={styles.resultsContainer}>
        {loading ? (
          <ActivityIndicator size="large" color="#007AFF" />
        ) : query.length > 0 && query.length < 3 ? (
          <Text style={styles.emptyText}>Type at least 3 characters to search...</Text>
        ) : results.length === 0 && query.length >= 3 ? (
          <Text style={styles.emptyText}>No results found.</Text>
        ) : (
          <FlatList
            data={results}
            keyExtractor={(item, index) => `${item.stream_id || item.series_id || index}`}
            renderItem={renderChannel}
            numColumns={4}
            columnWrapperStyle={styles.channelsRow}
            contentContainerStyle={styles.channelsList}
          />
        )}
      </View>
    </View>
  );
};

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
