import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Image, Platform, BackHandler } from 'react-native';
// @ts-ignore - TVEventControl is available in react-native-tvos but not in standard React Native types
import { TVEventControl, useTVEventHandler } from 'react-native';

import VideoPlayer, { VideoMetadata } from '../components/VideoPlayer';
import { useIsFocused, useNavigation } from '@react-navigation/native';

// Dynamically require expo-screen-orientation only if not on a TV
let ScreenOrientation: any;
if (!Platform.isTV) {
  try {
    ScreenOrientation = require('expo-screen-orientation');
  } catch (e) {
    // Fallback if missing
  }
}
import { useIPTV } from '../context/IPTVContext';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { Channel } from '../types';
import { findCurrentProgramIndex } from '../utils/epgUtils';

const defaultLogo = require('../assets/icon.png');

// ⚡ Bolt: Cache Intl.DateTimeFormat instance to avoid slow initialization overhead on every render
const timeFormatter = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' });

/**
 * PlayerScreen - Full-screen video player for IPTV streams
 * 
 * tvOS/Android TV Back Button Handling:
 * - Uses TVEventControl.enableTVMenuKey() to intercept the menu button on tvOS
 * - Combined with BackHandler for Android TV compatibility
 * - useTVEventHandler handles remote events including 'menu' event type
 * 
 * The menu button navigates back to Home instead of exiting the app.
 */
