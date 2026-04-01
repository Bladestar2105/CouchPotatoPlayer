import React, { useRef, useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, FlatList, Platform } from 'react-native';
import { Channel } from '../types';
import { useSettings } from '../context/SettingsContext';
import { useIPTV } from '../context/IPTVContext';

const PIXELS_PER_MINUTE = Platform.isTV ? 8 : 4; // Stretch timeline for TV
const HOUR_WIDTH = PIXELS_PER_MINUTE * 60;
const TIMELINE_START_OFFSET_HOURS = 2; // Show x hours before now
const TIMELINE_DURATION_HOURS = 24; // Total hours in timeline

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
const formatTime = (d: Date) => timeFormatter.format(d);

const ProgramBlock = React.memo(({ prog, channel, isNow, isPast, leftOffset, width, colors, onProgramPress, onChannelPress }: any) => {
    const [isProgramFocused, setIsProgramFocused] = useState(false);
    return (
        <TouchableOpacity
            style={[
                styles.programBlock,
                { left: leftOffset, width: Math.max(width - 2, 2) },
                isNow ? { backgroundColor: 'rgba(59, 130, 246, 0.35)' } : (isPast ? { backgroundColor: 'rgba(39, 39, 42, 0.9)' } : { backgroundColor: 'rgba(63, 63, 70, 0.8)' }),
                isProgramFocused && { backgroundColor: 'rgba(59, 130, 246, 0.4)', borderWidth: 2, borderColor: '#3B82F6' }
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
        >
            <Text style={[styles.programTitle, isPast ? { color: '#71717A' } : { color: '#FAFAFA' }, { fontSize: Platform.isTV ? 15 : 13 }]} numberOfLines={1}>{prog.title}</Text>
            <Text style={[styles.programTime, { fontSize: Platform.isTV ? 14 : 12 }]} numberOfLines={1}>
                {formatTime(new Date(prog.start))} - {formatTime(new Date(prog.end))}
            </Text>
        </TouchableOpacity>
    );
}, (prevProps, nextProps) => {
    return prevProps.prog === nextProps.prog &&
           prevProps.isNow === nextProps.isNow &&
           prevProps.leftOffset === nextProps.leftOffset &&
           prevProps.width === nextProps.width;
});

const EpgRow = React.memo(({ channel, programs, isFocused, isPlaying, isFav, colors, focusedChannelId, setFocusedChannelId, onChannelPress, onProgramPress, addFavorite, removeFavorite, timelineStart, timelineEnd, now, PIXELS_PER_MINUTE, hasTVPreferredFocus }: any) => {
    // ⚡ Perf: Pre-compute program layout data in a memoized pass to avoid
    // recalculating boundaries, offsets, and time comparisons on every render.
    const programLayoutData = useMemo(() => {
        const timelineStartMs = timelineStart.getTime();
        const timelineEndMs = timelineEnd.getTime();
        const nowMs = now.getTime();

        const result: Array<{
            prog: any;
            idx: number;
            leftOffset: number;
            width: number;
            isNow: boolean;
            isPast: boolean;
        }> = [];

        for (let idx = 0; idx < programs.length; idx++) {
            const prog = programs[idx];
            const startMs = prog.start;
            const endMs = prog.end;

            // Skip if fully outside timeline
            if (endMs <= timelineStartMs || startMs >= timelineEndMs) continue;

            const renderStartMs = Math.max(startMs, timelineStartMs);
            const renderEndMs = Math.min(endMs, timelineEndMs);

            result.push({
                prog,
                idx,
                leftOffset: ((renderStartMs - timelineStartMs) / 60000) * PIXELS_PER_MINUTE,
                width: ((renderEndMs - renderStartMs) / 60000) * PIXELS_PER_MINUTE,
                isNow: nowMs >= startMs && nowMs < endMs,
                isPast: nowMs >= endMs,
            });
        }

        return result;
    }, [programs, timelineStart, timelineEnd, now, PIXELS_PER_MINUTE]);

    return (
        <View style={[styles.row, isFocused && styles.rowFocused]}>
            {/* Channel Info Fixed on Left */}
            <TouchableOpacity
                hasTVPreferredFocus={hasTVPreferredFocus}
                style={[
                    styles.channelBox,
                    isPlaying && { borderLeftWidth: 3, borderLeftColor: '#3B82F6' },
                    isFocused && { backgroundColor: 'rgba(59, 130, 246, 0.2)', borderWidth: 2, borderColor: '#3B82F6' }
                ]}
                onPress={() => onChannelPress(channel)}
                onFocus={() => setFocusedChannelId(channel.id)}
                onLongPress={() => {
                   if (isFav) removeFavorite(channel.id);
                   else addFavorite({ id: channel.id, type: 'live', name: channel.name, icon: channel.logo, categoryId: channel.categoryId, addedAt: Date.now() });
                }}
            >
                <Image
                    source={channel.logo && channel.logo.startsWith('http') ? { uri: channel.logo } : require('../assets/icon.png')}
                    style={styles.channelLogo}
                    resizeMode="contain"
                    defaultSource={require('../assets/icon.png')}
                />
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
           prevProps.programs === nextProps.programs;
});

const EpgTimeline: React.FC<EpgTimelineProps> = ({ channels, onChannelPress, onProgramPress, focusedChannelId, setFocusedChannelId, currentStreamId, shouldFocusFirstItem }) => {
  const { epg, hasCatchup, getCatchupUrl, isFavorite, addFavorite, removeFavorite } = useIPTV();
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
    if (scrollViewRef.current && nowPosition > 100) {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ x: nowPosition - 100, animated: false });
      }, 100);
    }
  }, [nowPosition]);

  const timeHeaders = useMemo(() => {
    const headers = [];
    for (let i = 0; i < TIMELINE_DURATION_HOURS; i++) {
      const d = new Date(timelineStart);
      d.setHours(d.getHours() + i);

      const showDate = d.getHours() === 0 || i === 0;

      headers.push(
        <View key={i} style={[styles.timeHeaderItem, { width: HOUR_WIDTH }]}>
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

      <View style={{ flex: 1 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={true} onScroll={(e) => {
            if (scrollViewRef.current) {
                scrollViewRef.current.scrollTo({ x: e.nativeEvent.contentOffset.x, animated: false });
            }
        }} scrollEventThrottle={16}>
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
    backgroundColor: 'rgba(13,13,15,0.98)',
  },
  headerRow: {
    flexDirection: 'row',
    height: 44,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    backgroundColor: '#18181B',
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
    backgroundColor: 'rgba(59,130,246,0.08)',
  },
  channelBox: {
    width: Platform.isTV ? 160 : 120,
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.06)',
    backgroundColor: '#18181B',
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
