import React, { useMemo, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { Clock, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { ChannelLogo } from './ChannelLogo';
import { isMobile, isTV } from '../utils/platform';

interface EpgProgram {
  title: string;
  start: number;
  end: number;
  description?: string;
  category?: string;
}

interface EpgChannel {
  id: string | number;
  name: string;
  icon?: string;
  programs: EpgProgram[];
}

interface EpgGridProps {
  channels: EpgChannel[];
  onProgramPress?: (channelId: string | number, program: EpgProgram) => void;
  onChannelPress?: (channelId: string | number) => void;
  visible: boolean;
  onClose: () => void;
}

const HOUR_WIDTH = isMobile ? 200 : 300;
const ROW_HEIGHT = isMobile ? 56 : 64;
const CHANNEL_COL_WIDTH = isMobile ? 100 : 160;
const HOURS_VISIBLE = 4;

const getCategoryColor = (category?: string): string => {
  if (!category) return '#333';
  const cat = category.toLowerCase();
  if (cat.includes('sport')) return '#FF6B35';
  if (cat.includes('movie') || cat.includes('film')) return '#7B2FF7';
  if (cat.includes('news') || cat.includes('nachrichten')) return '#007AFF';
  if (cat.includes('kids') || cat.includes('kinder')) return '#4CD964';
  if (cat.includes('music') || cat.includes('musik')) return '#FF2D55';
  if (cat.includes('documentary') || cat.includes('doku')) return '#5AC8FA';
  if (cat.includes('series') || cat.includes('serie')) return '#AF52DE';
  if (cat.includes('entertainment') || cat.includes('unterhaltung')) return '#FF9500';
  return '#333';
};

const formatTime = (ts: number): string => {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
};

export const EpgGrid: React.FC<EpgGridProps> = ({
  channels,
  onProgramPress,
  onChannelPress,
  visible,
  onClose,
}) => {
  const scrollRef = useRef<ScrollView>(null);
  const now = Date.now();

  // Time range: 2 hours before now to 6 hours after
  const timeStart = useMemo(() => {
    const d = new Date(now);
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() - 1);
    return d.getTime();
  }, [now]);

  const timeEnd = timeStart + HOURS_VISIBLE * 2 * 3600000;
  const totalWidth = ((timeEnd - timeStart) / 3600000) * HOUR_WIDTH;

  // Generate hour markers
  const hourMarkers = useMemo(() => {
    const markers: { time: number; label: string; left: number }[] = [];
    let t = timeStart;
    while (t < timeEnd) {
      markers.push({
        time: t,
        label: formatTime(t),
        left: ((t - timeStart) / 3600000) * HOUR_WIDTH,
      });
      t += 3600000;
    }
    return markers;
  }, [timeStart, timeEnd]);

  // Current time indicator position
  const nowPosition = ((now - timeStart) / 3600000) * HOUR_WIDTH;

  // Scroll to current time on mount
  const handleLayout = useCallback(() => {
    const scrollTo = Math.max(0, nowPosition - (isMobile ? 80 : 200));
    setTimeout(() => scrollRef.current?.scrollTo({ x: scrollTo, animated: false }), 100);
  }, [nowPosition]);

  if (!visible) return null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <ChevronLeft color="#FFF" size={24} />
          <Text style={styles.headerTitle}>TV Guide</Text>
        </TouchableOpacity>
        <View style={styles.headerRight}>
          <Clock color="#888" size={16} />
          <Text style={styles.headerTime}>{formatTime(now)}</Text>
        </View>
      </View>

      {/* Grid */}
      <View style={styles.gridContainer}>
        {/* Channel column */}
        <View style={styles.channelColumn}>
          {/* Empty corner */}
          <View style={styles.timeHeaderCorner} />
          {/* Channel names */}
          <ScrollView showsVerticalScrollIndicator={false}>
            {channels.map((ch) => (
              <TouchableOpacity
                key={`ch-${ch.id}`}
                style={styles.channelRow}
                onPress={() => onChannelPress?.(ch.id)}
                activeOpacity={0.7}
              >
                <ChannelLogo uri={ch.icon} name={ch.name} size={isMobile ? 28 : 36} borderRadius={isMobile ? 14 : 18} />
                <Text style={styles.channelName} numberOfLines={1}>{ch.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Programs scroll area */}
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          onLayout={handleLayout}
          bounces={false}
        >
          <View style={{ width: totalWidth }}>
            {/* Time header */}
            <View style={styles.timeHeader}>
              {hourMarkers.map((marker) => (
                <View key={marker.time} style={[styles.hourMark, { left: marker.left }]}>
                  <Text style={styles.hourText}>{marker.label}</Text>
                </View>
              ))}
            </View>

            {/* Program rows */}
            <ScrollView showsVerticalScrollIndicator={false}>
              {channels.map((ch) => (
                <View key={`row-${ch.id}`} style={styles.programRow}>
                  {ch.programs
                    .filter((p) => p.end > timeStart && p.start < timeEnd)
                    .map((prog, idx) => {
                      const startClamped = Math.max(prog.start, timeStart);
                      const endClamped = Math.min(prog.end, timeEnd);
                      const left = ((startClamped - timeStart) / 3600000) * HOUR_WIDTH;
                      const width = Math.max(((endClamped - startClamped) / 3600000) * HOUR_WIDTH - 2, 20);
                      const isNow = prog.start <= now && prog.end > now;
                      const progress = isNow ? ((now - prog.start) / (prog.end - prog.start)) * 100 : 0;

                      return (
                        <TouchableOpacity
                          key={`${ch.id}-${idx}`}
                          style={[
                            styles.programBlock,
                            { left, width },
                            isNow && styles.programBlockNow,
                            { borderLeftColor: getCategoryColor(prog.category) },
                          ]}
                          onPress={() => onProgramPress?.(ch.id, prog)}
                          activeOpacity={0.7}
                        >
                          {isNow && (
                            <View style={[styles.programProgress, { width: `${progress}%` }]} />
                          )}
                          <Text style={[styles.programTime, isNow && styles.programTimeNow]}>
                            {formatTime(prog.start)}
                          </Text>
                          <Text style={[styles.programTitle, isNow && styles.programTitleNow]} numberOfLines={1}>
                            {prog.title}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                </View>
              ))}
            </ScrollView>

            {/* Current time indicator */}
            <View style={[styles.nowIndicator, { left: nowPosition }]} />
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  closeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: isMobile ? 18 : 24,
    fontWeight: 'bold',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTime: {
    color: '#888',
    fontSize: 14,
  },
  gridContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  channelColumn: {
    width: CHANNEL_COL_WIDTH,
    borderRightWidth: 1,
    borderRightColor: '#222',
    backgroundColor: '#0A0A0A',
    zIndex: 2,
  },
  timeHeaderCorner: {
    height: 36,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  channelRow: {
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: isMobile ? 8 : 12,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1A1A1A',
  },
  channelName: {
    color: '#CCC',
    fontSize: isMobile ? 11 : 14,
    flex: 1,
    fontWeight: '500',
  },
  timeHeader: {
    height: 36,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    position: 'relative',
  },
  hourMark: {
    position: 'absolute',
    top: 0,
    height: 36,
    justifyContent: 'center',
    paddingLeft: 8,
    borderLeftWidth: 1,
    borderLeftColor: '#222',
  },
  hourText: {
    color: '#888',
    fontSize: isMobile ? 11 : 13,
    fontWeight: '600',
  },
  programRow: {
    height: ROW_HEIGHT,
    position: 'relative',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1A1A1A',
  },
  programBlock: {
    position: 'absolute',
    top: 2,
    height: ROW_HEIGHT - 4,
    backgroundColor: '#1C1C1E',
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#333',
    paddingHorizontal: 8,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  programBlockNow: {
    backgroundColor: '#1A2A3A',
  },
  programProgress: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,122,255,0.15)',
  },
  programTime: {
    color: '#666',
    fontSize: isMobile ? 9 : 11,
    fontWeight: '600',
  },
  programTimeNow: {
    color: '#007AFF',
  },
  programTitle: {
    color: '#CCC',
    fontSize: isMobile ? 11 : 13,
    fontWeight: '500',
    marginTop: 1,
  },
  programTitleNow: {
    color: '#FFF',
    fontWeight: '600',
  },
  nowIndicator: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#FF3B30',
    zIndex: 10,
  },
});