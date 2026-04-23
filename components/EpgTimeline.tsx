import React, { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, FlatList, Platform, Animated } from 'react-native';
import { Channel } from '../types';
import { useIPTVCollections, useIPTVGuide } from '../context/IPTVContext';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { getCatchupDays } from '../utils/catchupUtils';
import { useTranslation } from 'react-i18next';
import { findCurrentProgramIndex, findNextProgramIndex } from '../utils/epgUtils';
import i18n from '../utils/i18n';

const PIXELS_PER_MINUTE = Platform.isTV ? 8 : 4; // Stretch timeline for TV
const HOUR_WIDTH = PIXELS_PER_MINUTE * 60;
const SCROLL_SYNC_THRESHOLD = Platform.isTV ? 240 : 120;
const CHANNEL_COLUMN_WIDTH = Platform.isTV ? 220 : 120;
const ROW_HEIGHT = Platform.isTV ? 92 : 60;


interface EpgTimelineProps {
  channels: Channel[];
  onChannelPress: (channel: Channel) => void;
  onProgramPress?: (channel: Channel, prog: any) => void;
  focusedChannelId: string | null;
  setFocusedChannelId: (id: string) => void;
  currentStreamId: string | undefined;
  shouldFocusFirstItem?: boolean;
  isEpgPending?: boolean;
}

// ⚡ Bolt: Cache Intl.DateTimeFormat instance to avoid slow initialization overhead on every render
const timeFormatter = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' });
const formatTime = (d: Date | number) => timeFormatter.format(d);
const alignToHalfHour = (date: Date) => {
  const aligned = new Date(date);
  aligned.setMinutes(aligned.getMinutes() < 30 ? 0 : 30, 0, 0);
  return aligned;
};

const ProgramBlock = React.memo(({ prog, channel, isNow, isPast, isCatchupAvailable, leftOffset, width, onProgramPress, onChannelPress, setFocusedChannelId }: any) => {
    const [isProgramFocused, setIsProgramFocused] = useState(false);
    const isDirectAction = isNow || isCatchupAvailable;
    const isClickable = Boolean(onProgramPress || isDirectAction);

    let bgColor = 'rgba(42, 42, 74, 0.7)'; // future
    if (isNow) bgColor = 'rgba(233, 105, 42, 0.35)';
    else if (isCatchupAvailable) bgColor = 'rgba(105, 240, 174, 0.15)'; // catchup-available past: subtle green tint
    else if (isPast) bgColor = 'rgba(26, 26, 46, 0.9)'; // non-catchup past: dark

    return (
        <TouchableOpacity
            style={[
                styles.programBlock,
                { left: leftOffset, width: Math.max(width - 2, 2) },
                { backgroundColor: bgColor },
                isProgramFocused && { backgroundColor: 'rgba(233, 105, 42, 0.4)', borderWidth: 2, borderColor: '#E9692A' }
            ]}
            onFocus={() => {
              setIsProgramFocused(true);
              setFocusedChannelId(channel.id);
            }}
            onBlur={() => setIsProgramFocused(false)}
            onPress={() => {
                if (onProgramPress) {
                    onProgramPress(channel, prog);
                } else if (isNow) {
                    onChannelPress(channel);
                }
            }}
            accessible={isClickable}
            accessibilityRole="button"
            accessibilityLabel={`${prog.title}, ${i18n.t('a11y.fromToTime', { from: formatTime(prog.start), to: formatTime(prog.end) })}${isNow ? `, ${i18n.t('a11y.liveNow')}` : isCatchupAvailable ? `, ${i18n.t('a11y.availableForCatchup')}` : ''}`}
            accessibilityHint={isNow ? i18n.t('a11y.playChannelHint') : isCatchupAvailable ? i18n.t('a11y.playCatchupHint') : i18n.t('a11y.programInfoHint')}
            isTVSelectable={isClickable}
            activeOpacity={isClickable ? 0.7 : 1}
            disabled={!isClickable}
        >
            <View style={styles.programTitleRow}>
                {isCatchupAvailable && !isNow && (
                    <Icon name="play-circle-outline" size={Platform.isTV ? 14 : 12} color="#69F0AE" style={{ marginRight: 2 }} />
                )}
                <Text style={[styles.programTitle, (isPast && !isCatchupAvailable) ? { color: '#71717A' } : { color: '#FAFAFA' }, { fontSize: Platform.isTV ? 15 : 13 }]} numberOfLines={1}>{prog.title}</Text>
            </View>
            <Text style={[styles.programTime, { fontSize: Platform.isTV ? 14 : 12 }]} numberOfLines={1}>
                {formatTime(prog.start)} - {formatTime(prog.end)}
            </Text>
        </TouchableOpacity>
    );
}, (prevProps, nextProps) => {
    return prevProps.prog === nextProps.prog &&
           prevProps.isNow === nextProps.isNow &&
           prevProps.isCatchupAvailable === nextProps.isCatchupAvailable &&
           prevProps.leftOffset === nextProps.leftOffset &&
           prevProps.width === nextProps.width;
});

