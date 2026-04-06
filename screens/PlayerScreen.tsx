import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Image, Platform, BackHandler, Animated } from 'react-native';
import TVFocusGuideView from '../components/TVFocusGuideView';
// @ts-ignore - TVEventControl is available in react-native-tvos but not in standard React Native types
import { TVEventControl, useTVEventHandler as _useTVEventHandler } from 'react-native';

const useTVEventHandler: (handler: (event: any) => void) => void =
  typeof _useTVEventHandler === 'function' ? _useTVEventHandler : () => {};

import VideoPlayer, { VideoMetadata } from '../components/VideoPlayer';
import { useIsFocused, useNavigation, useRoute } from '@react-navigation/native';

let ScreenOrientation: any;
if (!Platform.isTV) {
  try {
    ScreenOrientation = require('expo-screen-orientation');
  } catch (e) {}
}
import { useIPTV } from '../context/IPTVContext';
import { useSettings } from '../context/SettingsContext';
import { useTranslation } from 'react-i18next';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { Channel } from '../types';
import { findCurrentProgramIndex } from '../utils/epgUtils';
// StreamHealthMonitor removed - info button was removed for cleaner UI

const defaultLogo = require('../assets/character_logo.png');

const timeFormatter = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' });

/**
 * PlayerScreen - TiviMate-style full-screen video player
 */
