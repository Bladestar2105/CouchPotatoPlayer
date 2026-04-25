import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useIPTVLibrary, useIPTVPlayback } from '../context/IPTVContext';
import { useSettings } from '../context/SettingsContext';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App';
import { isTV as isTVPlatform } from '../utils/platform';
import { radii, spacing, typography } from '../theme/tokens';
import { useTranslation } from 'react-i18next';
import { getEpgKeyForChannel } from '../utils/channelListBehavior';

const defaultLogo = require('../assets/character_logo.png');
// Format a scheduled EPG start time in the user's locale for the result row.
const EPG_TIME_FORMATTER = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

type SearchScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

type ContentRef = { focusFirstItem: () => void; handleBack?: () => boolean };

const SearchScreen = forwardRef<ContentRef>((_props, ref) => {
  const { channels, movies, series, epg } = useIPTVLibrary();
  const { playStream } = useIPTVPlayback();
  const { colors } = useSettings();
  const { t } = useTranslation();
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

    // EPG programs: only look at the upcoming 24 h window so the search stays
    // fast on large catalogues. Past programs are deliberately excluded to
    // avoid cluttering the list with unplayable items (catchup playback from
    // search would need a separate navigation path); users who want to catch
    // up can still use the EPG grid directly. Title match only (not
    // description) keeps each comparison to one `.includes` call.
    if (results.length < MAX_RESULTS) {
      const nowMs = Date.now();
      const horizonMs = nowMs + 24 * 60 * 60 * 1000;
      for (let i = 0; i < channels.length; i++) {
        if (results.length >= MAX_RESULTS) break;
        const channel = channels[i];
        const key = getEpgKeyForChannel(channel);
        const programs = epg[key];
        if (!programs || programs.length === 0) continue;
        for (let j = 0; j < programs.length; j++) {
          if (results.length >= MAX_RESULTS) break;
          const prog = programs[j];
          if (prog.end <= nowMs) continue; // already finished
          if (prog.start > horizonMs) break; // list is sorted: everything after is out of window
          if (prog.title.toLowerCase().includes(lowerQuery)) {
            results.push({
              id: `${channel.id}:${prog.start}`,
              mediaType: 'epg',
              channelId: channel.id,
              channelUrl: channel.url,
              channelName: channel.name,
              channelLogo: channel.logo,
              programTitle: prog.title,
              programStart: prog.start,
              // Fields below are populated for rendering parity with other result types.
              name: prog.title,
              logo: channel.logo,
            });
          }
        }
      }
    }

    return results;
  }, [debouncedQuery, channels, movies, series, epg]);

  const handleItemPress = React.useCallback((item: any) => {
    if (item.mediaType === 'live') {
      playStream({ url: item.url, id: item.id });
      navigation.navigate('Player');
    } else if (item.mediaType === 'series') {
      // @ts-ignore - Route dynamically registered in App.tsx
      navigation.navigate('MediaInfo', { id: item.id, type: 'series', title: item.name, cover: item.cover });
    } else if (item.mediaType === 'movie') {
      // @ts-ignore
      navigation.navigate('MediaInfo', { id: item.id, type: 'vod', title: item.name, cover: item.cover, streamUrl: item.streamUrl });
    } else if (item.mediaType === 'epg') {
      // Tapping an upcoming EPG program jumps to the channel's live stream.
      // Going to the exact program start is only meaningful once it airs,
      // so "open the channel" is the most predictable behaviour today.
      playStream({ url: item.channelUrl, id: item.channelId });
      navigation.navigate('Player');
    }
  }, [navigation, playStream]);

  // ⚡ Bolt: Memoize renderItem to prevent recreating it on every keystroke,
  // which was forcing the FlatList to re-render all visible items.
  const renderItem = React.useCallback(({ item }: { item: any }) => {
    const cover = item.logo || item.cover || item.stream_icon;
    const typeLabel = item.mediaType === 'live'
      ? t('search.resultLiveTv')
      : item.mediaType === 'series'
        ? t('series')
        : item.mediaType === 'epg'
          ? t('search.resultEpg', {
              channel: item.channelName,
              time: EPG_TIME_FORMATTER.format(item.programStart),
            })
          : t('movies');

    return (
      <TouchableOpacity
        style={[styles.item, { borderBottomColor: colors.divider }]}
        onPress={() => handleItemPress(item)}
        accessibilityRole="button"
        accessibilityLabel={t('search.selectResultA11y', { name: item.name })}
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
          <Text style={[styles.type, { color: colors.textSecondary }]} numberOfLines={1}>
            {typeLabel}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }, [colors.divider, colors.card, colors.text, colors.textSecondary, handleItemPress, t]);

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
            accessibilityLabel={t('search.searchInputA11y')}
            onFocus={() => {
              setIsActivatorFocused(true);
            }}
            onBlur={() => setIsActivatorFocused(false)}
            onPress={() => inputRef.current?.focus()}
          >
            <Text style={{ color: query ? colors.text : colors.textSecondary }} numberOfLines={1}>
              {query || t('search.placeholder')}
            </Text>
          </TouchableOpacity>
        )}
        <TextInput
          ref={inputRef}
          style={[styles.input, { color: colors.text }, isTV && styles.tvHiddenInput]}
          placeholder={t('search.placeholderWithEpg')}
          placeholderTextColor={colors.textSecondary}
          accessibilityLabel={t('search.searchQueryA11y')}
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
          <TouchableOpacity onPress={() => setQuery('')} style={styles.clearBtn} accessibilityRole="button" accessibilityLabel={t('search.clearQueryA11y')}>
            <Text style={{ color: colors.textSecondary }}>{t('clear')}</Text>
          </TouchableOpacity>
        )}
      </View>

      {query.length === 0 ? (
        <View style={styles.center}>
          <Text style={{ color: colors.textSecondary }}>{t('search.typeToSearch')}</Text>
        </View>
      ) : searchResults.length === 0 ? (
        <View style={styles.center}>
          <Text style={{ color: colors.textSecondary }}>{t('search.noResults')}</Text>
        </View>
      ) : (
        <FlatList
          data={searchResults}
          renderItem={renderItem}
          keyExtractor={(item) => `${item.mediaType}:${String(item.id)}`}
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
    padding: spacing.lg,
    borderBottomWidth: 1,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: typography.body.fontSize,
    paddingHorizontal: spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: radii.lg - 2,
    marginRight: spacing.sm + 2,
  },
  clearBtn: {
    padding: spacing.md,
    borderRadius: radii.md - 2,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  tvSearchActivator: {
    flex: 1,
    height: 48,
    borderRadius: radii.lg - 2,
    borderWidth: 1.5,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    marginRight: spacing.sm + 2,
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
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderRadius: radii.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm - 2,
  },
  logoContainer: {
    width: 52,
    height: 52,
    borderRadius: radii.md,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  logo: {
    width: '100%',
    height: '100%',
    borderRadius: radii.md - 2,
  },
  info: {
    flex: 1,
    marginLeft: spacing.md + 2,
  },
  name: {
    fontWeight: '600',
    fontSize: typography.body.fontSize,
    letterSpacing: 0.2,
  },
  type: {
    fontSize: 12,
    marginTop: spacing.xs + 1,
    fontWeight: '500',
  },
});

export default SearchScreen;