const EmptyProgramBlock = React.memo(({ channel, onChannelPress, setFocusedChannelId, label }: any) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <TouchableOpacity
      style={[
        styles.emptyProgramFallback,
        isFocused && styles.emptyProgramFallbackFocused,
      ]}
      onPress={() => onChannelPress(channel)}
      onFocus={() => {
        setIsFocused(true);
        setFocusedChannelId(channel.id);
      }}
      onBlur={() => setIsFocused(false)}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={`${channel.name}. ${label}`}
      accessibilityHint={i18n.t('a11y.playChannelHint')}
      isTVSelectable={true}
      activeOpacity={0.8}
    >
      <Icon name="tv" size={Platform.isTV ? 14 : 12} color="#A1A1AA" />
      <Text style={styles.emptyProgramFallbackText} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
});

const ChannelColumnItem = React.memo(({ channel, isFocused, isPlaying, isFav, hasTVPreferredFocus, setFocusedChannelId, onChannelPress, addFavorite, removeFavorite, hasCatchup }: any) => (
    <TouchableOpacity
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`${i18n.t('a11y.channelPrefix')}: ${channel.name}${isFav ? `, ${i18n.t('a11y.favorite')}` : ''}${isPlaying ? `, ${i18n.t('a11y.currentlyPlaying')}` : ''}`}
        accessibilityHint={i18n.t('a11y.playChannelLongPressFavoriteHint')}
        isTVSelectable={true}
        hasTVPreferredFocus={hasTVPreferredFocus}
        style={[
            styles.channelBox,
            isPlaying && { borderLeftWidth: 3, borderLeftColor: '#E9692A' },
            isFocused && { backgroundColor: 'rgba(233, 105, 42, 0.2)', borderWidth: 2, borderColor: '#E9692A' }
        ]}
        onPress={() => onChannelPress(channel)}
        onFocus={() => setFocusedChannelId(channel.id)}
        onLongPress={() => {
            if (isFav) removeFavorite(channel.id);
            else addFavorite({ id: channel.id, type: 'live', name: channel.name, icon: channel.logo, categoryId: channel.categoryId, addedAt: Date.now() });
        }}
    >
        <View style={styles.logoContainer}>
            <Image
                source={channel.logo && channel.logo.startsWith('http') ? { uri: channel.logo } : require('../assets/character_logo.png')}
                style={styles.channelLogo}
                resizeMode="contain"
                defaultSource={require('../assets/character_logo.png')}
            />
            {hasCatchup && hasCatchup(channel) && (
                <View style={styles.catchupBadge}>
                    <Icon name="history" size={10} color="#FFF" />
                </View>
            )}
        </View>
        <Text style={[styles.channelName, { fontSize: Platform.isTV ? 17 : 14 }]} numberOfLines={2}>{channel.name}</Text>
        {isFocused && <View style={styles.focusRightEdge} />}
    </TouchableOpacity>
));