const PlayerScreen = () => {
  const { t } = useTranslation();
  const { colors } = useSettings();
  const isFocused = useIsFocused();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { currentStream, addRecentlyWatched, channels, epg, stopStream, playStream } = useIPTV();

  const returnGroupId = route.params?.returnGroupId;
  const returnScreen = route.params?.returnScreen || 'Home';
  const returnTab = route.params?.returnTab || 'channels';
  const focusChannelId = route.params?.focusChannelId;

  const lastNavigationState = useRef<{ groupId: string | null; channelId: string | null }>({
    groupId: returnGroupId || null,
    channelId: focusChannelId || currentStream?.id || null,
  });

  useEffect(() => {
    lastNavigationState.current = {
      groupId: returnGroupId || lastNavigationState.current.groupId,
      channelId: currentStream?.id || focusChannelId || lastNavigationState.current.channelId,
    };
  }, [returnGroupId, focusChannelId, currentStream?.id]);

  // TiviMate-style overlay states
  const [showOverlay, setShowOverlay] = useState(false);
  const [showChannelSwitch, setShowChannelSwitch] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [seekTime, setSeekTime] = useState<number | undefined>(undefined);
  const [videoMetadata, setVideoMetadata] = useState<VideoMetadata | null>(null);
  const [playbackProgress, setPlaybackProgress] = useState<{ currentTime: number; duration: number }>({ currentTime: 0, duration: 0 });

  // Channel switch animation
  const channelSwitchOpacity = useRef(new Animated.Value(0)).current;

  const currentTimeRef = React.useRef(0);

  const [isExiting, setIsExiting] = useState(false);

  const backButtonRef = React.useRef<any>(null);

  const handleBack = useCallback(() => {
    stopStream();
    navigation.navigate('Home', {
      focusChannelId: lastNavigationState.current.channelId,
      returnGroupId: lastNavigationState.current.groupId,
      returnTab,
    });

    return true;
  }, [navigation, stopStream, returnTab]);

  useEffect(() => {
    return () => {
      stopStream();
    };
  }, [stopStream]);

  // Cache channel indices for O(1) channelUp/channelDown lookups
  const channelIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    for (let i = 0; i < channels.length; i++) {
      map.set(channels[i].id, i);
    }
    return map;
  }, [channels]);

  const currentChannel = useMemo(() => {
     if (!currentStream?.id) return null;
     const index = channelIndexMap.get(currentStream.id);
     return index !== undefined ? channels[index] : null;
  }, [currentStream?.id, channels, channelIndexMap]);

  // Channel number for display
  const currentChannelNumber = useMemo(() => {
    if (!currentStream?.id) return 0;
    const index = channelIndexMap.get(currentStream.id);
    return index !== undefined ? index + 1 : 0;
  }, [currentStream?.id, channelIndexMap]);

  const canSeek = useMemo(() => {
    if (!currentStream?.id) return false;
    if (currentStream.id.includes('_catchup_')) return true;
    const isLiveChannel = channelIndexMap.has(currentStream.id);
    if (isLiveChannel) return false;
    return playbackProgress.duration > 0;
  }, [currentStream?.id, channelIndexMap, playbackProgress.duration]);

  const formatDuration = useCallback((ms: number) => {
    if (!ms || ms < 0 || !Number.isFinite(ms)) return '00:00';
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }, []);

  const playbackPercent = useMemo(() => {
    if (!playbackProgress.duration || playbackProgress.duration <= 0) return 0;
    return Math.min(100, Math.max(0, (playbackProgress.currentTime / playbackProgress.duration) * 100));
  }, [playbackProgress]);

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
     const currentIdx = findCurrentProgramIndex(channelEpg, now);

     if (currentIdx === -1) return { currentProgram: null, nextProgram: null, progressPercent: 0 };

     const currentProgram = channelEpg[currentIdx];
     const nextProgram = (currentIdx + 1 < channelEpg.length) ? channelEpg[currentIdx + 1] : null;

     const totalDuration = currentProgram.end - currentProgram.start;
     const elapsed = now.getTime() - currentProgram.start;
     const progressPercent = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));

     return { currentProgram, nextProgram, progressPercent };
  }, [channelEpg]);

  const playbackTitle = useMemo(() => {
    const stream = currentStream as any;
    if (route.params?.title && typeof route.params.title === 'string') return route.params.title;
    if (stream?.name && typeof stream.name === 'string' && stream.name.toLowerCase() !== 'player') return stream.name;
    if (currentProgram?.title) return currentProgram.title;
    if (currentChannel?.name) return currentChannel.name;
    return t('nowPlaying');
  }, [currentStream, currentProgram?.title, currentChannel?.name, route.params?.title, t]);

  // Show channel switch mini-overlay
  const showChannelSwitchBriefly = useCallback(() => {
    setShowChannelSwitch(true);
    Animated.sequence([
      Animated.timing(channelSwitchOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(2500),
      Animated.timing(channelSwitchOpacity, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start(() => setShowChannelSwitch(false));
  }, [channelSwitchOpacity]);

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
    if (seekTime === undefined) return;
    const timer = setTimeout(() => setSeekTime(undefined), 180);
    return () => clearTimeout(timer);
  }, [seekTime]);

  useEffect(() => {
    if (isFocused && currentStream && currentStream.id) {
       addRecentlyWatched({
        id: currentStream.id,
        type: 'live',
        name: currentChannel?.name || currentStream.id,
        icon: currentChannel?.logo,
        lastWatchedAt: Date.now(),
      });
      setShowOverlay(true);
      setVideoMetadata(null);
      setSeekTime(undefined);
      currentTimeRef.current = 0;
      setPlaybackProgress({ currentTime: 0, duration: 0 });
    }
  }, [isFocused, currentStream]);

  useEffect(() => {
    const setOrientation = async () => {
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

  // Channel switching helper
  const switchChannel = useCallback((direction: 'up' | 'down') => {
    if (channels.length === 0 || !currentStream) return;
    const currentIndex = channelIndexMap.get(currentStream.id);
    if (currentIndex === undefined) return;

    const nextIndex = direction === 'up'
      ? (currentIndex + 1) % channels.length
      : (currentIndex - 1 + channels.length) % channels.length;
    const nextChannel = channels[nextIndex];
    playStream({ url: nextChannel.url, id: nextChannel.id });
    showChannelSwitchBriefly();
  }, [channels, currentStream, channelIndexMap, playStream, showChannelSwitchBriefly]);

  const handleTVRemoteEvent = useCallback((evt: any) => {
    if (!isFocused || !evt) return;

    if (evt.eventType === 'menu') {
      handleBack();
    } else if (evt.eventType === 'playPause') {
      setIsPaused(prev => !prev);
      setShowOverlay(true);


    } else if (evt.eventType === 'left') {
      if (!canSeek) return;
      const newSeekTime = Math.max(0, currentTimeRef.current - 10000);
      currentTimeRef.current = newSeekTime;
      setPlaybackProgress(prev => ({ ...prev, currentTime: newSeekTime }));

      if (seekDebounceTimerRef.current) clearTimeout(seekDebounceTimerRef.current);
      seekDebounceTimerRef.current = setTimeout(() => {
         setSeekTime(newSeekTime);
      }, 500);
      setShowOverlay(true);
    } else if (evt.eventType === 'right') {
      if (!canSeek) return;
      const maxTime = playbackProgress.duration || Infinity;
      const newSeekTime = Math.min(maxTime, currentTimeRef.current + 10000);
      currentTimeRef.current = newSeekTime;
      setPlaybackProgress(prev => ({ ...prev, currentTime: newSeekTime }));

      if (seekDebounceTimerRef.current) clearTimeout(seekDebounceTimerRef.current);
      seekDebounceTimerRef.current = setTimeout(() => {
         setSeekTime(newSeekTime);
      }, 500);
      setShowOverlay(true);
    } else if (evt.eventType === 'pageUp' || evt.eventType === 'channelUp') {
       switchChannel('up');
    } else if (evt.eventType === 'pageDown' || evt.eventType === 'channelDown') {
       switchChannel('down');
    } else if (evt.eventType === 'up') {
       switchChannel('up');
    } else if (evt.eventType === 'down') {
       switchChannel('down');
    } else if (evt.eventType === 'select') {
       setShowOverlay(true);
    }
  }, [isFocused, handleBack, switchChannel, canSeek]);

  useTVEventHandler(handleTVRemoteEvent);

  useEffect(() => {
    if (!isFocused) return;

    if (Platform.isTV && TVEventControl?.enableTVMenuKey) {
      TVEventControl.enableTVMenuKey();
    }

    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBack);

    return () => {
      if (Platform.isTV && TVEventControl?.disableTVMenuKey) {
        TVEventControl.disableTVMenuKey();
      }
      backHandler.remove();
    };
  }, [isFocused, handleBack]);

  if (isExiting) {
    return <View style={pStyles.container} />;
  }

  return (
    <View style={pStyles.container}>
      {/* TiviMate-style channel switch mini-overlay (top-right) */}
      {showChannelSwitch && false && currentChannel && (
        <Animated.View style={[pStyles.channelSwitchOverlay, { opacity: channelSwitchOpacity }]}>
          <View style={[pStyles.channelSwitchCard, { backgroundColor: 'rgba(30,30,46,0.92)', borderColor: colors.primary }]}>
            <View style={[pStyles.channelNumberBadge, { backgroundColor: colors.primary }]}>
              <Text style={pStyles.channelNumberText}>{currentChannelNumber}</Text>
            </View>
            {currentChannel.logo && currentChannel.logo.startsWith('http') ? (
              <Image source={{ uri: currentChannel.logo }} style={pStyles.switchLogo} resizeMode="contain" />
            ) : null}
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={pStyles.switchName} numberOfLines={1}>{currentChannel.name}</Text>
              {currentProgram && (
                <Text style={pStyles.switchProgram} numberOfLines={1}>{currentProgram.title}</Text>
              )}
            </View>
          </View>
        </Animated.View>
      )}

      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        activeOpacity={1}
        onPress={handlePress}
      >
        <VideoPlayer
          paused={isPaused}
          seekPosition={seekTime}
          onProgress={(data) => {
             currentTimeRef.current = data.currentTime;
             setPlaybackProgress({ currentTime: data.currentTime, duration: data.duration });
          }}
          onVideoLoad={(metadata) => {
             setVideoMetadata(metadata);
          }}
        />
      </TouchableOpacity>

      {showOverlay && (
        <TVFocusGuideView style={pStyles.overlay} destinations={[backButtonRef.current]} pointerEvents="box-none">
          {/* Top Bar - Back + Channel Number Badge */}
          <View style={pStyles.topBar}>
            <TouchableOpacity
              ref={backButtonRef}
              style={[pStyles.iconBtn, { backgroundColor: 'rgba(30,30,46,0.75)' }]}
              onPress={handleBack}
              accessibilityRole="button"
              accessibilityLabel={t('back')}
              isTVSelectable={true}
              hasTVPreferredFocus={Platform.isTV ? true : false}
              tvParallaxProperties={{ enabled: false }}
            >
              <Icon name="arrow-back" size={24} color="#FFF" />
            </TouchableOpacity>

          </View>

          {/* Pause Indicator */}
          {isPaused && (
            <View style={pStyles.pauseIndicator}>
               <Icon name="pause" size={48} color="#FFF" />
            </View>
          )}

          {/* Bottom Bar - TiviMate-style EPG info */}
          {currentChannel && (
              <View style={[pStyles.bottomBar, { borderTopColor: colors.primary }]}>
                 <View style={pStyles.infoContainer}>
                     <Image source={currentChannel.logo && currentChannel.logo.startsWith('http') ? { uri: currentChannel.logo } : defaultLogo} style={pStyles.channelLogo} resizeMode="contain" />

                     <View style={pStyles.textContainer}>
                         <View style={pStyles.headerRow}>
                            <Text style={pStyles.channelName}>{currentChannel.name}</Text>
                            <Text style={pStyles.timeText}>{timeFormatter.format(new Date())}</Text>
                         </View>

                         {currentProgram ? (
                            <View style={pStyles.epgContainer}>
                                <Text style={pStyles.programTitle} numberOfLines={1}>{currentProgram.title}</Text>

                                <View style={pStyles.progressRow}>
                                    <Text style={pStyles.programTimeText}>
                                        {timeFormatter.format(currentProgram.start)}
                                    </Text>
                                    <View style={pStyles.progressBarContainer}>
                                        <View style={[pStyles.progressBarFill, { width: `${progressPercent}%`, backgroundColor: colors.primary }]} />
                                    </View>
                                    <Text style={pStyles.programTimeText}>
                                        {timeFormatter.format(currentProgram.end)}
                                    </Text>
                                </View>

                                <Text style={pStyles.nextProgramText} numberOfLines={1}>
                                  {nextProgram
                                    ? `Next: ${timeFormatter.format(nextProgram.start)} - ${nextProgram.title}`
                                    : 'Next: —'}
                                </Text>
                            </View>
                         ) : (
                             <Text style={pStyles.noEpgText}>No EPG Data Available</Text>
                         )}

                         {/* Metadata row */}
                         {videoMetadata?.width && videoMetadata?.height && (
                           <View style={pStyles.metadataRow}>
                             <Text style={pStyles.metadataText}>{videoMetadata.width}x{videoMetadata.height}</Text>
                             {videoMetadata.fps ? <Text style={pStyles.metadataText}> • {Math.round(videoMetadata.fps)} FPS</Text> : null}
                             {videoMetadata.bitrate ? <Text style={pStyles.metadataText}> • {Math.round(videoMetadata.bitrate / 1000)} kbps</Text> : null}
                             <Text style={pStyles.metadataText}> • {canSeek ? t('vod') : t('live')}</Text>
                           </View>
                         )}
                     </View>
                 </View>
              </View>
          )}

          {/* VOD/Series/Catchup info bar */}
          {!currentChannel && (
            <View style={[pStyles.bottomBar, { borderTopColor: colors.primary }]}>
              <View style={pStyles.vodInfoContainer}>
                <View style={pStyles.vodHeaderRow}>
                  <Text style={pStyles.vodTitle} numberOfLines={1}>{playbackTitle}</Text>
                  <Text style={pStyles.timeText}>{timeFormatter.format(new Date())}</Text>
                </View>

                <View style={pStyles.progressRow}>
                  <Text style={pStyles.programTimeText}>{formatDuration(playbackProgress.currentTime)}</Text>
                  <View style={pStyles.progressBarContainer}>
                    <View style={[pStyles.progressBarFill, { width: `${playbackPercent}%`, backgroundColor: colors.primary }]} />
                  </View>
                  <Text style={pStyles.programTimeText}>
                    {playbackProgress.duration > 0 ? formatDuration(playbackProgress.duration) : '--:--'}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </TVFocusGuideView>
      )}
    </View>
  );
};

const pStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  topBar: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    padding: 10,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // TiviMate channel number badge in top bar
  topChannelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  channelNumCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  channelNumText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
  },
  topChannelName: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    maxWidth: 250,
  },
  qualityBadge: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  qualityText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  // Channel switch mini-overlay
  channelSwitchOverlay: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 50,
  },
  channelSwitchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 2,
    minWidth: 250,
  },
  channelNumberBadge: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  channelNumberText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  switchLogo: {
    width: 40,
    height: 28,
    borderRadius: 4,
  },
  switchName: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  switchProgram: {
    color: '#9E9EB8',
    fontSize: 12,
    marginTop: 2,
  },
  // Pause indicator
  pauseIndicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -40 }, { translateY: -40 }],
    backgroundColor: 'rgba(30,30,46,0.6)',
    padding: 16,
    borderRadius: 40,
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Bottom bar
  bottomBar: {
    backgroundColor: 'rgba(18, 18, 30, 0.92)',
    borderTopWidth: 3,
    height: Platform.isTV ? 188 : 160,
    justifyContent: 'center',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 20,
  },
  channelLogo: {
      width: 100,
      height: 100,
      marginRight: 20,
      backgroundColor: 'rgba(255,255,255,0.05)',
      borderRadius: 8,
  },
  textContainer: {
      flex: 1,
  },
  vodInfoContainer: {
    padding: 20,
    paddingBottom: 20,
  },
  vodHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  vodTitle: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '700',
    flex: 1,
    marginRight: 12,
  },
  headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      marginBottom: 6,
  },
  channelName: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
    flex: 1,
  },
  timeText: {
      color: '#9E9EB8',
      fontSize: 18,
      fontWeight: '600',
  },
  epgContainer: {
      marginTop: 2,
  },
  programTitle: {
      color: '#FFF',
      fontSize: 18,
      fontWeight: '500',
      marginBottom: 10,
  },
  progressRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 6,
  },
  programTimeText: {
      color: '#9E9EB8',
      fontSize: 13,
      fontWeight: '600',
  },
  progressBarContainer: {
      flex: 1,
      height: 5,
      backgroundColor: 'rgba(255,255,255,0.15)',
      borderRadius: 2.5,
      marginHorizontal: 10,
      overflow: 'hidden',
  },
  progressBarFill: {
      height: '100%',
      borderRadius: 2.5,
  },
  nextProgramText: {
      color: '#6B6B8D',
      fontSize: 14,
      marginTop: 2,
  },
  noEpgText: {
      color: '#6B6B8D',
      fontSize: 16,
      fontStyle: 'italic',
      marginTop: 6,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    opacity: 0.6,
  },
  metadataText: {
    color: '#9E9EB8',
    fontSize: 12,
    fontWeight: '500',
  },
});

export default PlayerScreen;
