import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, Image, Pressable } from 'react-native';
import { useIPTVLibrary, useIPTVPlayback } from '../context/IPTVContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App';
import { isTV as isTVPlatform } from '../utils/platform';
import { colors, radii, spacing, typography } from '../theme/tokens';
import { FocusableCard } from '../components/Focusable';
import { useTranslation } from 'react-i18next';
import { Search as SearchIcon, X as XIcon } from 'lucide-react-native';
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
  const { accent } = useTheme();
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
    const MAX_RESULTS = 100;

    for (let i = 0; i < channels.length; i++) {
      if (results.length >= MAX_RESULTS) break;
      if (channels[i].name.toLowerCase().includes(lowerQuery)) {
        results.push({ ...channels[i], mediaType: 'live' });
      }
    }

    if (results.length < MAX_RESULTS) {
      for (let i = 0; i < movies.length; i++) {
        if (results.length >= MAX_RESULTS) break;
        if (movies[i].name.toLowerCase().includes(lowerQuery)) {
          results.push({ ...movies[i], mediaType: 'movie' });
        }
      }
    }

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
      <FocusableCard
        style={styles.item}
        onSelect={() => handleItemPress(item)}
        accessibilityRole="button"
        accessibilityLabel={t('search.selectResultA11y', { name: item.name })}
      >
        <View style={styles.logoContainer}>
          <Image
            style={styles.logo}
            source={cover ? { uri: cover } : defaultLogo}
            defaultSource={defaultLogo}
            resizeMode="contain"
          />
        </View>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
          <Text style={styles.type} numberOfLines={1}>{typeLabel}</Text>
        </View>
      </FocusableCard>
    );
  }, [handleItemPress, t]);

  return (
    <View style={styles.container}>
      <View style={styles.searchBarContainer}>
        <View style={[styles.searchField, isActivatorFocused && { borderColor: accent }]}>
          <SearchIcon size={18} color={colors.textDim} />
          {isTV ? (
            <TouchableOpacity
              ref={searchFieldFocusRef}
              style={styles.tvSearchActivator}
              isTVSelectable={true}
              hasTVPreferredFocus={shouldFocusSearchField}
              accessibilityRole="button"
              accessibilityLabel={t('search.searchInputA11y')}
              onFocus={() => setIsActivatorFocused(true)}
              onBlur={() => setIsActivatorFocused(false)}
              onPress={() => inputRef.current?.focus()}
            >
              <Text style={{ color: query ? colors.text : colors.textMuted, fontSize: 16 }} numberOfLines={1}>
                {query || t('search.placeholderWithEpg')}
              </Text>
            </TouchableOpacity>
          ) : null}
          <TextInput
            ref={inputRef}
            style={[styles.input, isTV && styles.tvHiddenInput]}
            placeholder={t('search.placeholderWithEpg')}
            placeholderTextColor={colors.textMuted}
            accessibilityLabel={t('search.searchQueryA11y')}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            selectionColor={accent}
            tvFocusable={true}
            isTVSelectable={true}
            hasTVPreferredFocus={!isTV && shouldFocusSearchField}
            autoFocus={!isTV}
          />
          {query.length > 0 && (
            <Pressable
              onPress={() => setQuery('')}
              style={styles.clearBtn}
              accessibilityRole="button"
              accessibilityLabel={t('search.clearQueryA11y')}
            >
              <XIcon size={16} color={colors.textDim} />
            </Pressable>
          )}
        </View>
      </View>

      {query.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>{t('search.typeToSearch')}</Text>
        </View>
      ) : searchResults.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>{t('search.noResults')}</Text>
        </View>
      ) : (
        <FlatList
          data={searchResults}
          renderItem={renderItem}
          keyExtractor={(item) => `${item.mediaType}:${String(item.id)}`}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  searchBarContainer: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.sunken,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    height: 52,
    position: 'relative',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    paddingVertical: 0,
  },
  clearBtn: {
    padding: spacing.sm,
    borderRadius: radii.sm,
  },
  tvSearchActivator: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
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
    paddingHorizontal: spacing.xl,
  },
  emptyText: {
    ...typography.body,
    color: colors.textDim,
  },
  listContent: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    marginBottom: spacing.sm + 2,
    gap: spacing.md,
  },
  logoContainer: {
    width: 52,
    height: 52,
    borderRadius: radii.md,
    backgroundColor: colors.sunken,
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
    minWidth: 0,
  },
  name: {
    ...typography.subtitle,
    color: colors.text,
  },
  type: {
    ...typography.caption,
    color: colors.textDim,
    marginTop: 2,
  },
});

export default SearchScreen;