const EpgRow = React.memo(({ channel, programs, isFocused, onChannelPress, onProgramPress, timelineStart, timelineEnd, now, PIXELS_PER_MINUTE, hasCatchup, setFocusedChannelId, emptyEpgLabel }: any) => {
    // ⚡ Perf: Pre-compute program layout data in a memoized pass to avoid
    // recalculating boundaries, offsets, and time comparisons on every render.
    const programLayoutData = useMemo(() => {
        const timelineStartMs = timelineStart.getTime();
        const timelineEndMs = timelineEnd.getTime();
        const nowMs = now.getTime();

        const channelHasCatchup = hasCatchup ? hasCatchup(channel) : false;

        let catchupStartMs = 0;
        if (channelHasCatchup) {
            const catchupDays = getCatchupDays(channel);
            if (catchupDays > 0) {
                catchupStartMs = nowMs - catchupDays * 24 * 60 * 60 * 1000;
            }
        }

        const result: Array<{
            prog: any;
            idx: number;
            leftOffset: number;
            width: number;
            isNow: boolean;
            isPast: boolean;
            isCatchupAvailable: boolean;
        }> = [];

        if (programs.length === 0) return result;

        // ⚡ Bolt: O(log N) binary search to find the first relevant program instead of scanning from index 0.
        // This is extremely efficient for long EPG arrays (e.g. multiple days of data).
        let left = 0;
        let right = programs.length - 1;
        let startIndex = 0;

        while (left <= right) {
            const mid = Math.floor((left + right) / 2);
            if (programs[mid].end > timelineStartMs) {
                startIndex = mid;
                right = mid - 1; // Look for earlier valid programs
            } else {
                left = mid + 1; // Program ended before timeline started
            }
        }

        for (let idx = startIndex; idx < programs.length; idx++) {
            const prog = programs[idx];
            const startMs = prog.start;
            const endMs = prog.end;

            // ⚡ Bolt: Since the array is chronologically sorted, if this program starts after
            // the timeline ends, all subsequent programs will too. We can safely break.
            if (startMs >= timelineEndMs) break;

            // Skip if program ended before our timeline start
            // (should be handled by binary search but kept as safety net)
            if (endMs <= timelineStartMs) continue;

            const renderStartMs = Math.max(startMs, timelineStartMs);
            const renderEndMs = Math.min(endMs, timelineEndMs);

            const isProg_Now = nowMs >= startMs && nowMs < endMs;
            const isProg_Past = nowMs >= endMs;
            result.push({
                prog,
                idx,
                leftOffset: ((renderStartMs - timelineStartMs) / 60000) * PIXELS_PER_MINUTE,
                width: ((renderEndMs - renderStartMs) / 60000) * PIXELS_PER_MINUTE,
                isNow: isProg_Now,
                isPast: isProg_Past,
                isCatchupAvailable: isProg_Past && channelHasCatchup && catchupStartMs > 0
                    ? (startMs >= catchupStartMs)
                    : false,
            });
        }

        return result;
    }, [programs, timelineStart, timelineEnd, now, PIXELS_PER_MINUTE]);

    return (
        <View style={[styles.row, isFocused && styles.rowFocused]}>
            <View style={styles.programsContainer}>
                {programLayoutData.length > 0 ? (
                  programLayoutData.map((item) => (
                      <ProgramBlock
                          key={`${channel.id}-${item.idx}`}
                          prog={item.prog}
                          channel={channel}
                          isNow={item.isNow}
                          isPast={item.isPast}
                          isCatchupAvailable={item.isCatchupAvailable}
                          leftOffset={item.leftOffset}
                          width={item.width}
                          onChannelPress={onChannelPress}
                          onProgramPress={onProgramPress}
                          setFocusedChannelId={setFocusedChannelId}
                      />
                  ))
                ) : (
                  <EmptyProgramBlock
                    channel={channel}
                    onChannelPress={onChannelPress}
                    setFocusedChannelId={setFocusedChannelId}
                    label={emptyEpgLabel || channel.emptyEpgLabel || ''}
                  />
                )}
            </View>
        </View>
    );
}, (prevProps, nextProps) => {
    return prevProps.isFocused === nextProps.isFocused &&
           prevProps.isPlaying === nextProps.isPlaying &&
           prevProps.isFav === nextProps.isFav &&
           prevProps.programs === nextProps.programs &&
           prevProps.channel === nextProps.channel;
});

