import React, { useRef, useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, FlatList, Platform } from 'react-native';
import { Channel } from '../types';
import { useSettings } from '../context/SettingsContext';
import { useIPTV } from '../context/IPTVContext';
import { isCatchupChannel } from '../utils/epgUtils';

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

    // Check if channel has catchup and this program is in the past
    // Let's assume onProgramPress will handle it if it's available
    const canCatchup = isPast && isCatchupChannel(channel) && prog.end > Date.now() - (channel.catchupDays || 0) * 24 * 60 * 60 * 1000;

    return (
        <TouchableOpacity
            style={[
                styles.programBlock,
                { left: leftOffset, width: Math.max(width - 2, 2) },
                isNow ? { backgroundColor: 'rgba(0, 122, 255, 0.4)' } : (isPast ? { backgroundColor: 'rgba(50,50,50,0.8)' } : { backgroundColor: 'rgba(80,80,80,0.8)' }),
                isProgramFocused && { backgroundColor: 'rgba(255, 255, 255, 0.4)', borderWidth: 2, borderColor: colors.primary }
            ]}
            onFocus={() => setIsProgramFocused(true)}
            onBlur={() => setIsProgramFocused(false)}
            onPress={() => {
                if (onProgramPress) {
                    onProgramPress(channel, prog);
                } else if (isNow || canCatchup) {
                    onChannelPress(channel); // Usually onProgramPress is provided and handles catchup, but fallback here
                }
            }}
        >
            <Text style={[styles.programTitle, isPast ? { color: '#888' } : { color: '#FFF' }, { fontSize: Platform.isTV ? 16 : 14 }]} numberOfLines={1}>{prog.title}</Text>
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
                    isPlaying && { borderLeftWidth: 3, borderLeftColor: colors.primary },
                    isFocused && { backgroundColor: 'rgba(255, 255, 255, 0.4)', borderWidth: 2, borderColor: colors.primary }
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

  // Check if any visible channel supports catchup
  const canGoToPast = useMemo(() => {
    for (let i = 0; i < channels.length; i++) {
      if (isCatchupChannel(channels[i])) {
        return true;
      }
    }
    return false;
  }, [channels]);

  // Adjust timeline start based on whether catchup is available for these channels
  const timelineStart = useMemo(() => {
    const d = new Date(now);
    if (canGoToPast) {
      // Find the maximum catchup duration across these channels
      let maxCatchupHours = TIMELINE_START_OFFSET_HOURS;
      for (let i = 0; i < channels.length; i++) {
         const channel = channels[i];
         if (isCatchupChannel(channel)) {
            const hours = (channel.catchupDays || 0) * 24;
            const archiveHours = channel.tvArchiveDuration || channel.tv_archive_duration || 0;
            maxCatchupHours = Math.max(maxCatchupHours, hours > 0 ? hours : (archiveHours > 0 ? archiveHours : 24)); // Default to 24h if catchup flag set but no duration
         }
      }
      // Don't show too much past to avoid massive timelines, limit to e.g. 72 hours max
      d.setHours(d.getHours() - Math.min(maxCatchupHours, 72));
    } else {
      d.setHours(d.getHours() - TIMELINE_START_OFFSET_HOURS);
    }
    d.setMinutes(0, 0, 0);
    return d;
  }, [now, canGoToPast, channels]);

  const timelineDuration = useMemo(() => {
    return (canGoToPast) ? Math.min(72, TIMELINE_DURATION_HOURS + 24) : TIMELINE_DURATION_HOURS; // Adjust total duration
  }, [canGoToPast]);

  const timelineEnd = useMemo(() => {
    const d = new Date(timelineStart);
    d.setHours(d.getHours() + timelineDuration);
    return d;
  }, [timelineStart, timelineDuration]);

  const totalWidth = timelineDuration * HOUR_WIDTH;

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
    for (let i = 0; i < timelineDuration; i++) {
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
    backgroundColor: 'rgba(20,20,20,0.95)',
  },
  headerRow: {
    flexDirection: 'row',
    height: 40,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    backgroundColor: '#111',
  },
  channelHeaderSpace: {
    width: 120,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.1)',
  },
  timeHeaderItem: {
    justifyContent: 'center',
    paddingLeft: 8,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.05)',
  },
  timeHeaderText: {
    color: '#AAA',
    fontSize: 12,
  },
  currentTimeIndicator: {
    position: 'absolute',
    width: 2,
    backgroundColor: '#FF3B30',
    zIndex: 10,
  },
  currentTimeLine: {
    position: 'absolute',
    width: 2,
    height: '100%',
    backgroundColor: 'rgba(255, 59, 48, 0.5)',
    zIndex: 5,
  },
  row: {
    flexDirection: 'row',
    height: Platform.isTV ? 80 : 60,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  rowFocused: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  channelBox: {
    width: Platform.isTV ? 160 : 120,
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.1)',
    backgroundColor: '#1C1C1E',
    position: 'absolute',
    left: 0,
    height: Platform.isTV ? 80 : 60,
    zIndex: 10, // keep on top of scrolled content
  },
  channelLogo: {
    width: Platform.isTV ? 48 : 36,
    height: Platform.isTV ? 32 : 24,
    marginBottom: 2,
  },
  channelName: {
    color: '#FFF',
    fontSize: Platform.isTV ? 16 : 10,
    textAlign: 'center',
  },
  programsContainer: {
    flex: 1,
    position: 'relative',
    marginLeft: Platform.isTV ? 160 : 120, // offset for fixed channel box
  },
  programBlock: {
    position: 'absolute',
    height: Platform.isTV ? 70 : 50,
    top: 5,
    borderRadius: 4,
    padding: Platform.isTV ? 8 : 4,
    justifyContent: 'center',
  },
  programTitle: {
    fontSize: Platform.isTV ? 16 : 12,
    fontWeight: 'bold',
  },
  programTime: {
    fontSize: Platform.isTV ? 14 : 10,
    color: '#AAA',
    marginTop: 2,
  }
});

export default EpgTimeline;