const PlayerScreen = () => {
  const isFocused = useIsFocused();
  const navigation = useNavigation<any>();
  const { currentStream, addRecentlyWatched, channels, epg, stopStream, playStream } = useIPTV();

  // TiviMate-style info overlay state
  const [showOverlay, setShowOverlay] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [seekTime, setSeekTime] = useState<number | undefined>(undefined);
  const [videoMetadata, setVideoMetadata] = useState<VideoMetadata | null>(null);

  // Use a ref for current time to avoid re-triggering the event listener effect
  const currentTimeRef = React.useRef(0);

  /**
   * Handle back navigation - navigates to Home screen instead of exiting app
   * This is the core of the tvOS menu button handling.
   * 
   * IMPORTANT: We use navigation.navigate('Home') instead of navigation.goBack()
   * because the Player screen might be the only screen in the stack (e.g., when
   * launched via deep link), and goBack() would exit the app in that case.
   */
  const [isExiting, setIsExiting] = useState(false);

  const handleBack = useCallback(() => {
    // Apple TV Menu button shouldn't close the app from PlayerScreen.
    // Explicitly navigating to "Home" instead of relying on "goBack()"
    // prevents the app from unexpectedly exiting on tvOS when the stack is empty or confused.

    // Immediately hide the video player to make the UI feel responsive
    setIsExiting(true);

    // Stop the stream and navigate back in the next tick to prevent blocking the main thread
    // while the video player is unmounting or HomeScreen is rendering
    setTimeout(() => {
      stopStream();
      navigation.navigate('Home');
    }, 10);

    return true; // Return true to indicate we handled the back event
  }, [navigation, stopStream]);

  // Cache channel indices for O(1) channelUp/channelDown lookups
  const channelIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    for (let i = 0; i < channels.length; i++) {
      map.set(channels[i].id, i);
    }
    return map;
  }, [channels]);

  // Get full channel details for HUD
  const currentChannel = useMemo(() => {
     if (!currentStream?.id) return null;
     const index = channelIndexMap.get(currentStream.id);
     return index !== undefined ? channels[index] : null;
  }, [currentStream?.id, channels, channelIndexMap]);

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

     // ⚡ Bolt: Replace O(N) linear search with O(log N) binary search
     const currentIdx = findCurrentProgramIndex(channelEpg, now);

     if (currentIdx === -1) return { currentProgram: null, nextProgram: null, progressPercent: 0 };

     const currentProgram = channelEpg[currentIdx];

     // ⚡ Perf: Since channelEpg is sorted chronologically and currentIdx is known,
     // the next program is simply the next contiguous element — O(1) instead of O(N).
     const nextProgram = (currentIdx + 1 < channelEpg.length) ? channelEpg[currentIdx + 1] : null;

     const totalDuration = currentProgram.end - currentProgram.start;
     const elapsed = now.getTime() - currentProgram.start;
     const progressPercent = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));

     return { currentProgram, nextProgram, progressPercent };
  }, [channelEpg]);

  // Hide overlay on inactivity
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (showOverlay && !isPaused) {
        timer = setTimeout(() => {
            setShowOverlay(false);
        }, 6000);
    }
    return () => {
        if (timer) clearTimeout(timer);
    };
  }, [showOverlay, isPaused]);

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
      setVideoMetadata(null); // Reset metadata on stream change
    }
  }, [isFocused, currentStream]);

  useEffect(() => {
    const setOrientation = async () => {
      // Screen orientation does not apply to TV platforms
      if (Platform.isTV || !ScreenOrientation) return;

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
      if (!Platform.isTV && ScreenOrientation && Platform.OS !== 'web') {
          ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
      }
    };
  }, [isFocused]);

  const handlePress = () => {
    setShowOverlay(prev => !prev);
  };

  /**
   * TV Remote Event Handler
   * 
   * Handles various remote control events for tvOS and Android TV:
   * - 'menu': Back/Menu button - navigates to Home screen
   * - 'playPause': Play/Pause button - toggles pause state
   * - 'left'/'right': Seek backward/forward 10 seconds
   * - 'up'/'down'/'select': Show overlay for info display
   */
  const handleTVRemoteEvent = useCallback((evt: any) => {
    if (!isFocused || !evt) return;

    if (evt.eventType === 'menu') {
      handleBack();
    } else if (evt.eventType === 'playPause') {
      setIsPaused(prev => !prev);
      setShowOverlay(true);
    } else if (evt.eventType === 'left') {
      // Very rudimentary seek backward trigger
      const newSeekTime = Math.max(0, currentTimeRef.current - 10000); // Back 10s roughly
      setSeekTime(newSeekTime);
      currentTimeRef.current = newSeekTime;
      setShowOverlay(true);
    } else if (evt.eventType === 'right') {
      // Seek forward
      const newSeekTime = currentTimeRef.current + 10000;
      setSeekTime(newSeekTime);
      currentTimeRef.current = newSeekTime;
      setShowOverlay(true);
    } else if (evt.eventType === 'pageUp' || evt.eventType === 'channelUp') {
       if (channels.length > 0 && currentStream) {
           const currentIndex = channelIndexMap.get(currentStream.id);
           if (currentIndex !== undefined) {
               const nextIndex = (currentIndex + 1) % channels.length;
               const nextChannel = channels[nextIndex];
               playStream({ url: nextChannel.url, id: nextChannel.id });
               setShowOverlay(true);
           }
       }
    } else if (evt.eventType === 'pageDown' || evt.eventType === 'channelDown') {
       if (channels.length > 0 && currentStream) {
           const currentIndex = channelIndexMap.get(currentStream.id);
           if (currentIndex !== undefined) {
               const prevIndex = (currentIndex - 1 + channels.length) % channels.length;
               const prevChannel = channels[prevIndex];
               playStream({ url: prevChannel.url, id: prevChannel.id });
               setShowOverlay(true);
           }
       }
    } else if (evt.eventType === 'up' || evt.eventType === 'down' || evt.eventType === 'select') {
       setShowOverlay(true);
    }
  }, [isFocused, handleBack, channels, currentStream, playStream]);

  // Use the standard hook provided by react-native for TV remote events
  useTVEventHandler(handleTVRemoteEvent);

  /**
   * tvOS Menu Button Control with TVEventControl
   * 
   * CRITICAL for tvOS: This effect uses TVEventControl to properly handle
   * the menu button behavior on Apple TV.
   * 
   * - enableTVMenuKey(): Allows the menu button to be intercepted by the app
   *   instead of immediately exiting to tvOS home screen.
   * - When enabled, menu button presses can be handled via BackHandler
   *   and useTVEventHandler ('menu' event type).
   * 
   * Without this, the menu button would exit the app immediately on tvOS.
   * 
   * For Android TV: BackHandler alone is sufficient, but we include it
   * here for cross-platform compatibility.
   */
  useEffect(() => {
    if (!isFocused) return;

    // Enable menu key interception on tvOS
    // This must be called to prevent the app from exiting when menu is pressed
    if (Platform.isTV && TVEventControl?.enableTVMenuKey) {
      TVEventControl.enableTVMenuKey();
    }

    // BackHandler works for both Android TV and tvOS (when TVEventControl is enabled)
    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBack);

    return () => {
      // Cleanup: Disable menu key interception when leaving PlayerScreen
      // This restores default tvOS menu button behavior on the root screen
      if (Platform.isTV && TVEventControl?.disableTVMenuKey) {
        TVEventControl.disableTVMenuKey();
      }
      backHandler.remove();
    };
  }, [isFocused, handleBack]);

  if (isExiting) {
    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        activeOpacity={1}
        onPress={handlePress}
      >
        <VideoPlayer
          paused={isPaused}
          seekPosition={seekTime}
          onProgress={(data) => {
             // For React Native VLC media player, data.currentTime is usually in milliseconds
             currentTimeRef.current = data.currentTime;
          }}
          onVideoLoad={(metadata) => {
             setVideoMetadata(metadata);
          }}
        />
      </TouchableOpacity>

      {showOverlay && (
        <View style={styles.overlay} pointerEvents="box-none">
          {/* Top Bar - Back Button */}
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBack}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Icon name="arrow-back" size={28} color="#FFF" />
            </TouchableOpacity>
          </View>

          {/* Pause Indicator */}
          {isPaused && (
            <View style={{position: 'absolute', top: '50%', left: '50%', transform: [{translateX: -40}, {translateY: -40}], backgroundColor: 'rgba(0,0,0,0.5)', padding: 20, borderRadius: 40}}>
               <Icon name="pause" size={40} color="#FFF" />
            </View>
          )}

          {/* Bottom Bar - Channel Info (HUD) */}
          {currentChannel && (
              <View style={styles.bottomBar}>
                 <View style={styles.infoContainer}>
                     <Image source={currentChannel.logo && currentChannel.logo.startsWith('http') ? { uri: currentChannel.logo } : defaultLogo} style={styles.channelLogo} resizeMode="contain" />

                     <View style={styles.textContainer}>
                         <View style={styles.headerRow}>
                            <View style={styles.channelNameContainer}>
                                <Text style={styles.channelName}>{currentChannel.name}</Text>
                                {!!(videoMetadata?.width && videoMetadata?.height) && (
                                    <View style={styles.metadataBadge}>
                                        <Text style={styles.metadataText}>{videoMetadata.width}x{videoMetadata.height}</Text>
                                        {videoMetadata.fps ? <Text style={styles.metadataText}> • {Math.round(videoMetadata.fps)} FPS</Text> : null}
                                        {videoMetadata.bitrate ? <Text style={styles.metadataText}> • {Math.round(videoMetadata.bitrate / 1000)} kbps</Text> : null}
                                    </View>
                                )}
                            </View>
                            <Text style={styles.timeText}>{timeFormatter.format(new Date())}</Text>
                         </View>

                         {currentProgram ? (
                            <View style={styles.epgContainer}>
                                <Text style={styles.programTitle} numberOfLines={1}>{currentProgram.title}</Text>

                                <View style={styles.progressRow}>
                                    <Text style={styles.programTimeText}>
                                        {timeFormatter.format(currentProgram.start)}
                                    </Text>
                                    <View style={styles.progressBarContainer}>
                                        <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
                                    </View>
                                    <Text style={styles.programTimeText}>
                                        {timeFormatter.format(currentProgram.end)}
                                    </Text>
                                </View>

                                {nextProgram && (
                                    <Text style={styles.nextProgramText} numberOfLines={1}>
                                        Next: {timeFormatter.format(nextProgram.start)} - {nextProgram.title}
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
  channelNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    flex: 1,
  },
  channelName: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: 'bold',
    marginRight: 12,
  },
  metadataBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 4,
  },
  metadataText: {
    color: '#DDD',
    fontSize: 12,
    fontWeight: '600',
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