import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useIPTVLibrary, useIPTVPlayback } from '../context/IPTVContext';
import { useSettings } from '../context/SettingsContext';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App';
import { isTV as isTVPlatform } from '../utils/platform';

const defaultLogo = require('../assets/character_logo.png');

type SearchScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

type ContentRef = { focusFirstItem: () => void; handleBack?: () => boolean };

const SearchScreen = forwardRef<ContentRef>((props, ref) => {
  const { channels, movies, series } = useIPTVLibrary();
  const { playStream } = useIPTVPlayback();
  const { colors } = useSettings();
  const navigation = useNavigation<SearchScreenNavigationProp>();

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const inputRef = useRef<TextInput>(null);
  const searchFieldFocusRef = useRef<any>(null);
  const [shouldFocusSearchField, setShouldFocusSearchField] = useState(false);
  const [isActivatorFocused, setIsActivatorFocused] = useState(false);
  const isTV = isTVPlatform;

  useImperativeHandle(ref, () => ({
    focusFirstItem: () => {
      setShouldFocusSearchField(true);
      requestAnimationFrame(() => {
        searchFieldFocusRef.current?.focus?.();
      });
    },
    handleBack: () => {
      if (inputRef.current?.isFocused?.()) {
        inputRef.current.blur();
        return true;
      }
      return false;
    },
  }));

  React.useEffect(() => {
    if (!shouldFocusSearchField) return;
    const timer = setTimeout(() => setShouldFocusSearchField(false), 150);
    return () => clearTimeout(timer);
  }, [shouldFocusSearchField]);

  // ⚡ Bolt: Debounce search input to prevent heavy UI blocking on every keystroke
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => clearTimeout(handler);
  }, [query]);

  const searchResults = React.useMemo(() => {
    if (!debouncedQuery) return [];

    const lowerQuery = debouncedQuery.toLowerCase();
    const results: any[] = [];
    // ⚡ Bolt: Capping max results at 100 to avoid excessive memory and render costs on broad queries (e.g., "a")
    const MAX_RESULTS = 100;

    // ⚡ Bolt: Unified single-pass iterations instead of sequential .filter().map()
    // Live Channels
    for (let i = 0; i < channels.length; i++) {
      if (results.length >= MAX_RESULTS) break;
      if (channels[i].name.toLowerCase().includes(lowerQuery)) {
        results.push({ ...channels[i], mediaType: 'live' });
      }
    }

    // Movies
    if (results.length < MAX_RESULTS) {
      for (let i = 0; i < movies.length; i++) {
        if (results.length >= MAX_RESULTS) break;
        if (movies[i].name.toLowerCase().includes(lowerQuery)) {
          results.push({ ...movies[i], mediaType: 'movie' });
        }
      }
    }

    // Series
    if (results.length < MAX_RESULTS) {
      for (let i = 0; i < series.length; i++) {
        if (results.length >= MAX_RESULTS) break;
        if (series[i].name.toLowerCase().includes(lowerQuery)) {
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
        accessibilityRole="button"
        accessibilityLabel={`Select ${item.name}`}
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
        {isTV && (
          <TouchableOpacity
            ref={searchFieldFocusRef}
            style={[
              styles.tvSearchActivator,
              { borderColor: isActivatorFocused ? colors.primary : colors.divider, backgroundColor: colors.background },
            ]}
            isTVSelectable={true}
            hasTVPreferredFocus={shouldFocusSearchField}
            accessibilityRole="button"
            accessibilityLabel="Search input"
            onFocus={() => {
              setIsActivatorFocused(true);
            }}
            onBlur={() => setIsActivatorFocused(false)}
            onPress={() => inputRef.current?.focus()}
          >
            <Text style={{ color: query ? colors.text : colors.textSecondary }} numberOfLines={1}>
              {query || 'Search channels, movies, series...'}
            </Text>
          </TouchableOpacity>
        )}
        <TextInput
          ref={inputRef}
          style={[styles.input, { color: colors.text }, isTV && styles.tvHiddenInput]}
          placeholder="Search channels, movies, series..."
          placeholderTextColor={colors.textSecondary}
          accessibilityLabel="Search query"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          tvFocusable={true}
          isTVSelectable={true}
          hasTVPreferredFocus={!isTV && shouldFocusSearchField}
          autoFocus={!isTV}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} style={styles.clearBtn} accessibilityRole="button" accessibilityLabel="Clear search query">
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
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    marginRight: 10,
  },
  clearBtn: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  tvSearchActivator: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginRight: 10,
  },
  tvHiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0.01,
    right: 0,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  item: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderRadius: 12,
    marginHorizontal: 12,
    marginBottom: 6,
  },
  logoContainer: {
    width: 52,
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  logo: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  info: {
    flex: 1,
    marginLeft: 14,
  },
  name: {
    fontWeight: '600',
    fontSize: 16,
    letterSpacing: 0.2,
  },
  type: {
    fontSize: 12,
    marginTop: 5,
    fontWeight: '500',
  },
});

export default SearchScreen;
