/**
 * StreamHealthMonitor - Real-time stream quality HUD overlay.
 *
 * Inspired by MKS-IPTV-App's GlitchDetector and PlayerDebugOverlay.
 * Shows bitrate, buffer health, FPS, codec info, and connection quality.
 */
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Activity } from 'lucide-react-native';

interface StreamHealthData {
  bitrate?: number;           // Current bitrate in bps
  bufferHealth?: number;      // Buffer duration in seconds
  droppedFrames?: number;     // Dropped frames count
  currentTime?: number;       // Current playback position
  duration?: number;          // Total duration (0 for live)
  resolution?: { width: number; height: number };
  isLive?: boolean;
  connectionType?: string;    // 'proxy' | 'direct'
  hlsLevel?: number;          // Current HLS quality level
  latency?: number;           // Estimated latency in ms
}

interface StreamHealthMonitorProps {
  visible: boolean;
  data: StreamHealthData;
  compact?: boolean;          // Minimal mode for mobile
}

// Determine quality indicator color
const getQualityColor = (data: StreamHealthData): string => {
  if (!data.bitrate) return '#666';
  if (data.bitrate > 5000000) return '#4CD964';  // Excellent (>5Mbps)
  if (data.bitrate > 2000000) return '#007AFF';   // Good (>2Mbps)
  if (data.bitrate > 1000000) return '#FF9500';   // Fair (>1Mbps)
  return '#FF3B30';                                 // Poor (<1Mbps)
};

const getQualityLabel = (data: StreamHealthData): string => {
  if (!data.bitrate) return 'Unknown';
  if (data.bitrate > 5000000) return 'Excellent';
  if (data.bitrate > 2000000) return 'Good';
  if (data.bitrate > 1000000) return 'Fair';
  return 'Poor';
};

const formatBitrate = (bps?: number): string => {
  if (!bps) return '-- Mbps';
  if (bps >= 1000000) return `${(bps / 1000000).toFixed(1)} Mbps`;
  if (bps >= 1000) return `${(bps / 1000).toFixed(0)} Kbps`;
  return `${bps} bps`;
};

const formatResolution = (res?: { width: number; height: number }): string => {
  if (!res || !res.width) return '--';
  // Map to common names
  if (res.height >= 2160) return '4K';
  if (res.height >= 1080) return '1080p';
  if (res.height >= 720) return '720p';
  if (res.height >= 480) return '480p';
  return `${res.width}×${res.height}`;
};

const formatBuffer = (seconds?: number): string => {
  if (seconds == null || seconds < 0) return '-- s';
  return `${seconds.toFixed(1)}s`;
};

export const StreamHealthMonitor: React.FC<StreamHealthMonitorProps> = ({
  visible,
  data,
  compact = false,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [bitrateHistory, setBitrateHistory] = useState<number[]>([]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: visible ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [visible, fadeAnim]);

  // Track bitrate history for sparkline
  useEffect(() => {
    if (data.bitrate && data.bitrate > 0) {
      setBitrateHistory(prev => {
        const next = [...prev, data.bitrate!];
        return next.slice(-20); // Keep last 20 samples
      });
    }
  }, [data.bitrate]);

  const qualityColor = useMemo(() => getQualityColor(data), [data]);
  const qualityLabel = useMemo(() => getQualityLabel(data), [data]);

  if (!visible) return null;

  if (compact) {
    return (
      <Animated.View style={[styles.compactContainer, { opacity: fadeAnim }]}>
        <View style={[styles.qualityDot, { backgroundColor: qualityColor }]} />
        <Text style={styles.compactText}>{formatBitrate(data.bitrate)}</Text>
        <Text style={styles.compactDivider}>|</Text>
        <Text style={styles.compactText}>{formatResolution(data.resolution)}</Text>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Header */}
      <View style={styles.header}>
        <Activity color={qualityColor} size={14} />
        <Text style={[styles.headerText, { color: qualityColor }]}>
          Stream: {qualityLabel}
        </Text>
      </View>

      {/* Stats Grid */}
      <View style={styles.grid}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Bitrate</Text>
          <Text style={[styles.statValue, { color: qualityColor }]}>{formatBitrate(data.bitrate)}</Text>
        </View>

        <View style={styles.stat}>
          <Text style={styles.statLabel}>Resolution</Text>
          <Text style={styles.statValue}>{formatResolution(data.resolution)}</Text>
        </View>

        <View style={styles.stat}>
          <Text style={styles.statLabel}>Buffer</Text>
          <Text style={[styles.statValue, {
            color: (data.bufferHealth ?? 0) < 2 ? '#FF3B30' : (data.bufferHealth ?? 0) < 5 ? '#FF9500' : '#4CD964'
          }]}>
            {formatBuffer(data.bufferHealth)}
          </Text>
        </View>

        {data.droppedFrames != null && data.droppedFrames > 0 && (
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Dropped</Text>
            <Text style={[styles.statValue, { color: '#FF9500' }]}>{data.droppedFrames}</Text>
          </View>
        )}

        {data.latency != null && data.latency > 0 && (
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Latency</Text>
            <Text style={styles.statValue}>{data.latency}ms</Text>
          </View>
        )}

        <View style={styles.stat}>
          <Text style={styles.statLabel}>Type</Text>
          <Text style={styles.statValue}>{data.isLive ? '🔴 LIVE' : '📹 VOD'}</Text>
        </View>
      </View>

      {/* Bitrate Sparkline */}
      {bitrateHistory.length > 2 && (
        <View style={styles.sparklineContainer}>
          <Text style={styles.sparklineLabel}>Bitrate History</Text>
          <View style={styles.sparkline}>
            {bitrateHistory.map((val, i) => {
              const max = Math.max(...bitrateHistory);
              const height = max > 0 ? (val / max) * 20 : 0;
              return (
                <View
                  key={i}
                  style={[
                    styles.sparkBar,
                    {
                      height: Math.max(2, height),
                      backgroundColor: val > 2000000 ? '#4CD964' : val > 1000000 ? '#FF9500' : '#FF3B30',
                    },
                  ]}
                />
              );
            })}
          </View>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.85)',
    borderRadius: 12,
    padding: 12,
    minWidth: 200,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  compactContainer: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  qualityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  compactText: {
    color: '#CCC',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  compactDivider: {
    color: '#555',
    fontSize: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerText: {
    fontSize: 13,
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  stat: {
    minWidth: 80,
    marginBottom: 4,
  },
  statLabel: {
    color: '#888',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'monospace',
    marginTop: 1,
  },
  sparklineContainer: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  sparklineLabel: {
    color: '#666',
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 4,
  },
  sparkline: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 22,
    gap: 2,
  },
  sparkBar: {
    width: 6,
    borderRadius: 2,
    minHeight: 2,
  },
});