const EpgTimeline: React.FC<EpgTimelineProps> = ({ channels, onChannelPress, onProgramPress, focusedChannelId, setFocusedChannelId, currentStreamId, shouldFocusFirstItem, isEpgPending = false }) => {
  const { t } = useTranslation();
  const { epg, hasCatchup } = useIPTVGuide();
  const { isFavorite, addFavorite, removeFavorite } = useIPTVCollections();

  const [visibleWidth, setVisibleWidth] = useState(1000);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [showDelayedSkeleton, setShowDelayedSkeleton] = useState(false);
  const [focusedQuickJumpButton, setFocusedQuickJumpButton] = useState<string | null>(null);
  const mainScrollViewRef = useRef<any>(null);
  const timelineListRef = useRef<FlatList>(null);
  const channelListRef = useRef<FlatList>(null);
  const pendingVerticalOffsetRef = useRef<number | null>(null);
  const syncRafRef = useRef<number | null>(null);
  const lastSyncedYOffsetRef = useRef(0);
  const syncVerticalScroll = useCallback((offsetY: number) => {
    pendingVerticalOffsetRef.current = offsetY;
    if (syncRafRef.current !== null) return;
    syncRafRef.current = requestAnimationFrame(() => {
      const nextOffset = pendingVerticalOffsetRef.current;
      syncRafRef.current = null;
      if (nextOffset === null) return;
      if (Math.abs(nextOffset - lastSyncedYOffsetRef.current) < 1) return;
      lastSyncedYOffsetRef.current = nextOffset;
      channelListRef.current?.scrollToOffset({ offset: nextOffset, animated: false });
    });
  }, []);
  const scrollXAnimated = useRef(new Animated.Value(0)).current;
  const scrollXRef = useRef(0);

  // Calculate max catchup days across all visible channels
  const maxCatchupDays = useMemo(() => {
    let max = 0;
    for (const channel of channels) {
      max = Math.max(max, getCatchupDays(channel));
    }
    return max;
  }, [channels]);

  const TIMELINE_START_OFFSET_HOURS = useMemo(() => {
    // Show either 2 hours before now (default) or max catchup days available
    return Math.max(2, maxCatchupDays * 24);
  }, [maxCatchupDays]);

  // Timeline is start offset + 24 hours into the future
  const TIMELINE_DURATION_HOURS = TIMELINE_START_OFFSET_HOURS + 24;

  const [now, setNow] = useState(new Date());

  // Keep the timeline synchronized with real time (updates each minute).
  useEffect(() => {
    let minuteInterval: ReturnType<typeof setInterval> | null = null;
    const updateNow = () => setNow(new Date());
    const msToNextMinute = 60000 - (Date.now() % 60000);

    const alignTimer = setTimeout(() => {
      updateNow();
      minuteInterval = setInterval(updateNow, 60000);
    }, msToNextMinute);

    return () => {
      clearTimeout(alignTimer);
      if (minuteInterval) clearInterval(minuteInterval);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (syncRafRef.current !== null) {
        cancelAnimationFrame(syncRafRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isEpgPending) {
      setShowDelayedSkeleton(false);
      return;
    }

    const timer = setTimeout(() => {
      setShowDelayedSkeleton(true);
    }, 250);

    return () => clearTimeout(timer);
  }, [isEpgPending]);

  const timelineStart = useMemo(() => {
    const d = new Date();
    d.setHours(d.getHours() - TIMELINE_START_OFFSET_HOURS);
    return alignToHalfHour(d);
  }, [TIMELINE_START_OFFSET_HOURS]);

  const timelineEnd = useMemo(() => {
    const d = new Date(timelineStart);
    d.setHours(d.getHours() + TIMELINE_DURATION_HOURS);
    return d;
  }, [timelineStart]);

  const totalWidth = TIMELINE_DURATION_HOURS * HOUR_WIDTH;

  // Calculate current time indicator position
  const nowPosition = useMemo(() => {
    const diffMs = now.getTime() - timelineStart.getTime();
    return Math.max(0, (diffMs / 60000) * PIXELS_PER_MINUTE);
  }, [now, timelineStart]);

  const jumpToX = useCallback((x: number) => {
    const maxScrollX = Math.max(0, totalWidth - visibleWidth);
    const clampedX = Math.min(Math.max(0, x), maxScrollX);
    mainScrollViewRef.current?.scrollTo({ x: clampedX, animated: true });
    scrollXRef.current = clampedX;
  }, [totalWidth, visibleWidth]);

  const jumpToTimestamp = useCallback((targetDate: Date) => {
    const minutesFromStart = (targetDate.getTime() - timelineStart.getTime()) / 60000;
    const targetX = (minutesFromStart * PIXELS_PER_MINUTE) - (visibleWidth * 0.35);
    jumpToX(targetX);
  }, [timelineStart, visibleWidth, jumpToX]);

  const jumpToNow = useCallback(() => {
    jumpToX(nowPosition - (visibleWidth * 0.35));
  }, [nowPosition, visibleWidth, jumpToX]);

  const jumpForwardTwoHours = useCallback(() => {
    const target = new Date(now);
    target.setHours(target.getHours() + 2);
    jumpToTimestamp(target);
  }, [now, jumpToTimestamp]);

  const jumpToEvening = useCallback(() => {
    const target = new Date(now);
    target.setHours(20, 15, 0, 0);
    if (target.getTime() <= now.getTime()) {
      target.setDate(target.getDate() + 1);
    }
    jumpToTimestamp(target);
  }, [now, jumpToTimestamp]);

  // Scroll to current time ONCE on mount.
  // `jumpToNow` is intentionally read via a ref so that the minute-tick
  // refresh of `now` does not re-run this effect and yank the user back to
  // "now" every 60 seconds after they have scrolled to a different part of
  // the timeline. The setTimeout is now also cleared on unmount so it cannot
  // fire after teardown.
  const jumpToNowRef = useRef(jumpToNow);
  useEffect(() => {
    jumpToNowRef.current = jumpToNow;
  }, [jumpToNow]);

  useEffect(() => {
    const timer = setTimeout(() => {
      jumpToNowRef.current();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const timeHeaders = useMemo(() => {
    const headers = [];
    for (let i = 0; i < TIMELINE_DURATION_HOURS * 2; i++) {
      const d = new Date(timelineStart);
      d.setMinutes(d.getMinutes() + (i * 30));

      const showDate = d.getHours() === 0 && d.getMinutes() === 0 || i === 0;

      headers.push(
        <View key={i} style={[styles.timeHeaderItem, { width: HOUR_WIDTH / 2 }]}>
          <Text style={styles.timeHeaderText}>
            {showDate ? d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }) + ' - ' : ''}
            {formatTime(d)}
          </Text>
        </View>
      );
    }
    return headers;
  }, [timelineStart]);

  const getEpgKey = useCallback((channel: Channel): string => {
    if (channel.epgChannelId && channel.epgChannelId.length > 0) {
      return channel.epgChannelId;
    }
    return channel.tvgId || channel.id;
  }, []);

  const displayedChannels = useMemo(() => {
    // ⚡ Bolt: Construct both the list and an O(1) dictionary map in a single pass.
    // This eliminates O(N) array lookups (like .find or .some) on every focus change,
    // preventing main thread blocking and UI stutter during rapid TV remote navigation.
    const filtered = favoritesOnly ? channels.filter((channel) => isFavorite(channel.id)) : channels;
    const channelMap: Record<string, Channel> = {};
    for (let i = 0; i < filtered.length; i++) {
      channelMap[filtered[i].id] = filtered[i];
    }
    return { list: filtered, map: channelMap };
  }, [channels, isFavorite, favoritesOnly]);
  const displayedChannelIndexMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (let i = 0; i < displayedChannels.list.length; i++) {
      map[displayedChannels.list[i].id] = i;
    }
    return map;
  }, [displayedChannels]);

  const rowHeight = Platform.isTV ? 92 : 60;
  const handleChannelListScrollToIndexFailed = useCallback(({ index }: { index: number }) => {
    channelListRef.current?.scrollToOffset({
      offset: Math.max(0, index * rowHeight),
      animated: false,
    });
  }, [rowHeight]);

  const handleTimelineScrollToIndexFailed = useCallback(({ index }: { index: number }) => {
    timelineListRef.current?.scrollToOffset({
      offset: Math.max(0, index * rowHeight),
      animated: false,
    });
  }, [rowHeight]);

  const handleFocusedChannelChange = useCallback((channelId: string) => {
    setFocusedChannelId(channelId);
    if (!Platform.isTV) return;
    const index = displayedChannelIndexMap[channelId];
    if (index === undefined) return;

    timelineListRef.current?.scrollToIndex({
      index,
      animated: false,
      viewPosition: 0.45,
    });
    channelListRef.current?.scrollToIndex({
      index,
      animated: false,
      viewPosition: 0.45,
    });
  }, [displayedChannelIndexMap, setFocusedChannelId]);

  const focusedPreview = useMemo(() => {
    if (!focusedChannelId) return null;
    // ⚡ Bolt: O(1) map lookup instead of O(N) array.find
    const channel = displayedChannels.map[focusedChannelId];
    if (!channel) return null;

    const programs = epg[getEpgKey(channel)] || [];
    const nowMs = now.getTime();
    const currentIdx = findCurrentProgramIndex(programs, nowMs);
    const currentProgram = currentIdx >= 0 ? programs[currentIdx] : null;
    const nextIdx = currentIdx >= 0
      ? (currentIdx + 1 < programs.length ? currentIdx + 1 : -1)
      : findNextProgramIndex(programs, nowMs);
    const nextProgram = nextIdx >= 0 ? programs[nextIdx] : null;

    return {
      channel,
      currentProgram,
      nextProgram,
      isPlaying: currentStreamId === channel.id,
      isFav: isFavorite(channel.id),
      hasCatchupSupport: hasCatchup ? hasCatchup(channel) : false,
    };
  }, [focusedChannelId, displayedChannels, epg, getEpgKey, now, currentStreamId, isFavorite, hasCatchup]);

  const timelineExtraData = useMemo(() => ({
    focusedChannelId,
    visibleWidth,
  }), [focusedChannelId, visibleWidth]);

  const channelColumnExtraData = useMemo(() => ({
    focusedChannelId,
    currentStreamId,
    shouldFocusFirstItem,
    favoritesOnly,
  }), [focusedChannelId, currentStreamId, shouldFocusFirstItem, favoritesOnly]);

  useEffect(() => {
    if (displayedChannels.list.length === 0) return;
    if (!focusedChannelId) {
      setFocusedChannelId(displayedChannels.list[0].id);
      return;
    }
    // ⚡ Bolt: O(1) map lookup instead of O(N) array.some
    const focusedExists = !!displayedChannels.map[focusedChannelId];
    if (!focusedExists) {
      setFocusedChannelId(displayedChannels.list[0].id);
    }
  }, [displayedChannels, focusedChannelId, setFocusedChannelId]);

  const renderTimelineRow = useCallback(({ item: channel }: { item: Channel }) => {
    const programs = epg[getEpgKey(channel)] || [];
    const isFocused = focusedChannelId === channel.id;

    return (
      <EpgRow
        channel={channel}
        programs={programs}
        isFocused={isFocused}
        onChannelPress={onChannelPress}
        onProgramPress={onProgramPress}
        timelineStart={timelineStart}
        timelineEnd={timelineEnd}
        now={now}
        PIXELS_PER_MINUTE={PIXELS_PER_MINUTE}
        hasCatchup={hasCatchup}
        setFocusedChannelId={handleFocusedChannelChange}
        emptyEpgLabel={t('emptyEpg')}
      />
    );
  }, [epg, getEpgKey, focusedChannelId, onChannelPress, onProgramPress, timelineStart, timelineEnd, now, hasCatchup, handleFocusedChannelChange, t]);

  const renderChannelColumnItem = useCallback(({ item: channel, index }: { item: Channel; index: number }) => (
    <ChannelColumnItem
      channel={channel}
      isFocused={focusedChannelId === channel.id}
      isPlaying={currentStreamId === channel.id}
      isFav={isFavorite(channel.id)}
      hasTVPreferredFocus={shouldFocusFirstItem && index === 0}
      setFocusedChannelId={handleFocusedChannelChange}
      onChannelPress={onChannelPress}
      addFavorite={addFavorite}
      removeFavorite={removeFavorite}
      hasCatchup={hasCatchup}
    />
  ), [focusedChannelId, currentStreamId, isFavorite, shouldFocusFirstItem, handleFocusedChannelChange, onChannelPress, addFavorite, removeFavorite, hasCatchup]);

  const skeletonRows = useMemo(() => {
    const rowCount = Math.min(displayedChannels.list.length || 6, Platform.isTV ? 6 : 5);
    return Array.from({ length: rowCount }, (_, index) => index);
  }, [displayedChannels.list.length]);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={[styles.channelHeaderSpace, { width: CHANNEL_COLUMN_WIDTH }]}>
          <View style={styles.quickJumpContainer}>
            <TouchableOpacity
              style={[
                styles.quickJumpButton,
                focusedQuickJumpButton === 'now' && styles.quickJumpButtonFocused,
              ]}
              onPress={jumpToNow}
              onFocus={() => setFocusedQuickJumpButton('now')}
              onBlur={() => setFocusedQuickJumpButton((current) => (current === 'now' ? null : current))}
              isTVSelectable={true}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={t('nowPlaying')}
            >
              <Text style={styles.quickJumpButtonText}>{t('nowPlaying')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.quickJumpButton,
                focusedQuickJumpButton === 'plus2' && styles.quickJumpButtonFocused,
              ]}
              onPress={jumpForwardTwoHours}
              onFocus={() => setFocusedQuickJumpButton('plus2')}
              onBlur={() => setFocusedQuickJumpButton((current) => (current === 'plus2' ? null : current))}
              isTVSelectable={true}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={t('epgPlus2h')}
            >
              <Text style={styles.quickJumpButtonText}>{t('epgPlus2h')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.quickJumpButton,
                focusedQuickJumpButton === 'evening' && styles.quickJumpButtonFocused,
              ]}
              onPress={jumpToEvening}
              onFocus={() => setFocusedQuickJumpButton('evening')}
              onBlur={() => setFocusedQuickJumpButton((current) => (current === 'evening' ? null : current))}
              isTVSelectable={true}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={t('epgEvening')}
            >
              <Text style={styles.quickJumpButtonText}>{t('epgEvening')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.quickJumpButton,
                styles.quickJumpIconButton,
                favoritesOnly && styles.quickJumpButtonActive,
                focusedQuickJumpButton === 'favorites' && styles.quickJumpButtonFocused,
              ]}
              onPress={() => setFavoritesOnly((prev) => !prev)}
              onFocus={() => setFocusedQuickJumpButton('favorites')}
              onBlur={() => setFocusedQuickJumpButton((current) => (current === 'favorites' ? null : current))}
              accessible={true}
              accessibilityRole="tab"
              accessibilityState={{ selected: favoritesOnly }}
              accessibilityLabel={t('favoritesOnly')}
              isTVSelectable={true}
            >
              <Icon name={favoritesOnly ? 'star' : 'star-border'} size={Platform.isTV ? 14 : 12} color="#FAFAFA" />
            </TouchableOpacity>
          </View>
        </View>
        <View style={{ flex: 1, overflow: 'hidden' }} focusable={false}>
          <Animated.View style={{ width: totalWidth, flexDirection: 'row', transform: [{ translateX: Animated.multiply(scrollXAnimated, -1) }] }}>
            {timeHeaders}
            {/* Current Time Line in Header */}
            <View style={[styles.currentTimeIndicator, { left: nowPosition, height: 40 }]} />
          </Animated.View>
        </View>
      </View>
      {!showDelayedSkeleton && focusedPreview && (
        <View style={styles.focusPreviewBar}>
          <View style={styles.focusPreviewChannel}>
            <Image
              source={focusedPreview.channel.logo && focusedPreview.channel.logo.startsWith('http')
                ? { uri: focusedPreview.channel.logo }
                : require('../assets/character_logo.png')}
              style={styles.focusPreviewLogo}
              resizeMode="contain"
            />
            <View style={styles.focusPreviewChannelText}>
              <Text style={styles.focusPreviewChannelName} numberOfLines={1}>
                {focusedPreview.channel.name}
              </Text>
              <View style={styles.focusPreviewFlags}>
                {focusedPreview.isPlaying && <Icon name="play-arrow" size={Platform.isTV ? 13 : 12} color="#E9692A" />}
                {focusedPreview.isFav && <Icon name="favorite" size={Platform.isTV ? 12 : 11} color="#E9692A" />}
                {focusedPreview.hasCatchupSupport && <Icon name="history" size={Platform.isTV ? 12 : 11} color="#69F0AE" />}
              </View>
            </View>
          </View>
          <View style={styles.focusPreviewPrograms}>
            <Text style={styles.focusPreviewCurrentText} numberOfLines={1}>
              {focusedPreview.currentProgram
                ? `${formatTime(focusedPreview.currentProgram.start)} - ${focusedPreview.currentProgram.title}`
                : t('focusPreviewNoEpg')}
            </Text>
            <Text style={styles.focusPreviewNextText} numberOfLines={1}>
              {focusedPreview.nextProgram
                ? `${t('focusPreviewNext')}: ${formatTime(focusedPreview.nextProgram.start)} - ${focusedPreview.nextProgram.title}`
                : `${t('focusPreviewNext')}: —`}
            </Text>
          </View>
        </View>
      )}

      <View style={{ flex: 1 }} onLayout={(e) => setVisibleWidth(e.nativeEvent.layout.width)}>
        {showDelayedSkeleton ? (
          <View style={styles.skeletonContainer}>
            <View style={[styles.fixedChannelColumn, { width: CHANNEL_COLUMN_WIDTH }]}>
              {skeletonRows.map((row) => (
                <View key={`channel-skeleton-${row}`} style={styles.skeletonChannelRow}>
                  <View style={styles.skeletonLogo} />
                  <View style={styles.skeletonChannelLine} />
                </View>
              ))}
            </View>
            <View style={{ flex: 1, marginLeft: CHANNEL_COLUMN_WIDTH }}>
              {skeletonRows.map((row) => (
                <View key={`timeline-skeleton-${row}`} style={styles.skeletonTimelineRow}>
                  <View style={[styles.skeletonProgramBlock, styles.skeletonProgramPrimary]} />
                  <View style={[styles.skeletonProgramBlock, styles.skeletonProgramSecondary]} />
                  <Text style={styles.skeletonLabel}>{t('epgLoading')}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : (
        <Animated.ScrollView
            horizontal
            showsHorizontalScrollIndicator={true}
            ref={mainScrollViewRef}
            style={{ marginLeft: CHANNEL_COLUMN_WIDTH }}
            focusable={false}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: scrollXAnimated } } }],
              {
                useNativeDriver: true,
                listener: (e: any) => {
                  const newScrollX = e.nativeEvent.contentOffset.x;
                  if (Math.abs(scrollXRef.current - newScrollX) > SCROLL_SYNC_THRESHOLD) {
                    scrollXRef.current = newScrollX;
                  }
                },
              }
            )}
            scrollEventThrottle={16}
        >
          <View style={{ width: totalWidth }}>
              {/* Vertical Time Line across all rows */}
              <View style={[styles.currentTimeLine, { left: nowPosition }]} />

              <FlatList
                 ref={timelineListRef}
                 data={displayedChannels.list}
                 keyExtractor={item => item.id}
                 extraData={timelineExtraData}
                 onScroll={(e) => syncVerticalScroll(e.nativeEvent.contentOffset.y)}
                 scrollEventThrottle={16}
                 initialNumToRender={10}
                 maxToRenderPerBatch={10}
                 windowSize={5}
                 removeClippedSubviews={false}
                 getItemLayout={(_data, index) => ({
                    length: Platform.isTV ? 92 : 60,
                    offset: (Platform.isTV ? 92 : 60) * index,
                    index,
                 })}
                 onScrollToIndexFailed={handleTimelineScrollToIndexFailed}
                 renderItem={renderTimelineRow}
              />
          </View>
        </Animated.ScrollView>
        )}
        {!showDelayedSkeleton && (
          <View style={[styles.fixedChannelColumn, { width: CHANNEL_COLUMN_WIDTH }]}>
            <FlatList
              ref={channelListRef}
              data={displayedChannels.list}
              keyExtractor={(item) => item.id}
              extraData={channelColumnExtraData}
              scrollEnabled={false}
              initialNumToRender={10}
              maxToRenderPerBatch={10}
              windowSize={5}
              removeClippedSubviews={false}
              getItemLayout={(_data, index) => ({
                length: Platform.isTV ? 92 : 60,
                offset: (Platform.isTV ? 92 : 60) * index,
                index,
              })}
              onScrollToIndexFailed={handleChannelListScrollToIndexFailed}
              renderItem={renderChannelColumnItem}
            />
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(18,18,30,0.98)',
  },
  headerRow: {
    flexDirection: 'row',
    height: Platform.isTV ? 56 : 44,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(233,105,42,0.12)',
    backgroundColor: '#1E1E2E',
  },
  channelHeaderSpace: {
    width: 120,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  quickJumpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Platform.isTV ? 8 : 4,
  },
  quickJumpButton: {
    backgroundColor: 'rgba(233,105,42,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(233,105,42,0.35)',
    borderRadius: 5,
    paddingHorizontal: Platform.isTV ? 6 : 4,
    paddingVertical: Platform.isTV ? 5 : 3,
    marginRight: 4,
  },
  quickJumpIconButton: {
    marginRight: 0,
    minWidth: Platform.isTV ? 28 : 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickJumpButtonActive: {
    backgroundColor: 'rgba(233,105,42,0.38)',
    borderColor: 'rgba(233,105,42,0.7)',
  },
  quickJumpButtonFocused: {
    borderWidth: 2,
    borderColor: '#E9692A',
    backgroundColor: 'rgba(233,105,42,0.35)',
  },
  quickJumpButtonText: {
    color: '#FAFAFA',
    fontSize: Platform.isTV ? 12 : 10,
    fontWeight: '600',
  },
  timeHeaderItem: {
    justifyContent: 'center',
    paddingLeft: 12,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.04)',
  },
  timeHeaderText: {
    color: '#71717A',
    fontSize: 12,
    fontWeight: '500',
  },
  currentTimeIndicator: {
    position: 'absolute',
    width: 2,
    backgroundColor: '#EF4444',
    zIndex: 10,
    borderRadius: 1,
  },
  currentTimeLine: {
    position: 'absolute',
    width: 2,
    height: '100%',
    backgroundColor: 'rgba(239, 68, 68, 0.4)',
    zIndex: 5,
  },
  focusPreviewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: Platform.isTV ? 58 : 48,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    backgroundColor: 'rgba(24,24,38,0.95)',
  },
  focusPreviewChannel: {
    width: Platform.isTV ? 220 : 180,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  focusPreviewLogo: {
    width: Platform.isTV ? 58 : 42,
    height: Platform.isTV ? 34 : 26,
    borderRadius: 4,
    marginRight: 8,
  },
  focusPreviewChannelText: {
    flex: 1,
  },
  focusPreviewChannelName: {
    color: '#FAFAFA',
    fontSize: Platform.isTV ? 14 : 12,
    fontWeight: '700',
  },
  focusPreviewFlags: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  focusPreviewPrograms: {
    flex: 1,
    justifyContent: 'center',
  },
  focusPreviewCurrentText: {
    color: '#F5F5F5',
    fontSize: Platform.isTV ? 13 : 11,
    fontWeight: '600',
  },
  focusPreviewNextText: {
    marginTop: 2,
    color: '#9CA3AF',
    fontSize: Platform.isTV ? 12 : 10,
    fontWeight: '500',
  },
  skeletonContainer: {
    flex: 1,
  },
  skeletonChannelRow: {
    height: Platform.isTV ? 92 : 60,
    paddingHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
    backgroundColor: '#1E1E2E',
  },
  skeletonLogo: {
    width: Platform.isTV ? 58 : 34,
    height: Platform.isTV ? 32 : 20,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.09)',
    marginBottom: 8,
  },
  skeletonChannelLine: {
    width: Platform.isTV ? 86 : 60,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  skeletonTimelineRow: {
    height: Platform.isTV ? 92 : 60,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
    justifyContent: 'center',
    paddingHorizontal: 14,
    backgroundColor: 'rgba(18,18,30,0.98)',
  },
  skeletonProgramBlock: {
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  skeletonProgramPrimary: {
    width: '48%',
    height: Platform.isTV ? 42 : 28,
    marginBottom: 8,
  },
  skeletonProgramSecondary: {
    width: '28%',
    height: Platform.isTV ? 28 : 18,
    opacity: 0.8,
  },
  skeletonLabel: {
    position: 'absolute',
    right: 14,
    top: Platform.isTV ? 18 : 12,
    color: '#71717A',
    fontSize: Platform.isTV ? 12 : 10,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    height: ROW_HEIGHT,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  rowFocused: {
    backgroundColor: 'rgba(233,105,42,0.1)',
  },
  fixedChannelColumn: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#1E1E2E',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.06)',
    zIndex: 20,
  },
  channelBox: {
    width: CHANNEL_COLUMN_WIDTH,
    height: ROW_HEIGHT,
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.06)',
    backgroundColor: '#1E1E2E',
    zIndex: 10,
    borderRadius: 0,
  },
  focusRightEdge: {
    position: 'absolute',
    right: -1,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: '#E9692A',
    zIndex: 30,
  },
  channelLogo: {
    width: Platform.isTV ? 62 : 36,
    height: Platform.isTV ? 40 : 24,
    marginBottom: 4,
    borderRadius: 6,
  },
  logoContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  catchupBadge: {
    position: 'absolute',
    bottom: 2,
    right: -4,
    backgroundColor: 'rgba(233, 105, 42, 0.9)',
    borderRadius: 4,
    padding: 2,
    zIndex: 10,
  },
  channelName: {
    color: '#FAFAFA',
    fontSize: Platform.isTV ? 17 : 11,
    textAlign: 'center',
    fontWeight: '500',
    paddingHorizontal: 4,
  },
  programsContainer: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  programBlock: {
    position: 'absolute',
    height: Platform.isTV ? 80 : 52,
    top: 6,
    borderRadius: 10,
    padding: Platform.isTV ? 10 : 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  programTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  programTitle: {
    fontSize: Platform.isTV ? 15 : 12,
    fontWeight: '600',
    letterSpacing: 0.1,
    textAlign: 'center',
  },
  programTime: {
    fontSize: Platform.isTV ? 13 : 10,
    color: '#71717A',
    marginTop: 3,
    fontWeight: '400',
    textAlign: 'center',
  },
  emptyProgramFallback: {
    height: Platform.isTV ? 80 : 52,
    marginTop: 6,
    marginHorizontal: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(26,26,46,0.55)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 10,
  },
  emptyProgramFallbackFocused: {
    borderColor: '#E9692A',
    borderWidth: 2,
    backgroundColor: 'rgba(233,105,42,0.18)',
  },
  emptyProgramFallbackText: {
    color: '#A1A1AA',
    fontSize: Platform.isTV ? 14 : 12,
    fontWeight: '500',
  },
});

export default EpgTimeline;
