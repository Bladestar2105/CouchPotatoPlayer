import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useAppStore } from '../store';
import { ParsedProgram } from '../types/iptv';
import { formatProgramTime, findCurrentProgramIndex } from '../services/xmltv';
import { isMobile } from '../utils/platform';

interface MiniEpgProps {
  channelId: number | string;
  epgChannelId?: string;
  visible: boolean;
  configType?: string;
}

export const MiniEpg: React.FC<MiniEpgProps> = ({ channelId, epgChannelId, visible, configType }) => {
  const epgData = useAppStore(state => state.epgData);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

  const epgKey = configType === 'm3u' ? epgChannelId : (epgChannelId || channelId?.toString());
  const programs = epgData[epgKey as string] as ParsedProgram[] | undefined;

  const { currentProg, nextProg, progress } = useMemo(() => {
    if (!programs || programs.length === 0) {
      return { currentProg: null, nextProg: null, progress: 0 };
    }

    const idx = findCurrentProgramIndex(programs, now);
    const current = idx !== -1 ? programs[idx] : null;
    const next = idx !== -1 && idx + 1 < programs.length ? programs[idx + 1] : null;
    const prog = current ? Math.min(100, Math.max(0, ((now - current.start) / (current.end - current.start)) * 100)) : 0;

    return { currentProg: current, nextProg: next, progress: prog };
  }, [programs, now]);

  if (!visible || !currentProg) return null;

  return (
    <View style={styles.container}>
      {/* Current program */}
      <View style={styles.programRow}>
        <View style={styles.nowBadge}>
          <Text style={styles.nowBadgeText}>NOW</Text>
        </View>
        <View style={styles.programInfo}>
          <Text style={styles.programTitle} numberOfLines={1}>{currentProg.title_raw}</Text>
          <Text style={styles.programTime}>
            {formatProgramTime(currentProg.start)} - {formatProgramTime(currentProg.end)}
          </Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBg}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>

      {/* Next program */}
      {nextProg && (
        <View style={[styles.programRow, styles.nextRow]}>
          <View style={styles.nextBadge}>
            <Text style={styles.nextBadgeText}>NEXT</Text>
          </View>
          <View style={styles.programInfo}>
            <Text style={[styles.programTitle, styles.nextTitle]} numberOfLines={1}>{nextProg.title_raw}</Text>
            <Text style={styles.programTime}>
              {formatProgramTime(nextProg.start)} - {formatProgramTime(nextProg.end)}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0,0,0,0.85)',
    borderRadius: 10,
    padding: isMobile ? 10 : 14,
    marginHorizontal: isMobile ? 16 : 40,
    marginBottom: isMobile ? 8 : 12,
  },
  programRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nextRow: {
    marginTop: 8,
    opacity: 0.7,
  },
  nowBadge: {
    backgroundColor: '#FF453A',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 8,
  },
  nowBadgeText: {
    color: '#FFF',
    fontSize: isMobile ? 10 : 13,
    fontWeight: 'bold',
  },
  nextBadge: {
    backgroundColor: '#333',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 8,
  },
  nextBadgeText: {
    color: '#AAA',
    fontSize: isMobile ? 10 : 13,
    fontWeight: 'bold',
  },
  programInfo: {
    flex: 1,
  },
  programTitle: {
    color: '#FFF',
    fontSize: isMobile ? 14 : 18,
    fontWeight: '600',
  },
  nextTitle: {
    color: '#CCC',
  },
  programTime: {
    color: '#888',
    fontSize: isMobile ? 11 : 14,
    marginTop: 1,
  },
  progressBg: {
    height: 3,
    backgroundColor: '#333',
    borderRadius: 1.5,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF453A',
    borderRadius: 1.5,
  },
});