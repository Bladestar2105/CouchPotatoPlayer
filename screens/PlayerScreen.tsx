import React, { useEffect, useState, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Image, Platform } from 'react-native';
import VideoPlayer from '../components/VideoPlayer';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { useIPTV } from '../context/IPTVContext';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { Channel } from '../types';

const defaultLogo = require('../assets/icon.png');

const PlayerScreen = () => {
  const isFocused = useIsFocused();
  const navigation = useNavigation<any>();
  const { currentStream, addRecentlyWatched, channels, epg } = useIPTV();

  // TiviMate-style info overlay state
  const [showOverlay, setShowOverlay] = useState(false);

  // Get full channel details for HUD
  const currentChannel = useMemo(() => {
     if (!currentStream?.id) return null;
     return channels.find(c => c.id === currentStream.id) || null;
  }, [currentStream?.id, channels]);

  const getEpgKey = (channel: Channel | null): string => {
    if (!channel) return '';
    if (channel.epgChannelId && channel.epgChannelId.length > 0) {
      return channel.epgChannelId;
    }
    return channel.tvgId || channel.id;
  };

  const channelEpg = useMemo(() => {
     if (!currentChannel) return [];
     const key = getEpgKey(currentChannel);
     return epg[key] || [];
  }, [currentChannel, epg]);

  const { currentProgram, nextProgram, progressPercent } = useMemo(() => {
     if (!channelEpg.length) return { currentProgram: null, nextProgram: null, progressPercent: 0 };

     const now = new Date();
     let currentIdx = -1;

     for (let i = 0; i < channelEpg.length; i++) {
        if (now >= channelEpg[i].start && now < channelEpg[i].end) {
            currentIdx = i;
            break;
        }
     }

     if (currentIdx === -1) return { currentProgram: null, nextProgram: null, progressPercent: 0 };

     const currentProgram = channelEpg[currentIdx];

     // Find the truly NEXT program (start time >= current end time)
     let nextProgram = null;
     for (let i = currentIdx + 1; i < channelEpg.length; i++) {
         if (channelEpg[i].start.getTime() >= currentProgram.end.getTime()) {
             nextProgram = channelEpg[i];
             break;
         }
     }

     const totalDuration = currentProgram.end.getTime() - currentProgram.start.getTime();
     const elapsed = now.getTime() - currentProgram.start.getTime();
     const progressPercent = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));

     return { currentProgram, nextProgram, progressPercent };
  }, [channelEpg]);

  // Hide overlay on inactivity
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showOverlay) {
        timer = setTimeout(() => {
            setShowOverlay(false);
        }, 6000);
    }
    return () => {
        if (timer) clearTimeout(timer);
    };
  }, [showOverlay]);

  useEffect(() => {
    if (isFocused && currentStream && currentStream.id) {
       addRecentlyWatched({
        id: currentStream.id,
        type: 'live',
        name: currentChannel?.name || currentStream.id,
        icon: currentChannel?.logo,
        lastWatchedAt: Date.now(),
      });
      // Show overlay briefly when channel changes
      setShowOverlay(true);
    }
  }, [isFocused, currentStream]);

  useEffect(() => {
    const setOrientation = async () => {
      if (isFocused && Platform.OS !== 'web') {
        try {
            await ScreenOrientation.unlockAsync();
        } catch (e) {}
      } else if (Platform.OS !== 'web') {
        try {
            await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        } catch(e) {}
      }
    };

    setOrientation();

    return () => {
      if (Platform.OS !== 'web') {
          ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
      }
    };
  }, [isFocused]);

  const handlePress = () => {
    setShowOverlay(prev => !prev);
  };

  const handleBack = () => {
     // Check if we came from Home where VideoPlayer is mounted in background
     // Normally we would just go back
     navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        activeOpacity={1}
        onPress={handlePress}
      >
        <VideoPlayer />
      </TouchableOpacity>

      {showOverlay && (
        <View style={styles.overlay} pointerEvents="box-none">
          {/* Top Bar - Back Button */}
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBack}
              accessibilityRole="button"
            >
              <Icon name="arrow-back" size={28} color="#FFF" />
            </TouchableOpacity>
          </View>

          {/* Bottom Bar - Channel Info (HUD) */}
          {currentChannel && (
              <View style={styles.bottomBar}>
                 <View style={styles.infoContainer}>
                     <Image source={currentChannel.logo && currentChannel.logo.startsWith('http') ? { uri: currentChannel.logo } : defaultLogo} style={styles.channelLogo} resizeMode="contain" />

                     <View style={styles.textContainer}>
                         <View style={styles.headerRow}>
                            <Text style={styles.channelName}>{currentChannel.name}</Text>
                            <Text style={styles.timeText}>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                         </View>

                         {currentProgram ? (
                            <View style={styles.epgContainer}>
                                <Text style={styles.programTitle} numberOfLines={1}>{currentProgram.title}</Text>

                                <View style={styles.progressRow}>
                                    <Text style={styles.programTimeText}>
                                        {currentProgram.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </Text>
                                    <View style={styles.progressBarContainer}>
                                        <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
                                    </View>
                                    <Text style={styles.programTimeText}>
                                        {currentProgram.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </Text>
                                </View>

                                {nextProgram && (
                                    <Text style={styles.nextProgramText} numberOfLines={1}>
                                        Next: {nextProgram.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {nextProgram.title}
                                    </Text>
                                )}
                            </View>
                         ) : (
                             <Text style={styles.noEpgText}>No EPG Data Available</Text>
                         )}
                     </View>
                 </View>
              </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  topBar: {
    padding: 24,
    flexDirection: 'row',
  },
  backButton: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 12,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomBar: {
    backgroundColor: 'rgba(20, 20, 20, 0.9)',
    borderTopWidth: 2,
    borderTopColor: '#2196F3', // Accent color
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    paddingBottom: 40, // Extra padding for safe area on some TVs
  },
  channelLogo: {
      width: 100,
      height: 100,
      marginRight: 24,
      backgroundColor: 'rgba(255,255,255,0.05)',
      borderRadius: 8,
  },
  textContainer: {
      flex: 1,
  },
  headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      marginBottom: 8,
  },
  channelName: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: 'bold',
  },
  timeText: {
      color: '#AAA',
      fontSize: 20,
      fontWeight: '600',
  },
  epgContainer: {
      marginTop: 4,
  },
  programTitle: {
      color: '#FFF',
      fontSize: 20,
      fontWeight: '500',
      marginBottom: 12,
  },
  progressRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
  },
  programTimeText: {
      color: '#AAA',
      fontSize: 14,
      fontWeight: '600',
  },
  progressBarContainer: {
      flex: 1,
      height: 6,
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderRadius: 3,
      marginHorizontal: 12,
      overflow: 'hidden',
  },
  progressBarFill: {
      height: '100%',
      backgroundColor: '#2196F3', // Accent color
      borderRadius: 3,
  },
  nextProgramText: {
      color: '#888',
      fontSize: 16,
      marginTop: 4,
  },
  noEpgText: {
      color: '#666',
      fontSize: 18,
      fontStyle: 'italic',
      marginTop: 10,
  }
});

export default PlayerScreen;
