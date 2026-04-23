import React, { useMemo, useState, useEffect, forwardRef, useImperativeHandle, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList, Platform, InteractionManager, useWindowDimensions } from 'react-native';
import { useIPTVAppState, useIPTVCollections, useIPTVGuide, useIPTVLibrary, useIPTVParental, useIPTVPlayback } from '../context/IPTVContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Channel } from '../types';
import { useSettings } from '../context/SettingsContext';
import { isProgramCatchupAvailable } from '../utils/catchupUtils';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { findCurrentProgramIndex, findNextProgramIndex } from '../utils/epgUtils';
import { ChannelLogo } from './ChannelLogo';
import EpgTimeline from './EpgTimeline';
import { isTV as isTVPlatform } from '../utils/platform';
import { useTranslation } from 'react-i18next';
import { useRenderDiagnostics } from '../hooks/useRenderDiagnostics';
import { prefetchImages } from '../utils/imageCache';
import { proxyImageUrl } from '../utils/imageProxy';
import i18n from '../utils/i18n';
import {
  getChannelListPerfConfig,
  getEpgKeyForChannel,
  getEpgTickIntervalMs,
  getProgramProgressPercent,
  resolveChannelListBackAction,
  scheduleFocusRestore,
  shouldDeferPrefetch,
} from '../utils/channelListBehavior';
export type ContentRef = { focusFirstItem: () => void; handleBack?: () => boolean };

// Cache time formatter
const timeFormatter = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' });

// ⚡ Bolt: Wrap CategoryItem in React.memo to prevent unnecessary re-renders of the entire category list
// when selecting a new group.
const CategoryItem = React.memo(React.forwardRef(({ title, count, isSelected, onPress, onFocus, colors, hasTVPreferredFocus, accessibilityLabel }: { title: string, count?: number, isSelected: boolean, onPress: (title: string) => void, onFocus?: (title: string) => void, colors: any, hasTVPreferredFocus?: boolean, accessibilityLabel: string }, ref: React.Ref<any>) => {
    const [isFocused, setIsFocused] = useState(false);
    return (
        <TouchableOpacity
            ref={ref}
            style={[
                tiviStyles.categoryItem,
                { borderBottomColor: colors.divider },
                isSelected && { backgroundColor: colors.primaryLight, borderLeftColor: colors.primary, borderLeftWidth: 3 },
                isFocused && { backgroundColor: 'rgba(233,105,42,0.25)', borderLeftColor: colors.primary, borderLeftWidth: 3 }
            ]}
            onPress={() => onPress(title)}
            onFocus={() => { setIsFocused(true); onFocus?.(title); }}
            onBlur={() => setIsFocused(false)}
            accessible={true}
            isTVSelectable={true}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={accessibilityLabel}
            hasTVPreferredFocus={hasTVPreferredFocus}
        >
            <Text style={[tiviStyles.categoryText, { color: isSelected || isFocused ? colors.text : colors.textSecondary }]} numberOfLines={3}>
                {title}
            </Text>
            {count !== undefined && (
                <View style={[tiviStyles.countBadge, { backgroundColor: isSelected ? colors.primary : colors.divider }]}>
                    <Text style={[tiviStyles.countText, { color: isSelected ? '#FFF' : colors.textMuted }]}>{count}</Text>
                </View>
            )}
        </TouchableOpacity>
    );
}), (prevProps, nextProps) => {
    return prevProps.title === nextProps.title &&
           prevProps.count === nextProps.count &&
           prevProps.isSelected === nextProps.isSelected &&
           prevProps.hasTVPreferredFocus === nextProps.hasTVPreferredFocus &&
           prevProps.colors === nextProps.colors;
});

