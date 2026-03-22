import React, { useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, Image, Platform } from 'react-native';
import { useIPTV } from '../context/IPTVContext';
import { useSettings } from '../context/SettingsContext';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App';

const defaultLogo = require('../assets/icon.png');

type SearchScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

const SearchScreen = () => {
  const { channels, movies, series, playStream } = useIPTV();
  const { colors } = useSettings();
  const navigation = useNavigation<SearchScreenNavigationProp>();

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // ⚡ Bolt: Debounce search input to prevent heavy UI blocking on every keystroke
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => clearTimeout(handler);
  }, [query]);

  const searchResults = React.useMemo(() => {
    if (!debouncedQuery) return [];

    // ⚡ Bolt: Escape regex special characters to prevent SyntaxError on query injection
    const escapedQuery = debouncedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // ⚡ Bolt: Case-insensitive regex for faster searching without creating new strings
    const regex = new RegExp(escapedQuery, 'i');
    const results: any[] = [];
    // ⚡ Bolt: Capping max results at 100 to avoid excessive memory and render costs on broad queries (e.g., "a")
    const MAX_RESULTS = 100;

    // ⚡ Bolt: Unified single-pass iterations with cached lengths and regex
    // Live Channels
    for (let i = 0, len = channels.length; i < len; i++) {
      if (results.length >= MAX_RESULTS) break;
      if (regex.test(channels[i].name)) {
        results.push({ ...channels[i], mediaType: 'live' });
      }
    }

    // Movies
    if (results.length < MAX_RESULTS) {
      for (let i = 0, len = movies.length; i < len; i++) {
        if (results.length >= MAX_RESULTS) break;
        if (regex.test(movies[i].name)) {
          results.push({ ...movies[i], mediaType: 'movie' });
        }
      }
    }

    // Series
    if (results.length < MAX_RESULTS) {
      for (let i = 0, len = series.length; i < len; i++) {
        if (results.length >= MAX_RESULTS) break;
        if (regex.test(series[i].name)) {
          results.push({ ...series[i], mediaType: 'series' });
        }
      }
    }

    return results;
  }, [debouncedQuery, channels, movies, series]);

  const handleItemPress = (item: any) => {
    if (item.mediaType === 'live') {
      playStream({ url: item.url, id: item.id });
      navigation.navigate('Player');
    } else if (item.mediaType === 'series') {
      // @ts-ignore - Route dynamically registered in App.tsx
      navigation.navigate('MediaInfo', { id: item.id, type: 'series', title: item.name, cover: item.cover });
    } else if (item.mediaType === 'movie') {
      // @ts-ignore
      navigation.navigate('MediaInfo', { id: item.id, type: 'vod', title: item.name, cover: item.cover, streamUrl: item.streamUrl });
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const cover = item.logo || item.cover || item.stream_icon;

    return (
      <TouchableOpacity
        style={[styles.item, { borderBottomColor: colors.divider }]}
        onPress={() => handleItemPress(item)}
      >
        <View style={[styles.logoContainer, { backgroundColor: colors.card }]}>
          <Image
            style={styles.logo}
            source={cover ? { uri: cover } : defaultLogo}
            defaultSource={defaultLogo}
            resizeMode="contain"
          />
        </View>
        <View style={styles.info}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={[styles.type, { color: colors.textSecondary }]}>
            {item.mediaType === 'live' ? 'Live TV' : item.mediaType === 'series' ? 'Series' : 'Movie'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.searchBarContainer, { backgroundColor: colors.surface, borderBottomColor: colors.divider }]}>
        <TextInput
          style={[styles.input, { color: colors.text }]}
          placeholder="Search channels, movies, series..."
          placeholderTextColor={colors.textSecondary}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          tvFocusable={true}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} style={styles.clearBtn}>
            <Text style={{ color: colors.textSecondary }}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {query.length === 0 ? (
        <View style={styles.center}>
          <Text style={{ color: colors.textSecondary }}>Type to search...</Text>
        </View>
      ) : searchResults.length === 0 ? (
        <View style={styles.center}>
          <Text style={{ color: colors.textSecondary }}>No results found</Text>
        </View>
      ) : (
        <FlatList
          data={searchResults}
          renderItem={renderItem}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
  },
  input: {
    flex: 1,
    height: 40,
    fontSize: 16,
    paddingHorizontal: 10,
  },
  clearBtn: {
    padding: 10,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  item: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  logoContainer: {
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  type: {
    fontSize: 12,
    marginTop: 4,
  },
});

export default SearchScreen;
