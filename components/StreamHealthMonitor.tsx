import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Activity, Wifi, Shield, Server, ChevronDown, Monitor } from 'lucide-react-native';

interface StreamHealthMonitorProps {
  visible: boolean;
  streamUrl: string;
  videoData: any;
  bufferHealth: { isBuffering: boolean; bufferLength?: number };
  currentTime: number;
  duration: number;
  playbackRate: number;
}

export const StreamHealthMonitor = ({
  visible,
  streamUrl,
  videoData,
  bufferHealth,
  currentTime,
  duration,
  playbackRate,
}: StreamHealthMonitorProps) => {
  const { t } = useTranslation();
  const [latency, setLatency] = useState<number | null>(null);

  useEffect(() => {
    if (!visible || !streamUrl) return;

    let isMounted = true;
    const measureLatency = async () => {
      const start = Date.now();
      try {
        const url = new URL(streamUrl);
        const hostUrl = `${url.protocol}//${url.host}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        await fetch(hostUrl, { method: 'HEAD', signal: controller.signal });
        clearTimeout(timeout);

        if (isMounted) setLatency(Date.now() - start);
      } catch (err) {
        if (isMounted) setLatency(-1); // Error state
      }
    };

    measureLatency();
    const interval = setInterval(measureLatency, 10000);
    return () => { isMounted = false; clearInterval(interval); };
  }, [visible, streamUrl]);

  if (!visible) return null;

  const resolution = videoData?.width && videoData?.height
    ? `${videoData.width}x${videoData.height}`
    : 'Unknown';

  const fps = videoData?.framerate ? Math.round(videoData.framerate) : '--';
  const bitrate = videoData?.bitrate ? Math.round(videoData.bitrate / 1000) : '--';

  const getLatencyColor = (ms: number | null) => {
    if (ms === null || ms < 0) return '#FF453A';
    if (ms < 150) return '#34C759';
    if (ms < 500) return '#FF9F0A';
    return '#FF453A';
  };

  const latencyColor = getLatencyColor(latency);
  const latencyText = latency === null ? '...' : latency < 0 ? 'Error' : `${latency}ms`;

  const urlObj = streamUrl ? new URL(streamUrl) : null;
  const protocol = urlObj?.protocol.replace(':', '') || 'http';
  const host = urlObj?.host || 'unknown';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Activity color="#4CD964" size={18} />
        <Text style={styles.title}>Stream Health</Text>
      </View>

      <View style={styles.grid}>
        <View style={styles.cell}>
          <Text style={styles.label}>Resolution</Text>
          <View style={styles.valueRow}>
            <Monitor size={14} color="#888" />
            <Text style={styles.value}>{resolution}</Text>
          </View>
        </View>

        <View style={styles.cell}>
          <Text style={styles.label}>Bitrate</Text>
          <View style={styles.valueRow}>
            <Activity size={14} color="#888" />
            <Text style={styles.value}>{bitrate} kbps</Text>
          </View>
        </View>

        <View style={styles.cell}>
          <Text style={styles.label}>FPS</Text>
          <View style={styles.valueRow}>
            <ChevronDown size={14} color="#888" />
            <Text style={styles.value}>{fps}</Text>
          </View>
        </View>

        <View style={styles.cell}>
          <Text style={styles.label}>Latency</Text>
          <View style={styles.valueRow}>
            <Wifi size={14} color={latencyColor} />
            <Text style={[styles.value, { color: latencyColor }]}>{latencyText}</Text>
          </View>
        </View>

        <View style={styles.cell}>
          <Text style={styles.label}>Protocol</Text>
          <View style={styles.valueRow}>
            <Shield size={14} color={protocol === 'https' ? '#34C759' : '#FF9F0A'} />
            <Text style={styles.value}>{protocol.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.cell}>
          <Text style={styles.label}>Server</Text>
          <View style={styles.valueRow}>
            <Server size={14} color="#888" />
            <Text style={styles.value} numberOfLines={1}>{host}</Text>
          </View>
        </View>
      </View>

      {bufferHealth.isBuffering && (
        <View style={styles.bufferingWarning}>
          <Activity size={12} color="#FF9F0A" />
          <Text style={styles.bufferingText}>Stream is buffering...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 40,
    left: 40,
    backgroundColor: 'rgba(0,0,0,0.85)',
    borderRadius: 12,
    padding: 16,
    width: 340,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  title: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  cell: { width: '46%', marginBottom: 8 },
  label: { color: '#888', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', marginBottom: 4 },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  value: { color: '#FFF', fontSize: 13, fontWeight: '500', flexShrink: 1 },
  bufferingWarning: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, backgroundColor: 'rgba(255,159,10,0.2)', padding: 8, borderRadius: 6 },
  bufferingText: { color: '#FF9F0A', fontSize: 12, fontWeight: '600' }
});