// ⚡ Bolt: Wrap ChannelRow in React.memo to prevent unnecessary re-renders when parent state updates.
const ChannelRow = React.memo(React.forwardRef(({ channel, channelNumber, isPlaying, isFocused, isFav, currentProgram, progressPercent, hasCatchupSupport, onPress, onLongPress, onFocus, colors, noProgramLabel }: {
    channel: Channel;
    channelNumber: number;
    isPlaying: boolean;
    isFocused: boolean;
    isFav: boolean;
    currentProgram: any;
    progressPercent: number;
    hasCatchupSupport: boolean;
    onPress: (channel: Channel) => void;
    onLongPress: (channel: Channel) => void;
    onFocus: (id: string) => void;
    colors: any;
    noProgramLabel: string;
}, _ref: React.Ref<any>) => {
    const [localFocused, setLocalFocused] = useState(false);
    const focused = isFocused || localFocused;

    return (
        <TouchableOpacity
            style={[
                tiviStyles.channelRow,
                { borderBottomColor: colors.divider },
                isPlaying && { backgroundColor: 'rgba(233,105,42,0.12)', borderLeftColor: colors.primary, borderLeftWidth: 3 },
                focused && { backgroundColor: 'rgba(233,105,42,0.18)' },
            ]}
            onPress={() => onPress(channel)}
            onLongPress={() => onLongPress(channel)}
            onFocus={() => { setLocalFocused(true); onFocus(channel.id); }}
            onBlur={() => setLocalFocused(false)}
            accessible={true}
            accessibilityRole="button"
            accessibilityState={{ selected: isPlaying }}
            accessibilityHint={i18n.t('a11y.playChannelLongPressFavoriteHint')}
            isTVSelectable={true}
            hasTVPreferredFocus={isFocused}
            activeOpacity={0.7}
        >
            {/* Channel Number */}
            <Text style={[tiviStyles.channelNumber, { color: focused ? colors.primary : colors.textMuted }]}>
                {channelNumber}
            </Text>

            {/* Channel Logo */}
            <View style={tiviStyles.logoContainer}>
                {channel.logo && channel.logo.startsWith('http') ? (
                    <ChannelLogo url={channel.logo} name={channel.name} style={tiviStyles.channelLogo} />
                ) : (
                    <View style={[tiviStyles.channelLogo, tiviStyles.logoPlaceholder, { backgroundColor: colors.surfaceSecondary }]}>
                        <Icon name="tv" size={Platform.isTV ? 24 : 18} color={colors.textMuted} />
                    </View>
                )}
                {hasCatchupSupport && (
                    <View style={[tiviStyles.catchupDot, { backgroundColor: colors.primary }]} />
                )}
            </View>

            {/* Channel Info + EPG */}
            <View style={tiviStyles.channelInfo}>
                <View style={tiviStyles.channelNameRow}>
                    <Text style={[tiviStyles.channelName, { color: focused ? colors.text : colors.textSecondary }]} numberOfLines={3}>
                        {channel.name}
                    </Text>
                    {isFav && <Icon name="favorite" size={14} color={colors.primary} style={{ marginLeft: 4 }} />}
                    {isPlaying && <Icon name="play-arrow" size={16} color={colors.primary} style={{ marginLeft: 4 }} />}
                </View>

                {currentProgram ? (
                    <View style={tiviStyles.epgInline}>
                        <Text style={[tiviStyles.programName, { color: colors.textMuted }]} numberOfLines={1}>
                            {timeFormatter.format(currentProgram.start)} {currentProgram.title}
                        </Text>
                        <View style={[tiviStyles.progressBar, { backgroundColor: colors.divider }]}>
                            <View style={[tiviStyles.progressFill, { width: `${progressPercent}%`, backgroundColor: colors.primary }]} />
                        </View>
                    </View>
                ) : (
                    <Text style={[tiviStyles.noProgramText, { color: colors.textMuted }]}>{noProgramLabel}</Text>
                )}
            </View>
        </TouchableOpacity>
    );
}), (prevProps, nextProps) => {
    return prevProps.channel.id === nextProps.channel.id &&
           prevProps.channelNumber === nextProps.channelNumber &&
           prevProps.isPlaying === nextProps.isPlaying &&
           prevProps.isFocused === nextProps.isFocused &&
           prevProps.isFav === nextProps.isFav &&
           prevProps.currentProgram?.id === nextProps.currentProgram?.id &&
           prevProps.progressPercent === nextProps.progressPercent &&
           prevProps.hasCatchupSupport === nextProps.hasCatchupSupport &&
           prevProps.colors === nextProps.colors &&
           prevProps.noProgramLabel === nextProps.noProgramLabel;
});

// View mode toggle: list vs EPG grid
type ViewMode = 'list' | 'epg';

