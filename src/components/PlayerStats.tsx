import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { Activity } from 'lucide-react-native';
import { isMobile } from '../utils/platform';

interface PlayerStatsProps {
  visible: boolean;
  streamUrl: string | null;
  videoData?: {
    bitrate?: number;
    width?: number;
    height?: number;
    codec?: string;
    fps?: number;
    audioCodec?: string;
    audioChannels?: number;
    naturalSize?: { width: number; height: number; orientation: string };
  };
  bufferHealth?: {
    isBuffering: boolean;
    bufferedDuration?: number;
  };
  currentTime?: number;
  duration?: number;
  playbackRate?: number;
}

export const PlayerStats: React.FC<PlayerStatsProps> = ({
  visible,
  streamUrl,
  videoData,
  bufferHealth,
  currentTime = 0,
  duration = 0,
  playbackRate = 1,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [bandwidth, setBandwidth] = useState(0);
  const [droppedFrames, setDroppedFrames] = useState(0);
  const prevBytesRef = useRef(0);
  const updateTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, fadeAnim]);

  // Format bitrate
  const formatBitrate = (bps: number): string => {
    if (bps <= 0) return '—';
    if (bps >= 1_000_000) return `${(bps / 1_000_000).toFixed(1)} Mbps`;
    if (bps >= 1_000) return `${(bps / 1_000).toFixed(0)} Kbps`;
    return `${bps} bps`;
  };

  // Get resolution label
  const getResolutionLabel = (w: number, h: number): string => {
    if (h >= 2160 || w >= 3840) return '4K UHD';
    if (h >= 1440 || w >= 2560) return '1440p QHD';
    if (h >= 1080 || w >= 1920) return '1080p FHD';
    if (h >= 720 || w >= 1280) return '720p HD';
    if (h >= 576) return '576p SD';
    if (h >= 480 || w >= 720) return '480p SD';
    if (h >= 360) return '360p';
    return `${w}×${h}`;
  };

  // Get stream type from URL
  const getStreamType = (url: string | null): string => {
    if (!url) return '—';
    if (url.includes('.m3u8') || url.includes('/live/')) return 'HLS';
    if (url.includes('.mpd')) return 'DASH';
    if (url.includes('.ts')) return 'MPEG-TS';
    if (url.includes('.mp4')) return 'MP4';
    if (url.includes('.mkv')) return 'MKV';
    return 'HTTP';
  };

  const width = videoData?.naturalSize?.width || videoData?.width || 0;
  const height = videoData?.naturalSize?.height || videoData?.height || 0;

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]} pointerEvents="none">
      <View style={styles.statsBox}>
        <Text style={styles.title}>
          <Activity color="#4CD964" size={12} /> Stream Info
        </Text>

        <View style={styles.row}>
          <View style={styles.stat}>
            <Text style={styles.label}>Resolution</Text>
            <Text style={styles.value}>
              {width > 0 ? `${width}×${height}` : '—'}
            </Text>
            {width > 0 && (
              <Text style={styles.badge}>{getResolutionLabel(width, height)}</Text>
            )}
          </View>
          <View style={styles.stat}>
            <Text style={styles.label}>Bitrate</Text>
            <Text style={styles.value}>{formatBitrate(videoData?.bitrate || bandwidth)}</Text>
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.stat}>
            <Text style={styles.label}>Video Codec</Text>
            <Text style={styles.value}>{videoData?.codec || '—'}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.label}>Audio Codec</Text>
            <Text style={styles.value}>{videoData?.audioCodec || '—'}</Text>
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.stat}>
            <Text style={styles.label}>Protocol</Text>
            <Text style={styles.value}>{getStreamType(streamUrl)}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.label}>FPS</Text>
            <Text style={styles.value}>{videoData?.fps ? `${videoData.fps.toFixed(0)}` : '—'}</Text>
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.stat}>
            <Text style={styles.label}>Buffer</Text>
            <Text style={[styles.value, bufferHealth?.isBuffering ? styles.valueWarn : styles.valueOk]}>
              {bufferHealth?.isBuffering ? 'Buffering...' : 'OK'}
            </Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.label}>Speed</Text>
            <Text style={styles.value}>{playbackRate}×</Text>
          </View>
        </View>

        {duration > 0 && (
          <View style={styles.row}>
            <View style={styles.stat}>
              <Text style={styles.label}>Position</Text>
              <Text style={styles.value}>
                {Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60).toString().padStart(2, '0')} / {Math.floor(duration / 60)}:{Math.floor(duration % 60).toString().padStart(2, '0')}
              </Text>
            </View>
          </View>
        )}

        <Text style={styles.urlText} numberOfLines={1} ellipsizeMode="middle">
          {streamUrl || '—'}
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: isMobile ? 50 : 20,
    left: isMobile ? 12 : 20,
    zIndex: 999,
  },
  statsBox: {
    backgroundColor: 'rgba(0,0,0,0.85)',
    borderRadius: 10,
    padding: 12,
    minWidth: isMobile ? 220 : 280,
    borderWidth: 1,
    borderColor: 'rgba(76,217,100,0.3)',
  },
  title: {
    color: '#4CD964',
    fontSize: isMobile ? 12 : 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 6,
    gap: 16,
  },
  stat: {
    flex: 1,
  },
  label: {
    color: '#888',
    fontSize: isMobile ? 9 : 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    color: '#FFF',
    fontSize: isMobile ? 12 : 14,
    fontWeight: '600',
    marginTop: 1,
  },
  valueOk: {
    color: '#4CD964',
  },
  valueWarn: {
    color: '#FF9500',
  },
  badge: {
    color: '#007AFF',
    fontSize: isMobile ? 9 : 10,
    fontWeight: 'bold',
    marginTop: 1,
  },
  urlText: {
    color: '#555',
    fontSize: isMobile ? 8 : 9,
    marginTop: 6,
    fontFamily: 'monospace',
  },
});