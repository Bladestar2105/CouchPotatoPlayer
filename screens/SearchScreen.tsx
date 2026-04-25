import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, Image, Pressable, Alert } from 'react-native';
import { useIPTVLibrary, useIPTVPlayback, useIPTVProfiles } from '../context/IPTVContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App';
import { isTV as isTVPlatform } from '../utils/platform';
import { colors, radii, spacing, typography } from '../theme/tokens';
import { FocusableCard } from '../components/Focusable';
import { useTranslation } from 'react-i18next';
import { Search as SearchIcon, X as XIcon, Globe } from 'lucide-react-native';
import { getEpgKeyForChannel } from '../utils/channelListBehavior';
import { loadAllSearchSnapshots, type ProfileSearchSnapshot } from '../utils/searchSnapshot';

const defaultLogo = require('../assets/character_logo.png');
// Format a scheduled EPG start time in the user's locale for the result row.
const EPG_TIME_FORMATTER = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

type SearchScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

type ContentRef = { focusFirstItem: () => void; handleBack?: () => boolean };

type SearchResult = {
  resultKey: string;
  mediaType: 'live' | 'movie' | 'series' | 'epg';
  id: string;
  name: string;
  // Optional fields that depend on type:
  url?: string;
  cover?: string;
  logo?: string;
  streamUrl?: string;
  channelId?: string;
  channelUrl?: string;
  channelName?: string;
  channelLogo?: string;
  programTitle?: string;
  programStart?: number;
  // Provenance: the profile this result belongs to. When the result lives in
  // a non-active profile, the row shows a provider badge and tapping it
  // switches profile before navigating.
  __profileId: string;
  __profileName: string;
  __isCurrentProfile: boolean;
};