const LiveTVFlow = forwardRef<ContentRef, { onReturnToSidebar?: () => void; initialViewMode?: ViewMode }>((props, ref) => {
  const { t } = useTranslation();
  const { isLoading, isUpdating } = useIPTVAppState();
  const { hasCatchup, getCatchupUrl } = useIPTVGuide();
  const { pin, isAdultUnlocked, unlockChannel, isChannelLocked } = useIPTVParental();
  const { addFavorite, removeFavorite, isFavorite } = useIPTVCollections();
  const { channels, epg } = useIPTVLibrary();
  const { playStream, currentStream } = useIPTVPlayback();
  const { colors } = useSettings();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [focusedChannelId, setFocusedChannelId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(props.initialViewMode || 'list');
  const [restoreFocusOnSelectedChannel, setRestoreFocusOnSelectedChannel] = useState(false);

  const channelRefs = useRef<{[key: string]: any}>({});

  useEffect(() => {
    if (!restoreFocusOnSelectedChannel || !focusedChannelId) return;
    return scheduleFocusRestore(channelRefs.current, focusedChannelId, setTimeout, clearTimeout);
  }, [restoreFocusOnSelectedChannel, focusedChannelId]);


  useEffect(() => {
    if (route.params?.returnGroupId) {
      setSelectedGroup(route.params.returnGroupId);
    }
    if (route.params?.focusChannelId) {
      setFocusedChannelId(route.params.focusChannelId);
    }
    if (route.params?.returnGroupId || route.params?.focusChannelId) {
      setRestoreFocusOnSelectedChannel(true);
      navigation.setParams({ returnGroupId: undefined, focusChannelId: undefined });
    }
  }, [route.params?.returnGroupId, route.params?.focusChannelId]);
  const [shouldFocusFirstItem, setShouldFocusFirstItem] = useState(false);
  const [epgNowTimestamp, setEpgNowTimestamp] = useState(() => Date.now());

  const isTV = isTVPlatform;
  const listPerfConfig = useMemo(
    () => getChannelListPerfConfig({ isTV, platformOS: Platform.OS }),
    [isTV],
  );
  const { width: windowWidth } = useWindowDimensions();
  const isCompactLayout = !isTV && windowWidth < 600;
  const [showCategories, setShowCategories] = useState<boolean>(true);

  const firstCategoryRef = useRef<any>(null);
  const categoryRefs = useRef<Record<string, any>>({});
  const flatListRef = useRef<FlatList>(null);
  const [unlockMode, setUnlockMode] = useState<string | null>(null);
  const prefetchInteractionRef = useRef<ReturnType<typeof InteractionManager.runAfterInteractions> | null>(null);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setEpgNowTimestamp(Date.now());
    }, getEpgTickIntervalMs());

    return () => clearInterval(intervalId);
  }, []);

  useImperativeHandle(ref, () => ({
    focusFirstItem: () => {
      if (viewMode === 'epg' || restoreFocusOnSelectedChannel) return;
      if (selectedGroup) {
        const selectedCategoryRef = categoryRefs.current[selectedGroup];
        if (selectedCategoryRef) {
          selectedCategoryRef.focus?.();
          selectedCategoryRef.setNativeProps?.({ hasTVPreferredFocus: true });
          return;
        }
      }
      if (firstCategoryRef.current) {
        firstCategoryRef.current.focus?.();
        firstCategoryRef.current.setNativeProps?.({ hasTVPreferredFocus: true });
      }
    },
    handleBack: () => {
      const action = resolveChannelListBackAction({ unlockMode, isCompactLayout, showCategories });
      if (action === 'closeUnlockDialog') {
        setUnlockMode(null);
        return true;
      }
      if (action === 'showCategories') {
        setShowCategories(true);
        return true;
      }
      return false;
    },
  }), [viewMode, restoreFocusOnSelectedChannel, selectedGroup]);

  useEffect(() => {
    if (!restoreFocusOnSelectedChannel) return;
    const timer = setTimeout(() => setRestoreFocusOnSelectedChannel(false), 450);
    return () => clearTimeout(timer);
  }, [restoreFocusOnSelectedChannel]);

  const { groups, groupMap } = useMemo(() => {
    const len = channels.length;
    if (len === 0) return { groups: [], groupMap: {}, channelMap: {} };

    const map: Record<string, Channel[]> = {};
    const cMap: Record<string, Channel> = {};
    const hasPin = !!pin;

    for (let i = 0; i < len; i++) {
      const channel = channels[i];
      cMap[channel.id] = channel;
      if (channel.isAdult && !isAdultUnlocked && hasPin) {
        continue;
      }

      const g = channel.group || 'Unknown';
      if (map[g] === undefined) {
        map[g] = [channel];
      } else {
        map[g].push(channel);
      }
    }

    const titles = Object.keys(map);
    const titlesLen = titles.length;
    const result = new Array(titlesLen);
    for (let i = 0; i < titlesLen; i++) {
      const title = titles[i];
      result[i] = { title, data: map[title] };
    }
    return { groups: result, groupMap: map, channelMap: cMap };
  }, [channels, isAdultUnlocked, pin]);

  useEffect(() => {
    if (groups.length > 0 && !selectedGroup) {
      setSelectedGroup(groups[0].title);
    }
  }, [groups, selectedGroup]);

  useEffect(() => {
     if (selectedGroup) {
         const currentChannels = groupMap[selectedGroup] || [];
         if (currentChannels.length > 0) {
            const playingInGroup = currentChannels.find((c: any) => c.id === currentStream?.id);
            if (playingInGroup) {
                 setFocusedChannelId(playingInGroup.id);
            } else {
                 setFocusedChannelId(currentChannels[0].id);
            }
         }
     }
  }, [selectedGroup, groupMap, currentStream?.id]);

  const handleGroupSelect = useCallback((title: string) => {
    setSelectedGroup(title);
    setShouldFocusFirstItem(true);
    if (isCompactLayout) {
      setShowCategories(false);
    }
  }, [isCompactLayout]);

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

  const selectedChannels = useMemo(() => {
    return selectedGroup ? (groupMap[selectedGroup] || []) : [];
  }, [groupMap, selectedGroup]);

  const getEpgKey = useCallback((channel: Channel): string => {
    return getEpgKeyForChannel(channel);
  }, []);

  const isEpgPendingForSelection = useMemo(() => {
    if (!(isLoading || isUpdating) || selectedChannels.length === 0) return false;

    for (let i = 0; i < selectedChannels.length; i++) {
      const channel = selectedChannels[i];
      const key = getEpgKey(channel);
      if ((epg[key] || []).length > 0) {
        return false;
      }
    }

    return true;
  }, [isLoading, isUpdating, selectedChannels, epg, getEpgKey]);

  useRenderDiagnostics('ChannelList', {
    selectedGroup,
    focusedChannelId,
    groupsCount: groups.length,
    selectedChannelsCount: selectedChannels.length,
    viewMode,
    isLoading,
  });

  const handleChannelPress = useCallback((channel: Channel) => {
    if (isChannelLocked(channel.id)) {
       setUnlockMode(channel.id);
       return;
    }

    playStream({ url: channel.url, id: channel.id });

    navigation.navigate('Player', {
      focusChannelId: channel.id,
      returnGroupId: selectedGroup,
      returnScreen: 'Home',
      returnTab: 'channels',
    });
  }, [isChannelLocked, playStream, navigation, selectedGroup]);

  const handleEpgPress = useCallback((channel: Channel, prog: any) => {
    const nowTime = Date.now();
    const isNow = nowTime >= prog.start && nowTime < prog.end;
    const isPast = nowTime >= prog.end;

    if (isNow) {
      handleChannelPress(channel);
    } else if (isPast) {
      if (isProgramCatchupAvailable(channel, prog.start, prog.end)) {
        const catchupUrl = getCatchupUrl(channel, prog.start, prog.end);
        if (catchupUrl) {
          playStream({ url: catchupUrl, id: `${channel.id}_catchup_${prog.start}` });
          navigation.navigate('Player', {
            focusChannelId: channel.id,
            returnGroupId: selectedGroup,
          });
          return;
        }
      }
    }

    // Fallback: even without usable EPG state (future/non-catchup/no-current),
    // selecting the timeline row should still tune to the live channel.
    handleChannelPress(channel);
  }, [handleChannelPress, getCatchupUrl, playStream, navigation, selectedGroup]);

  const prefetchChannelBatch = useCallback((items: Channel[]) => {
    const urls = items
      .map((item) => proxyImageUrl(item.logo))
      .filter((url): url is string => !!url);
    prefetchImages(urls);
  }, []);

  const cancelScheduledPrefetch = useCallback(() => {
    prefetchInteractionRef.current?.cancel();
    prefetchInteractionRef.current = null;
  }, []);

  const schedulePrefetchChannelBatch = useCallback((items: Channel[]) => {
    if (items.length === 0) return;

    // Defers image prefetch work on Android/Android TV until interactions settle,
    // which reduces scroll/focus jank on lower-powered devices.
    if (shouldDeferPrefetch(Platform.OS)) {
      cancelScheduledPrefetch();
      prefetchInteractionRef.current = InteractionManager.runAfterInteractions(() => {
        prefetchInteractionRef.current = null;
        prefetchChannelBatch(items);
      });
      return;
    }

    prefetchChannelBatch(items);
  }, [cancelScheduledPrefetch, prefetchChannelBatch]);

  useEffect(() => {
    return () => {
      cancelScheduledPrefetch();
    };
  }, [cancelScheduledPrefetch]);

  useEffect(() => {
    if (selectedChannels.length === 0) return;
    schedulePrefetchChannelBatch(selectedChannels.slice(0, 18));
  }, [selectedChannels, schedulePrefetchChannelBatch]);

  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: Array<{ item?: Channel | null }> }) => {
    const visibleChannels = viewableItems
      .map((entry) => entry.item)
      .filter((item): item is Channel => !!item)
      .slice(0, 12);
    if (visibleChannels.length > 0) {
      schedulePrefetchChannelBatch(visibleChannels);
    }
  }, [schedulePrefetchChannelBatch]);

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 30,
    minimumViewTime: 120,
  }).current;

  const handleToggleFavorite = useCallback((channel: Channel) => {
    if (isFavorite(channel.id)) {
      removeFavorite(channel.id);
    } else {
      addFavorite({ id: channel.id, type: 'live', name: channel.name, icon: channel.logo, categoryId: channel.categoryId, addedAt: Date.now() });
    }
  }, [isFavorite, removeFavorite, addFavorite]);

  const getChannelEpgInfo = useCallback((channel: Channel) => {
    const key = getEpgKey(channel);
    const programs = epg[key] || [];
    if (programs.length === 0) return { currentProgram: null, progressPercent: 0 };

    const now = epgNowTimestamp;
    const idx = findCurrentProgramIndex(programs, now);
    if (idx === -1) return { currentProgram: null, progressPercent: 0 };

    const prog = programs[idx];
    const progressPercent = getProgramProgressPercent(prog, now);

    return { currentProgram: prog, progressPercent };
  }, [epg, epgNowTimestamp, getEpgKey]);

  const selectedChannelMap = useMemo(() => {
    const map: Record<string, Channel> = {};
    for (let i = 0; i < selectedChannels.length; i++) {
      map[selectedChannels[i].id] = selectedChannels[i];
    }
    return map;
  }, [selectedChannels]);
  const selectedChannelIndexMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (let i = 0; i < selectedChannels.length; i++) {
      map[selectedChannels[i].id] = i;
    }
    return map;
  }, [selectedChannels]);

  const focusedChannelForPreview = useMemo(() => {
    if (selectedChannels.length === 0) return null;
    if (focusedChannelId) {
      const focusedChannel = selectedChannelMap[focusedChannelId];
      if (focusedChannel) return focusedChannel;
    }
    return selectedChannels[0];
  }, [selectedChannels, focusedChannelId, selectedChannelMap]);

  const focusedChannelPreview = useMemo(() => {
    if (!focusedChannelForPreview) {
      return { currentProgram: null, nextProgram: null };
    }

    const key = getEpgKey(focusedChannelForPreview);
    const programs = epg[key] || [];
    const now = epgNowTimestamp;
    const currentIndex = findCurrentProgramIndex(programs, now);

    const nextIdx = currentIndex >= 0
      ? (currentIndex + 1 < programs.length ? currentIndex + 1 : -1)
      : findNextProgramIndex(programs, now);

    return {
      currentProgram: currentIndex >= 0 ? programs[currentIndex] : null,
      nextProgram: nextIdx >= 0 ? programs[nextIdx] : null,
    };
  }, [focusedChannelForPreview, getEpgKey, epg, epgNowTimestamp]);

  // Global channel index for numbering
  const channelIndexOffset = useMemo(() => {
    if (!selectedGroup) return 0;
    let offset = 0;
    for (const g of groups) {
      if (g.title === selectedGroup) break;
      offset += g.data.length;
    }
    return offset;
  }, [groups, selectedGroup]);

  const renderCategoryItem = useCallback(({ item, index }: { item: { title: string; data: Channel[] }, index: number }) => {
    const isSelected = selectedGroup === item.title;
    const isFirstItem = index === 0;
    return (
      <CategoryItem
        ref={(refInstance) => {
          if (isFirstItem) {
            firstCategoryRef.current = refInstance;
          }
          categoryRefs.current[item.title] = refInstance;
        }}
        title={item.title}
        count={item.data.length}
        isSelected={isSelected}
        onPress={handleGroupSelect}
        colors={colors}
        hasTVPreferredFocus={isFirstItem}
        accessibilityLabel={t('a11y.selectCategory', { title: item.title })}
      />
    );
  }, [selectedGroup, handleGroupSelect, colors]);

  const handleChannelFocus = useCallback((id: string) => {
    setFocusedChannelId(id);
    if (!Platform.isTV) return;

    const index = selectedChannelIndexMap[id];
    if (index === undefined) return;

    flatListRef.current?.scrollToIndex({
      index,
      animated: false,
      viewPosition: 0.5,
    });
  }, [selectedChannelIndexMap]);

  const handleChannelListScrollToIndexFailed = useCallback(({ index }: { index: number }) => {
    flatListRef.current?.scrollToOffset({
      offset: Math.max(0, index * (Platform.isTV ? 84 : 64)),
      animated: false,
    });
  }, []);

  const renderChannelItem = useCallback(({ item: channel, index }: { item: Channel; index: number }) => {
    const epgInfo = getChannelEpgInfo(channel);
    const isPlaying = currentStream?.id === channel.id;
    const isFocusedChannel = focusedChannelId === channel.id;
    const isFav = isFavorite(channel.id);
    const hasCatchupSupport = hasCatchup ? hasCatchup(channel) : false;

    return (
      <ChannelRow
        ref={(el: any) => (channelRefs.current[channel.id] = el)}
        channel={channel}
        channelNumber={channelIndexOffset + index + 1}
        isPlaying={isPlaying}
        isFocused={isFocusedChannel}
        isFav={isFav}
        currentProgram={epgInfo.currentProgram}
        progressPercent={epgInfo.progressPercent}
        hasCatchupSupport={hasCatchupSupport}
        onPress={handleChannelPress}
        onLongPress={handleToggleFavorite}
        onFocus={handleChannelFocus}
        colors={colors}
        noProgramLabel={t('focusPreviewNoEpg')}
      />
    );
  }, [getChannelEpgInfo, currentStream?.id, focusedChannelId, isFavorite, hasCatchup, channelIndexOffset, handleChannelPress, handleToggleFavorite, handleChannelFocus, colors, t]);

  const handleEpgFocusedChannelChange = useCallback((id: string) => {
    setFocusedChannelId(id);
    setShouldFocusFirstItem(false);
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      {/* View mode toggle - hidden on TV where sidebar handles navigation */}
      {!isCompactLayout && !isTV && (
        <View style={[tiviStyles.viewModeBar, { backgroundColor: colors.card, borderBottomColor: colors.divider }]}>
          <TouchableOpacity
            style={[tiviStyles.viewModeBtn, viewMode === 'list' && { backgroundColor: colors.primary }]}
            onPress={() => setViewMode('list')}
            isTVSelectable={true}
            accessible={true}
            accessibilityRole="button"
            accessibilityState={{ selected: viewMode === 'list' }}
            accessibilityLabel={t('a11y.listView')}
          >
            <Icon name="list" size={18} color={viewMode === 'list' ? '#FFF' : colors.textMuted} />
            <Text style={{ color: viewMode === 'list' ? '#FFF' : colors.textMuted, fontSize: 12, marginLeft: 4, fontWeight: '600' }}>{t('list')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[tiviStyles.viewModeBtn, viewMode === 'epg' && { backgroundColor: colors.primary }]}
            onPress={() => setViewMode('epg')}
            isTVSelectable={true}
            accessible={true}
            accessibilityRole="button"
            accessibilityState={{ selected: viewMode === 'epg' }}
            accessibilityLabel={t('a11y.epgGridView')}
          >
            <Icon name="grid-on" size={18} color={viewMode === 'epg' ? '#FFF' : colors.textMuted} />
            <Text style={{ color: viewMode === 'epg' ? '#FFF' : colors.textMuted, fontSize: 12, marginLeft: 4, fontWeight: '600' }}>{t('epgShort')}</Text>
          </TouchableOpacity>
          {selectedGroup && (
            <Text style={[tiviStyles.groupTitle, { color: colors.textSecondary }]}>{selectedGroup}</Text>
          )}
        </View>
      )}

      <View style={{ flex: 1, flexDirection: 'row' }}>
        {/* LEFT: Category Groups */}
        {showCategories && (
          <View style={[tiviStyles.categorySidebar, isCompactLayout ? { width: '100%', flex: 1, borderRightWidth: 0 } : { backgroundColor: colors.card, borderRightColor: colors.divider }]}>
            {isCompactLayout && (
              <View style={{ padding: 14, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.divider }}>
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>{t('categories')}</Text>
              </View>
            )}
            <FlatList
              data={groups}
              keyExtractor={(item) => item.title}
              initialNumToRender={listPerfConfig.initialNumToRender}
              maxToRenderPerBatch={listPerfConfig.maxToRenderPerBatch}
              windowSize={listPerfConfig.windowSize}
              updateCellsBatchingPeriod={listPerfConfig.updateCellsBatchingPeriod}
              removeClippedSubviews={listPerfConfig.removeClippedSubviews}
              renderItem={renderCategoryItem}
            />
          </View>
        )}

        {/* RIGHT: Channel List or EPG Grid */}
        {(!isCompactLayout || !showCategories) && (
          <View style={[tiviStyles.contentPane, { backgroundColor: colors.background }]}>
            {isCompactLayout && (
              <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.divider }}>
                <TouchableOpacity onPress={() => setShowCategories(true)} style={{ flexDirection: 'row', alignItems: 'center' }} accessible={true} isTVSelectable={true} accessibilityRole="button" accessibilityLabel={t('a11y.goBackToCategories')}>
                  <Icon name="arrow-back" size={22} color={colors.text} />
                  <Text style={{ color: colors.text, marginLeft: 8, fontSize: 16, fontWeight: '600' }}>{selectedGroup}</Text>
                </TouchableOpacity>
              </View>
            )}

            {viewMode === 'list' || isCompactLayout ? (
              // TV channel list + focused channel preview
              selectedChannels.length > 0 ? (
                <View style={tiviStyles.listModeLayout}>
                  <View style={[tiviStyles.listColumn, isTV && { borderRightWidth: 1, borderRightColor: colors.divider }]}>
                    <FlatList
                      ref={flatListRef}
                      data={selectedChannels}
                      keyExtractor={(item) => item.id}
                      initialNumToRender={listPerfConfig.initialNumToRender}
                      maxToRenderPerBatch={listPerfConfig.maxToRenderPerBatch}
                      windowSize={Math.max(listPerfConfig.windowSize, 7)}
                      updateCellsBatchingPeriod={listPerfConfig.updateCellsBatchingPeriod}
                      removeClippedSubviews={listPerfConfig.removeClippedSubviews}
                      getItemLayout={(_data, index) => ({
                        length: Platform.isTV ? 84 : 64,
                        offset: (Platform.isTV ? 84 : 64) * index,
                        index,
                      })}
                      onViewableItemsChanged={onViewableItemsChanged}
                      viewabilityConfig={viewabilityConfig}
                      onScrollToIndexFailed={handleChannelListScrollToIndexFailed}
                      renderItem={renderChannelItem}
                    />
                  </View>

                  {isTV && (
                    <View style={[tiviStyles.previewColumn, { backgroundColor: colors.card }]}>
                      <Text style={[tiviStyles.previewChannelName, { color: colors.text }]} numberOfLines={2}>
                        {focusedChannelForPreview?.name || t('channels')}
                      </Text>

                      {focusedChannelPreview.currentProgram ? (
                        <View style={tiviStyles.previewSection}>
                          <Text style={[tiviStyles.previewSectionTitle, { color: colors.textMuted }]}>{t('nowPlaying')}</Text>
                          <Text style={[tiviStyles.previewProgramTitle, { color: colors.text }]}>
                            {focusedChannelPreview.currentProgram.title}
                          </Text>
                          <Text style={[tiviStyles.previewProgramTime, { color: colors.textSecondary }]}>
                            {timeFormatter.format(focusedChannelPreview.currentProgram.start)} - {timeFormatter.format(focusedChannelPreview.currentProgram.end)}
                          </Text>
                        </View>
                      ) : (
                        <View style={tiviStyles.previewSection}>
                          <Text style={[tiviStyles.previewSectionTitle, { color: colors.textMuted }]}>{t('nowPlaying')}</Text>
                          <Text style={[tiviStyles.previewProgramTitle, { color: colors.textSecondary }]}>{t('focusPreviewNoEpg')}</Text>
                        </View>
                      )}

                      {focusedChannelPreview.nextProgram && (
                        <View style={tiviStyles.previewSection}>
                          <Text style={[tiviStyles.previewSectionTitle, { color: colors.textMuted }]}>{t('focusPreviewNext')}</Text>
                          <Text style={[tiviStyles.previewProgramTitle, { color: colors.text }]}>
                            {focusedChannelPreview.nextProgram.title}
                          </Text>
                          <Text style={[tiviStyles.previewProgramTime, { color: colors.textSecondary }]}>
                            {timeFormatter.format(focusedChannelPreview.nextProgram.start)} - {timeFormatter.format(focusedChannelPreview.nextProgram.end)}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.centeredContainer}>
                  <Icon name="tv-off" size={48} color={colors.textMuted} />
                  <Text style={{ color: colors.textSecondary, marginTop: 12 }}>{t('noChannelsAvailable')}</Text>
                </View>
              )
            ) : (
              // EPG Grid view
              selectedChannels.length > 0 ? (
                <EpgTimeline
                  channels={selectedChannels}
                  onChannelPress={handleChannelPress}
                  onProgramPress={handleEpgPress}
                  focusedChannelId={focusedChannelId}
                  setFocusedChannelId={handleEpgFocusedChannelChange}
                  currentStreamId={currentStream?.id}
                  shouldFocusFirstItem={shouldFocusFirstItem}
                  isEpgPending={isEpgPendingForSelection}
                />
              ) : (
                <View style={styles.centeredContainer}>
                  <Text style={{ color: colors.textSecondary }}>{t('noChannelsInCategory')}</Text>
                </View>
              )
            )}
          </View>
        )}
      </View>

      {/* Unlock PIN Dialog Overlay */}
      {unlockMode && (
          <View style={StyleSheet.absoluteFill}>
              <View style={[styles.centeredContainer, { backgroundColor: 'rgba(0,0,0,0.85)' }]}>
                  <View style={{ backgroundColor: colors.card, padding: 24, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: colors.divider }}>
                      <Icon name="lock" size={32} color={colors.primary} style={{ marginBottom: 12 }} />
                      <Text style={{ color: colors.text, fontSize: 18, marginBottom: 16, fontWeight: '600' }}>{t('enterPinToUnlock')}</Text>
                      <View style={{ flexDirection: 'row', gap: 16 }}>
                          <TouchableOpacity onPress={() => setUnlockMode(null)} style={{ padding: 12, paddingHorizontal: 20, backgroundColor: colors.surfaceSecondary, borderRadius: 10 }} accessible={true} isTVSelectable={true} accessibilityRole="button">
                             <Text style={{ color: colors.textSecondary }}>{t('cancel')}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                              onPress={() => {
                                  if (pin) {
                                      unlockChannel(unlockMode);
                                      setUnlockMode(null);
                                  }
                              }}
                              style={{ padding: 12, paddingHorizontal: 20, backgroundColor: colors.primary, borderRadius: 10 }}
                              accessible={true}
                              accessibilityRole="button"
                              isTVSelectable={true}
                              hasTVPreferredFocus={true}
                          >
                             <Text style={{ color: '#FFF', fontWeight: '600' }}>{t('unlock')}</Text>
                          </TouchableOpacity>
                      </View>
                  </View>
              </View>
          </View>
      )}

    </View>
  );
});

