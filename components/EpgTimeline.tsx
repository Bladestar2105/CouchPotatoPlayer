import React, { useRef, useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, FlatList, Platform } from 'react-native';
import { Channel } from '../types';
import { useSettings } from '../context/SettingsContext';
import { useIPTV } from '../context/IPTVContext';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { isProgramCatchupAvailable, getCatchupDays } from '../utils/catchupUtils';

const PIXELS_PER_MINUTE = Platform.isTV ? 8 : 4; // Stretch timeline for TV
const HOUR_WIDTH = PIXELS_PER_MINUTE * 60;


interface EpgTimelineProps {
  channels: Channel[];
  onChannelPress: (channel: Channel) => void;
  onProgramPress?: (channel: Channel, prog: any) => void;
  focusedChannelId: string | null;
  setFocusedChannelId: (id: string) => void;
  currentStreamId: string | undefined;
  shouldFocusFirstItem?: boolean;
}

// ⚡ Bolt: Cache Intl.DateTimeFormat instance to avoid slow initialization overhead on every render
const timeFormatter = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' });
const formatTime = (d: Date | number) => timeFormatter.format(d);

const ProgramBlock = React.memo(({ prog, channel, isNow, isPast, isCatchupAvailable, leftOffset, width, colors, onProgramPress, onChannelPress }: any) => {
    const [isProgramFocused, setIsProgramFocused] = useState(false);
    const isClickable = isNow || isCatchupAvailable;

    let bgColor = 'rgba(42, 42, 74, 0.7)'; // future
    if (isNow) bgColor = 'rgba(124, 77, 255, 0.35)';
    else if (isCatchupAvailable) bgColor = 'rgba(105, 240, 174, 0.15)'; // catchup-available past: subtle green tint
    else if (isPast) bgColor = 'rgba(26, 26, 46, 0.9)'; // non-catchup past: dark

    return (
        <TouchableOpacity
            style={[
                styles.programBlock,
                { left: leftOffset, width: Math.max(width - 2, 2) },
                { backgroundColor: bgColor },
                isProgramFocused && { backgroundColor: 'rgba(124, 77, 255, 0.4)', borderWidth: 2, borderColor: '#7C4DFF' }
            ]}
            onFocus={() => setIsProgramFocused(true)}
            onBlur={() => setIsProgramFocused(false)}
            onPress={() => {
                if (onProgramPress) {
                    onProgramPress(channel, prog);
                } else if (isNow) {
                    onChannelPress(channel);
                }
            }}
            accessible={true}
            isTVSelectable={true}
            activeOpacity={isClickable ? 0.7 : 1}
        >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                {isCatchupAvailable && !isNow && (
                    <Icon name="play-circle-outline" size={Platform.isTV ? 14 : 12} color="#69F0AE" style={{ marginRight: 2 }} />
                )}
                <Text style={[styles.programTitle, (isPast && !isCatchupAvailable) ? { color: '#71717A' } : { color: '#FAFAFA' }, { fontSize: Platform.isTV ? 15 : 13, flex: 1 }]} numberOfLines={1}>{prog.title}</Text>
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

const EpgRow = React.memo(({ channel, programs, isFocused, isPlaying, isFav, colors, focusedChannelId, setFocusedChannelId, onChannelPress, onProgramPress, addFavorite, removeFavorite, timelineStart, timelineEnd, now, PIXELS_PER_MINUTE, hasTVPreferredFocus, hasCatchup, scrollX, visibleWidth }: any) => {
    // ⚡ Perf: Pre-compute program layout data in a memoized pass to avoid
    // recalculating boundaries, offsets, and time comparisons on every render.
    const programLayoutData = useMemo(() => {
        const timelineStartMs = timelineStart.getTime();
        const timelineEndMs = timelineEnd.getTime();
        const nowMs = now.getTime();

        const channelHasCatchup = hasCatchup ? hasCatchup(channel) : false;

        // Calculate visible time window based on scroll position with a generous buffer
        const visibleStartMs = timelineStart.getTime() + (Math.max(0, scrollX - 1000) / PIXELS_PER_MINUTE) * 60000;
        const visibleEndMs = timelineStart.getTime() + ((scrollX + visibleWidth + 1000) / PIXELS_PER_MINUTE) * 60000;


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

            // Only render blocks that are within our visible window (with buffer)
            if (endMs < visibleStartMs || startMs > visibleEndMs) {
                continue;
            }

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
                isCatchupAvailable: isProg_Past && channelHasCatchup
                    ? isProgramCatchupAvailable(channel, new Date(startMs), new Date(endMs))
                    : false,
            });
        }

        return result;
    }, [programs, timelineStart, timelineEnd, now, PIXELS_PER_MINUTE, scrollX, visibleWidth]);

    return (
        <View style={[styles.row, isFocused && styles.rowFocused]}>
            {/* Channel Info Fixed on Left */}
            <TouchableOpacity
                accessible={true}
                isTVSelectable={true}
                hasTVPreferredFocus={hasTVPreferredFocus}
                style={[
                    styles.channelBox,
                    isPlaying && { borderLeftWidth: 3, borderLeftColor: '#7C4DFF' },
                    isFocused && { backgroundColor: 'rgba(124, 77, 255, 0.2)', borderWidth: 2, borderColor: '#7C4DFF' }
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
                        source={channel.logo && channel.logo.startsWith('http') ? { uri: channel.logo } : require('../assets/icon.png')}
                        style={styles.channelLogo}
                        resizeMode="contain"
                        defaultSource={require('../assets/icon.png')}
                    />
                    {/* Catchup badge */}
                    {hasCatchup && hasCatchup(channel) && (
                        <View style={styles.catchupBadge}>
                            <Icon name="history" size={10} color="#FFF" />
                        </View>
                    )}
                </View>
              <Text style={[styles.channelName, { fontSize: Platform.isTV ? 16 : 14 }]} numberOfLines={1}>{channel.name}</Text>
            </TouchableOpacity>

            {/* Programs Timeline */}
            <View style={styles.programsContainer}>
                {programLayoutData.map((item) => (
                    <ProgramBlock
                        key={`${channel.id}-${item.idx}`}
                        prog={item.prog}
                        channel={channel}
                        isNow={item.isNow}
                        isPast={item.isPast}
                        isCatchupAvailable={item.isCatchupAvailable}
                        leftOffset={item.leftOffset}
                        width={item.width}
                        colors={colors}
                        onChannelPress={onChannelPress}
                        onProgramPress={onProgramPress}
                    />
                ))}
            </View>
        </View>
    );
}, (prevProps, nextProps) => {
    return prevProps.isFocused === nextProps.isFocused &&
           prevProps.isPlaying === nextProps.isPlaying &&
           prevProps.isFav === nextProps.isFav &&
           prevProps.programs === nextProps.programs &&
           prevProps.channel === nextProps.channel &&
           prevProps.scrollX === nextProps.scrollX &&
           prevProps.visibleWidth === nextProps.visibleWidth;
});

const EpgTimeline: React.FC<EpgTimelineProps> = ({ channels, onChannelPress, onProgramPress, focusedChannelId, setFocusedChannelId, currentStreamId, shouldFocusFirstItem }) => {
  const { epg, hasCatchup, getCatchupUrl, isFavorite, addFavorite, removeFavorite } = useIPTV();

  const [scrollX, setScrollX] = useState(0);
  const [visibleWidth, setVisibleWidth] = useState(1000);
  const mainScrollViewRef = useRef<ScrollView>(null);

  // Calculate max catchup days across all visible channels
  const maxCatchupDays = useMemo(() => {
    let max = 0;
    for (const channel of channels) {
      if (hasCatchup && hasCatchup(channel)) {
         max = Math.max(max, getCatchupDays(channel));
      }
    }
    return max;
  }, [channels, hasCatchup]);

  const TIMELINE_START_OFFSET_HOURS = useMemo(() => {
    // Show either 2 hours before now (default) or max catchup days available
    return Math.max(2, maxCatchupDays * 24);
  }, [maxCatchupDays]);

  // Timeline is start offset + 24 hours into the future
  const TIMELINE_DURATION_HOURS = TIMELINE_START_OFFSET_HOURS + 24;

  const { colors } = useSettings();
  const scrollViewRef = useRef<ScrollView>(null);

  const [now] = useState(new Date());

  const timelineStart = useMemo(() => {
    const d = new Date(now);
    d.setHours(d.getHours() - TIMELINE_START_OFFSET_HOURS);
    d.setMinutes(0, 0, 0);
    return d;
  }, [now]);

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

  // Scroll to current time on mount
  useEffect(() => {
    const targetX = Math.max(0, nowPosition - (visibleWidth / 2));
    if (scrollViewRef.current && targetX > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ x: targetX, animated: false });
        mainScrollViewRef.current?.scrollTo({ x: targetX, animated: false });
        setScrollX(targetX);
      }, 100);
    }
  }, [nowPosition, visibleWidth]);

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

  const getEpgKey = (channel: Channel): string => {
    if (channel.epgChannelId && channel.epgChannelId.length > 0) {
      return channel.epgChannelId;
    }
    return channel.tvgId || channel.id;
  };

  const defaultLogo = require('../assets/icon.png'); // fallback

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={[styles.channelHeaderSpace, { width: Platform.isTV ? 160 : 120 }]}></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} ref={scrollViewRef} scrollEnabled={false} style={{flex: 1}}>
            <View style={{ width: totalWidth, flexDirection: 'row' }}>
                {timeHeaders}
                {/* Current Time Line in Header */}
                <View style={[styles.currentTimeIndicator, { left: nowPosition, height: 40 }]} />
            </View>
        </ScrollView>
      </View>

      <View style={{ flex: 1 }} onLayout={(e) => setVisibleWidth(e.nativeEvent.layout.width)}>
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={true}
            ref={mainScrollViewRef}
            onScroll={(e) => {
                const newScrollX = e.nativeEvent.contentOffset.x;
                if (scrollViewRef.current) {
                    scrollViewRef.current.scrollTo({ x: newScrollX, animated: false });
                }
                // Debounce state updates to avoid excessive re-renders during smooth scrolling
                if (Math.abs(scrollX - newScrollX) > 500) {
                   setScrollX(newScrollX);
                }
            }}
            scrollEventThrottle={16}
        >
          <View style={{ width: totalWidth + (Platform.isTV ? 160 : 120) }}>
              {/* Vertical Time Line across all rows */}
              <View style={[styles.currentTimeLine, { left: (Platform.isTV ? 160 : 120) + nowPosition }]} />

              <FlatList
                 data={channels}
                 keyExtractor={item => item.id}
                 initialNumToRender={10}
                 maxToRenderPerBatch={10}
                 windowSize={5}
                 removeClippedSubviews={true}
                 getItemLayout={(data, index) => ({
                    length: Platform.isTV ? 80 : 60,
                    offset: (Platform.isTV ? 80 : 60) * index,
                    index,
                 })}
                 renderItem={({ item: channel, index }) => {
                    const epgKey = getEpgKey(channel);
                    const programs = epg[epgKey] || [];
                    const isFocused = focusedChannelId === channel.id;
                    const isPlaying = currentStreamId === channel.id;
                    const isFav = isFavorite(channel.id);

                    return (
                        <EpgRow
                            channel={channel}
                            programs={programs}
                            isFocused={isFocused}
                            isPlaying={isPlaying}
                            isFav={isFav}
                            colors={colors}
                            focusedChannelId={focusedChannelId}
                            setFocusedChannelId={setFocusedChannelId}
                            onChannelPress={onChannelPress}
                            onProgramPress={onProgramPress}
                            addFavorite={addFavorite}
                            removeFavorite={removeFavorite}
                            timelineStart={timelineStart}
                            timelineEnd={timelineEnd}
                            now={now}
                            PIXELS_PER_MINUTE={PIXELS_PER_MINUTE}
                            hasTVPreferredFocus={shouldFocusFirstItem && index === 0}
                            hasCatchup={hasCatchup}
                            scrollX={scrollX}
                            visibleWidth={visibleWidth}
                        />
                    );
                 }}
              />
          </View>
        </ScrollView>
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
    height: 44,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(124,77,255,0.12)',
    backgroundColor: '#1E1E2E',
  },
  channelHeaderSpace: {
    width: 120,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.06)',
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
  row: {
    flexDirection: 'row',
    height: Platform.isTV ? 80 : 64,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  rowFocused: {
    backgroundColor: 'rgba(124,77,255,0.1)',
  },
  channelBox: {
    width: Platform.isTV ? 160 : 120,
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.06)',
    backgroundColor: '#1E1E2E',
    position: 'absolute',
    left: 0,
    height: Platform.isTV ? 80 : 64,
    zIndex: 10,
    borderRadius: 0,
  },
  channelLogo: {
    width: Platform.isTV ? 48 : 36,
    height: Platform.isTV ? 32 : 24,
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
    backgroundColor: 'rgba(124, 77, 255, 0.9)',
    borderRadius: 4,
    padding: 2,
    zIndex: 10,
  },
  channelName: {
    color: '#FAFAFA',
    fontSize: Platform.isTV ? 16 : 11,
    textAlign: 'center',
    fontWeight: '500',
  },
  programsContainer: {
    flex: 1,
    position: 'relative',
    marginLeft: Platform.isTV ? 160 : 120,
  },
  programBlock: {
    position: 'absolute',
    height: Platform.isTV ? 70 : 52,
    top: 6,
    borderRadius: 10,
    padding: Platform.isTV ? 10 : 6,
    justifyContent: 'center',
  },
  programTitle: {
    fontSize: Platform.isTV ? 15 : 12,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  programTime: {
    fontSize: Platform.isTV ? 13 : 10,
    color: '#71717A',
    marginTop: 3,
    fontWeight: '400',
  }
});

export default EpgTimeline;