const SearchScreen = forwardRef<ContentRef>((_props, ref) => {
  const { channels, movies, series, epg } = useIPTVLibrary();
  const { playStream } = useIPTVPlayback();
  const { profiles, currentProfile, loadProfile } = useIPTVProfiles();
  const { accent, accentSoft } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<SearchScreenNavigationProp>();

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const inputRef = useRef<TextInput>(null);
  const searchFieldFocusRef = useRef<any>(null);
  const [shouldFocusSearchField, setShouldFocusSearchField] = useState(false);
  const [isActivatorFocused, setIsActivatorFocused] = useState(false);
  const isTV = isTVPlatform;

  const [snapshots, setSnapshots] = useState<ProfileSearchSnapshot[]>([]);
  // Default ON when more than one provider is configured. Single-provider
  // setups don't need the chip — the universal search is just the local one.
  const [includeAllProviders, setIncludeAllProviders] = useState(false);

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

  // Hydrate snapshots from disk when the screen is opened. Refresh
  // whenever the configured profile list changes so freshly-added
  // providers show up after their first library load.
  React.useEffect(() => {
    let cancelled = false;
    loadAllSearchSnapshots()
      .then((s) => {
        if (cancelled) return;
        setSnapshots(s);
      })
      .catch(() => { /* best-effort; the local-only search keeps working */ });
    return () => {
      cancelled = true;
    };
  }, [profiles.length]);

  // When the active profile finishes loading and the search persists a
  // fresh snapshot, the existing snapshots in memory are stale. Refresh
  // them on focus so cross-profile results pick up the latest data.
  React.useEffect(() => {
    if (!debouncedQuery) return;
    let cancelled = false;
    loadAllSearchSnapshots().then((s) => {
      if (!cancelled) setSnapshots(s);
    }).catch(() => { /* ignore */ });
    return () => { cancelled = true; };
  }, [debouncedQuery]);

  const hasMultipleProviders = profiles.length > 1;
  const universalActive = hasMultipleProviders && includeAllProviders;

  const searchResults = React.useMemo<SearchResult[]>(() => {
    if (!debouncedQuery) return [];

    const lowerQuery = debouncedQuery.toLowerCase();
    const results: SearchResult[] = [];
    const MAX_RESULTS = 100;
    const seen = new Set<string>();
    const push = (r: SearchResult) => {
      if (results.length >= MAX_RESULTS) return;
      if (seen.has(r.resultKey)) return;
      seen.add(r.resultKey);
      results.push(r);
    };

    const profileLabelFor = (profileId: string) => {
      if (currentProfile?.id === profileId) return currentProfile.name;
      const match = profiles.find((p) => p.id === profileId);
      return match?.name ?? '';
    };

    // ─── Active profile (live data) ────────────────────────────────────
    const activeProfileId = currentProfile?.id ?? '';
    const activeProfileName = currentProfile?.name ?? '';
    const tagActive = (mediaType: SearchResult['mediaType'], id: string): Pick<SearchResult, '__profileId' | '__profileName' | '__isCurrentProfile' | 'resultKey'> => ({
      __profileId: activeProfileId,
      __profileName: activeProfileName,
      __isCurrentProfile: true,
      resultKey: `${activeProfileId}:${mediaType}:${id}`,
    });

    for (let i = 0; i < channels.length; i += 1) {
      if (results.length >= MAX_RESULTS) break;
      if (channels[i].name.toLowerCase().includes(lowerQuery)) {
        const c = channels[i];
        push({
          ...tagActive('live', c.id),
          mediaType: 'live',
          id: c.id,
          name: c.name,
          url: c.url,
          logo: c.logo,
        });
      }
    }

    if (results.length < MAX_RESULTS) {
      for (let i = 0; i < movies.length; i += 1) {
        if (results.length >= MAX_RESULTS) break;
        if (movies[i].name.toLowerCase().includes(lowerQuery)) {
          const m = movies[i];
          push({
            ...tagActive('movie', m.id),
            mediaType: 'movie',
            id: m.id,
            name: m.name,
            cover: m.cover,
            streamUrl: m.streamUrl,
          });
        }
      }
    }

    if (results.length < MAX_RESULTS) {
      for (let i = 0; i < series.length; i += 1) {
        if (results.length >= MAX_RESULTS) break;
        if (series[i].name.toLowerCase().includes(lowerQuery)) {
          const s = series[i];
          push({
            ...tagActive('series', s.id),
            mediaType: 'series',
            id: s.id,
            name: s.name,
            cover: s.cover,
          });
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
      for (let i = 0; i < channels.length; i += 1) {
        if (results.length >= MAX_RESULTS) break;
        const channel = channels[i];
        const key = getEpgKeyForChannel(channel);
        const programs = epg[key];
        if (!programs || programs.length === 0) continue;
        for (let j = 0; j < programs.length; j += 1) {
          if (results.length >= MAX_RESULTS) break;
          const prog = programs[j];
          if (prog.end <= nowMs) continue; // already finished
          if (prog.start > horizonMs) break; // list is sorted: everything after is out of window
          if (prog.title.toLowerCase().includes(lowerQuery)) {
            push({
              ...tagActive('epg', `${channel.id}:${prog.start}`),
              mediaType: 'epg',
              id: `${channel.id}:${prog.start}`,
              name: prog.title,
              channelId: channel.id,
              channelUrl: channel.url,
              channelName: channel.name,
              channelLogo: channel.logo,
              programTitle: prog.title,
              programStart: prog.start,
              logo: channel.logo,
            });
          }
        }
      }
    }

    // ─── Other providers (snapshots) ───────────────────────────────────
    if (universalActive) {
      const nowMs = Date.now();
      for (const snapshot of snapshots) {
        if (results.length >= MAX_RESULTS) break;
        if (snapshot.profileId === activeProfileId) continue;
        const __profileId = snapshot.profileId;
        const __profileName = snapshot.profileName || profileLabelFor(snapshot.profileId);

        for (let i = 0; i < snapshot.channels.length; i += 1) {
          if (results.length >= MAX_RESULTS) break;
          const c = snapshot.channels[i];
          if (c.name.toLowerCase().includes(lowerQuery)) {
            push({
              resultKey: `${__profileId}:live:${c.id}`,
              mediaType: 'live',
              id: c.id,
              name: c.name,
              url: c.url,
              logo: c.logo,
              __profileId,
              __profileName,
              __isCurrentProfile: false,
            });
          }
        }

        if (results.length >= MAX_RESULTS) break;
        for (let i = 0; i < snapshot.movies.length; i += 1) {
          if (results.length >= MAX_RESULTS) break;
          const m = snapshot.movies[i];
          if (m.name.toLowerCase().includes(lowerQuery)) {
            push({
              resultKey: `${__profileId}:movie:${m.id}`,
              mediaType: 'movie',
              id: m.id,
              name: m.name,
              cover: m.cover,
              streamUrl: m.streamUrl,
              __profileId,
              __profileName,
              __isCurrentProfile: false,
            });
          }
        }

        if (results.length >= MAX_RESULTS) break;
        for (let i = 0; i < snapshot.series.length; i += 1) {
          if (results.length >= MAX_RESULTS) break;
          const s = snapshot.series[i];
          if (s.name.toLowerCase().includes(lowerQuery)) {
            push({
              resultKey: `${__profileId}:series:${s.id}`,
              mediaType: 'series',
              id: s.id,
              name: s.name,
              cover: s.cover,
              __profileId,
              __profileName,
              __isCurrentProfile: false,
            });
          }
        }

        if (results.length >= MAX_RESULTS) break;
        for (let i = 0; i < snapshot.upcomingEpg.length; i += 1) {
          if (results.length >= MAX_RESULTS) break;
          const prog = snapshot.upcomingEpg[i];
          if (prog.end <= nowMs) continue;
          if (prog.title.toLowerCase().includes(lowerQuery)) {
            push({
              resultKey: `${__profileId}:epg:${prog.channelId}:${prog.start}`,
              mediaType: 'epg',
              id: `${prog.channelId}:${prog.start}`,
              name: prog.title,
              channelId: prog.channelId,
              channelUrl: prog.channelUrl,
              channelName: prog.channelName,
              channelLogo: prog.channelLogo,
              programTitle: prog.title,
              programStart: prog.start,
              logo: prog.channelLogo,
              __profileId,
              __profileName,
              __isCurrentProfile: false,
            });
          }
        }
      }
    }

    return results;
  }, [debouncedQuery, channels, movies, series, epg, snapshots, universalActive, profiles, currentProfile]);

  const navigateForResult = React.useCallback((item: SearchResult) => {
    if (item.mediaType === 'live') {
      if (item.url && item.id) {
        playStream({ url: item.url, id: item.id });
        navigation.navigate('Player');
      }
    } else if (item.mediaType === 'series') {
      // @ts-ignore - dynamic route
      navigation.navigate('MediaInfo', { id: item.id, type: 'series', title: item.name, cover: item.cover });
    } else if (item.mediaType === 'movie') {
      // @ts-ignore - dynamic route
      navigation.navigate('MediaInfo', { id: item.id, type: 'vod', title: item.name, cover: item.cover, streamUrl: item.streamUrl });
    } else if (item.mediaType === 'epg') {
      if (item.channelUrl && item.channelId) {
        playStream({ url: item.channelUrl, id: item.channelId });
        navigation.navigate('Player');
      }
    }
  }, [navigation, playStream]);

  const handleItemPress = React.useCallback(async (item: SearchResult) => {
    // Same provider — open directly with existing flows.
    if (item.__isCurrentProfile) {
      navigateForResult(item);
      return;
    }
    // Cross-provider — confirm, then switch + navigate. The confirmation
    // makes the cost (full library reload) visible so the user isn't
    // surprised by a brief loading screen.
    const targetProfile = profiles.find((p) => p.id === item.__profileId);
    if (!targetProfile) {
      Alert.alert(t('error'), t('search.crossProfileMissing'));
      return;
    }

    Alert.alert(
      t('search.crossProfileTitle'),
      t('search.crossProfileMessage', { provider: item.__profileName, name: item.name }),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('search.crossProfileConfirm'),
          onPress: async () => {
            try {
              await loadProfile(targetProfile);
              // Defer the navigation so the active library has a beat to
              // populate before MediaInfo / Player tries to read it.
              setTimeout(() => navigateForResult(item), 250);
            } catch {
              Alert.alert(t('error'), t('welcome.errorLoadFailed'));
            }
          },
        },
      ],
    );
  }, [navigateForResult, profiles, loadProfile, t]);

  // ⚡ Bolt: Memoize renderItem to prevent recreating it on every keystroke,
  // which was forcing the FlatList to re-render all visible items.
  const renderItem = React.useCallback(({ item }: { item: SearchResult }) => {
    const cover = item.logo || item.cover;
    const typeLabel = item.mediaType === 'live'
      ? t('search.resultLiveTv')
      : item.mediaType === 'series'
        ? t('series')
        : item.mediaType === 'epg'
          ? t('search.resultEpg', {
              channel: item.channelName,
              time: item.programStart ? EPG_TIME_FORMATTER.format(item.programStart) : '',
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
          <View style={styles.metaRow}>
            <Text style={styles.type} numberOfLines={1}>{typeLabel}</Text>
            {!item.__isCurrentProfile ? (
              <View style={[styles.providerBadge, { borderColor: accent }]}>
                <Globe size={10} color={accent} />
                <Text style={[styles.providerBadgeText, { color: accent }]} numberOfLines={1}>
                  {item.__profileName}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </FocusableCard>
    );
  }, [handleItemPress, t, accent]);

  const universalChip = hasMultipleProviders ? (
    <Pressable
      onPress={() => setIncludeAllProviders((v) => !v)}
      style={[
        styles.universalChip,
        includeAllProviders && { backgroundColor: accentSoft, borderColor: accent },
      ]}
      accessibilityRole="switch"
      accessibilityState={{ checked: includeAllProviders }}
      accessibilityLabel={t('search.acrossAllProviders')}
    >
      <Globe size={14} color={includeAllProviders ? accent : colors.textDim} />
      <Text style={[
        styles.universalChipText,
        { color: includeAllProviders ? accent : colors.textDim },
      ]}>
        {t('search.acrossAllProviders')}
      </Text>
    </Pressable>
  ) : null;

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
        {universalChip ? (
          <View style={styles.chipRow}>{universalChip}</View>
        ) : null}
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
          keyExtractor={(item) => item.resultKey}
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
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm + 2,
  },
  universalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
  },
  universalChipText: {
    ...typography.caption,
    fontWeight: '600',
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
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  type: {
    ...typography.caption,
    color: colors.textDim,
  },
  providerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.pill,
    borderWidth: 1,
    maxWidth: 160,
  },
  providerBadgeText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
  },
});

export default SearchScreen;