LiveTVFlow.displayName = 'LiveTVFlow';

const tiviStyles = StyleSheet.create({
  // View mode bar
  viewModeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  viewModeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
  },
  groupTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 12,
    flex: 1,
  },
  // Category sidebar
  categorySidebar: {
    width: Platform.isTV ? 300 : 240,
    borderRightWidth: 1,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Platform.isTV ? 14 : 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  categoryText: {
    fontSize: Platform.isTV ? 17 : 14,
    fontWeight: '500',
    flex: 1,
    lineHeight: Platform.isTV ? 22 : 19,
  },
  countBadge: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 28,
    alignItems: 'center',
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
  },
  // Content pane
  contentPane: {
    flex: 1,
  },
  listModeLayout: {
    flex: 1,
    flexDirection: 'row',
  },
  listColumn: {
    flex: 1,
  },
  previewColumn: {
    width: 420,
    paddingHorizontal: 24,
    paddingVertical: 22,
  },
  previewChannelName: {
    fontSize: 30,
    fontWeight: '700',
    lineHeight: 36,
    marginBottom: 18,
  },
  previewSection: {
    marginBottom: 20,
  },
  previewSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  previewProgramTitle: {
    fontSize: 22,
    fontWeight: '600',
    lineHeight: 28,
  },
  previewProgramTime: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  // TiviMate channel row
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Platform.isTV ? 10 : 8,
    paddingHorizontal: Platform.isTV ? 16 : 12,
    borderBottomWidth: 1,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
    height: Platform.isTV ? 84 : 64,
  },
  channelNumber: {
    width: Platform.isTV ? 36 : 28,
    fontSize: Platform.isTV ? 14 : 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  logoContainer: {
    position: 'relative',
    marginHorizontal: Platform.isTV ? 12 : 8,
  },
  channelLogo: {
    width: Platform.isTV ? 92 : 42,
    height: Platform.isTV ? 64 : 30,
    borderRadius: 4,
  },
  logoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  catchupDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#121212',
  },
  channelInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  channelNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  channelName: {
    fontSize: Platform.isTV ? 19 : 14,
    fontWeight: '600',
    flex: 1,
    lineHeight: Platform.isTV ? 24 : 18,
  },
  epgInline: {
    marginTop: 3,
  },
  programName: {
    fontSize: Platform.isTV ? 13 : 11,
    marginBottom: 3,
  },
  progressBar: {
    height: 3,
    borderRadius: 1.5,
    overflow: 'hidden',
    maxWidth: Platform.isTV ? 320 : 200,
  },
  progressFill: {
    height: '100%',
    borderRadius: 1.5,
  },
  noProgramText: {
    fontSize: Platform.isTV ? 12 : 10,
    marginTop: 2,
    fontStyle: 'italic',
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default LiveTVFlow;
