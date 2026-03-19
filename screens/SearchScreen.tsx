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

  const searchResults = React.useMemo(() => {
    if (!query) return [];

    const lowerQuery = query.toLowerCase();

    const matchedChannels = channels
      .filter(c => c.name.toLowerCase().includes(lowerQuery))
      .map(c => ({ ...c, mediaType: 'live' }));

    const matchedMovies = movies
      .filter(m => m.name.toLowerCase().includes(lowerQuery))
      .map(m => ({ ...m, mediaType: 'movie' }));

    const matchedSeries = series
      .filter(s => s.name.toLowerCase().includes(lowerQuery))
      .map(s => ({ ...s, mediaType: 'series' }));

    return [...matchedChannels, ...matchedMovies, ...matchedSeries];
  }, [query, channels, movies, series]);

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
          autoFocus={true}
          autoCapitalize="none"
          autoCorrect={false}
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
