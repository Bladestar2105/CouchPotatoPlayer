import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Alert, Platform } from 'react-native';
import { Download, Trash2, Play, X, HardDrive, CheckCircle, Clock, AlertCircle } from 'lucide-react-native';
import { showToast } from './Toast';
import { isMobile } from '../utils/platform';

export interface DownloadItem {
  id: string | number;
  name: string;
  type: 'vod' | 'series';
  icon?: string;
  url: string;
  progress: number; // 0-100
  status: 'queued' | 'downloading' | 'completed' | 'error' | 'paused';
  size?: number; // bytes
  downloadedSize?: number;
  addedAt: number;
}

interface DownloadManagerProps {
  visible: boolean;
  onClose: () => void;
  downloads: DownloadItem[];
  onStartDownload?: (item: DownloadItem) => void;
  onRemoveDownload?: (id: string | number) => void;
  onPlayDownload?: (item: DownloadItem) => void;
  onPauseDownload?: (id: string | number) => void;
  onResumeDownload?: (id: string | number) => void;
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const formatDate = (ts: number): string => {
  const d = new Date(ts);
  return `${d.getDate()}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`;
};

const StatusIcon: React.FC<{ status: DownloadItem['status'] }> = ({ status }) => {
  switch (status) {
    case 'completed':
      return <CheckCircle color="#4CD964" size={20} />;
    case 'downloading':
      return <Download color="#007AFF" size={20} />;
    case 'queued':
      return <Clock color="#FF9500" size={20} />;
    case 'error':
      return <AlertCircle color="#FF453A" size={20} />;
    case 'paused':
      return <Clock color="#888" size={20} />;
    default:
      return <Download color="#666" size={20} />;
  }
};

export const DownloadManager: React.FC<DownloadManagerProps> = ({
  visible,
  onClose,
  downloads,
  onRemoveDownload,
  onPlayDownload,
  onPauseDownload,
  onResumeDownload,
}) => {
  const totalSize = downloads
    .filter(d => d.status === 'completed')
    .reduce((sum, d) => sum + (d.size || 0), 0);

  const handleRemove = useCallback((item: DownloadItem) => {
    if (Platform.OS === 'web') {
      onRemoveDownload?.(item.id);
      showToast(`Removed: ${item.name}`, 'info');
    } else {
      Alert.alert(
        'Remove Download',
        `Delete "${item.name}" from downloads?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              onRemoveDownload?.(item.id);
              showToast(`Removed: ${item.name}`, 'info');
            },
          },
        ]
      );
    }
  }, [onRemoveDownload]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Download color="#007AFF" size={24} />
            <Text style={styles.headerTitle}>Downloads</Text>
          </View>
          <TouchableOpacity onPress={onClose}>
            <X color="#999" size={24} />
          </TouchableOpacity>
        </View>

        {/* Storage info */}
        <View style={styles.storageBar}>
          <HardDrive color="#888" size={16} />
          <Text style={styles.storageText}>
            {downloads.filter(d => d.status === 'completed').length} files • {formatBytes(totalSize)}
          </Text>
        </View>

        {/* Download list */}
        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          {downloads.length === 0 ? (
            <View style={styles.emptyState}>
              <Download color="#333" size={48} />
              <Text style={styles.emptyTitle}>No Downloads</Text>
              <Text style={styles.emptySubtitle}>
                Download movies and series to watch offline.{'\n'}
                Long-press on any VOD content to start downloading.
              </Text>
            </View>
          ) : (
            downloads.map((item) => (
              <View key={`dl-${item.id}`} style={styles.downloadItem}>
                <StatusIcon status={item.status} />
                <View style={styles.downloadInfo}>
                  <Text style={styles.downloadName} numberOfLines={1}>{item.name}</Text>
                  <View style={styles.downloadMeta}>
                    <Text style={styles.downloadStatus}>
                      {item.status === 'downloading' ? `${item.progress}%` :
                       item.status === 'completed' ? formatBytes(item.size || 0) :
                       item.status === 'queued' ? 'Waiting...' :
                       item.status === 'error' ? 'Failed' :
                       'Paused'}
                    </Text>
                    <Text style={styles.downloadDate}>{formatDate(item.addedAt)}</Text>
                  </View>
                  {(item.status === 'downloading' || item.status === 'paused') && (
                    <View style={styles.progressBar}>
                      <View style={[styles.progressFill, { width: `${item.progress}%` }]} />
                    </View>
                  )}
                </View>
                <View style={styles.downloadActions}>
                  {item.status === 'completed' && (
                    <TouchableOpacity
                      style={styles.playBtn}
                      onPress={() => onPlayDownload?.(item)}
                    >
                      <Play color="#FFF" size={16} fill="#FFF" />
                    </TouchableOpacity>
                  )}
                  {item.status === 'downloading' && (
                    <TouchableOpacity
                      style={styles.pauseBtn}
                      onPress={() => onPauseDownload?.(item.id)}
                    >
                      <Text style={styles.pauseBtnText}>⏸</Text>
                    </TouchableOpacity>
                  )}
                  {item.status === 'paused' && (
                    <TouchableOpacity
                      style={styles.resumeBtn}
                      onPress={() => onResumeDownload?.(item.id)}
                    >
                      <Play color="#007AFF" size={14} />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleRemove(item)}
                  >
                    <Trash2 color="#FF453A" size={18} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

// Helper to initiate a download (called from MediaInfoScreen etc.)
export const startContentDownload = (item: {
  id: string | number;
  name: string;
  type: 'vod' | 'series';
  url: string;
  icon?: string;
}): DownloadItem => {
  return {
    ...item,
    progress: 0,
    status: 'queued',
    size: 0,
    downloadedSize: 0,
    addedAt: Date.now(),
  };
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    paddingTop: Platform.OS === 'ios' ? 50 : 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: 'bold',
  },
  storageBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#111',
    gap: 8,
  },
  storageText: {
    color: '#888',
    fontSize: 13,
  },
  list: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    color: '#555',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
  },
  emptySubtitle: {
    color: '#444',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  downloadItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1A1A1A',
    gap: 12,
  },
  downloadInfo: {
    flex: 1,
  },
  downloadName: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  downloadMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  downloadStatus: {
    color: '#888',
    fontSize: 12,
  },
  downloadDate: {
    color: '#555',
    fontSize: 12,
  },
  progressBar: {
    height: 3,
    backgroundColor: '#2C2C2E',
    borderRadius: 1.5,
    marginTop: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 1.5,
  },
  downloadActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pauseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pauseBtnText: {
    fontSize: 14,
  },
  resumeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,122,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtn: {
    padding: 6,
  },
});