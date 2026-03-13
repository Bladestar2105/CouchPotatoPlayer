import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, BackHandler, ActivityIndicator, TouchableOpacity, Animated, Platform, StatusBar, PanResponder, ScrollView, Modal } from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Video from 'react-native-video';
import { RootStackParamList } from '../../App';
import { useAppStore } from '../store';
import { XtreamService } from '../services/xtream';
import { LiveChannel } from '../types/iptv';
import { Tv, ChevronLeft, ChevronUp, ChevronDown, RotateCcw, Play, FastForward, Moon, Volume2, Subtitles, SkipForward, Settings, Share2, Activity } from 'lucide-react-native';
import { KSPlayerView } from '../components/KSPlayerView';
import { isTV, isMobile } from '../utils/platform';
import { getPlayerConfig, getOptimalExtension } from '../utils/streamingConfig';
import { MiniEpg } from '../components/MiniEpg';
import { showToast } from '../components/Toast';
import { PlayerGestures } from '../components/PlayerGestures';
import { GestureControls } from '../components/GestureControls';
import { PlayerStats } from '../components/PlayerStats';
import { shareStream } from '../utils/shareStream';
import { KeyboardShortcuts } from '../components/KeyboardShortcuts';

type LivePlayerRouteProp = RouteProp<RootStackParamList, 'LivePlayer'>;
type LivePlayerNavigationProp = NativeStackNavigationProp<RootStackParamList, 'LivePlayer'>;

// ── Extension fallback order for Xtream streams ──
const LIVE_FALLBACK_EXTENSIONS = ['m3u8', 'ts'];
const VOD_FALLBACK_EXTENSIONS = ['m3u8', 'mp4', 'mkv'];

// ── Format time helper ──
const formatTime = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export const LivePlayerScreen = () => {
  const route = useRoute<LivePlayerRouteProp>();
  const navigation = useNavigation<LivePlayerNavigationProp>();
  const { channelId, channelName, extension = 'ts', directSource, type = 'live' } = route.params;
  const config = useAppStore(state => state.config);
  const streamingSettings = useAppStore(state => state.streamingSettings);
  const updatePlaybackPosition = useAppStore(state => state.updatePlaybackPosition);
  const recentlyWatched = useAppStore(state => state.recentlyWatched);

  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [currentChannelName, setCurrentChannelName] = useState(channelName);
  const [zapDirection, setZapDirection] = useState<'up' | 'down' | null>(null);

  // ── Fallback extension tracking ──
  const [currentExtIndex, setCurrentExtIndex] = useState(0);
  const fallbackExtensions = useMemo(() => {
    if (config?.type !== 'xtream') return [extension];
    return type === 'live' ? LIVE_FALLBACK_EXTENSIONS : VOD_FALLBACK_EXTENSIONS;
  }, [type, extension, config?.type]);

  // ── Resume playback dialog ──
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [savedPosition, setSavedPosition] = useState(0);
  const [savedDuration, setSavedDuration] = useState(0);
  const [seekOnLoad, setSeekOnLoad] = useState<number | null>(null);

  // ── Playback speed (VOD only) ──
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const SPEED_OPTIONS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

  // ── Audio/Subtitle track selection ──
  const [audioTracks, setAudioTracks] = useState<any[]>([]);
  const [textTracks, setTextTracks] = useState<any[]>([]);
  const [selectedAudioTrack, setSelectedAudioTrack] = useState<any>(undefined);
  const [selectedTextTrack, setSelectedTextTrack] = useState<any>(undefined);
  const [showTrackPicker, setShowTrackPicker] = useState<'audio' | 'subtitle' | null>(null);

  // ── Sleep timer ──
  const [sleepMinutes, setSleepMinutes] = useState<number | null>(null);
  const [sleepRemaining, setSleepRemaining] = useState<number>(0);
  const [showSleepPicker, setShowSleepPicker] = useState(false);
  const sleepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const SLEEP_OPTIONS = [15, 30, 45, 60, 90, 120];

  // ── Auto-play next episode (series) ──
  const [currentDuration, setCurrentDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showNextEpisode, setShowNextEpisode] = useState(false);
  const [nextEpisodeInfo, setNextEpisodeInfo] = useState<{id: number; name: string; ext: string} | null>(null);
  const autoPlayTriggered = useRef(false);

  // ── Volume control ──
  const [volume, setVolume] = useState(1.0);

  // ── Player stats overlay ──
  const [showStats, setShowStats] = useState(false);
  const [videoMeta, setVideoMeta] = useState<any>({});
  const [isBuffering, setIsBuffering] = useState(false);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoRef = useRef<any>(null);

  // ── Channel Zapping (swipe up/down to switch live channels) ──
  const channels = useAppStore(state => state.channels);
  const addRecentlyWatched = useAppStore(state => state.addRecentlyWatched);

  const currentChannelIndex = useMemo(() => {
    if (type !== 'live') return -1;
    return channels.findIndex(c => c.stream_id === channelId);
  }, [channels, channelId, type]);

  const zapToChannel = useCallback((direction: 'up' | 'down') => {
    if (type !== 'live' || currentChannelIndex < 0 || channels.length < 2) return;
    const nextIdx = direction === 'up'
      ? (currentChannelIndex - 1 + channels.length) % channels.length
      : (currentChannelIndex + 1) % channels.length;
    const nextChannel = channels[nextIdx];
    if (!nextChannel) return;

    // Show zap animation
    setZapDirection(direction);
    setTimeout(() => setZapDirection(null), 800);

    // Track recently watched
    addRecentlyWatched({
      id: nextChannel.stream_id,
      type: 'live',
      name: nextChannel.title || nextChannel.name,
      icon: nextChannel.stream_icon || nextChannel.cover,
      extension: 'm3u8',
      directSource: nextChannel.direct_source,
      lastWatchedAt: Date.now(),
    });

    // Navigate to new channel
    navigation.replace('LivePlayer', {
      channelId: nextChannel.stream_id,
      channelName: nextChannel.title || nextChannel.name,
      extension: 'm3u8',
      directSource: nextChannel.direct_source,
      type: 'live',
    });
  }, [type, currentChannelIndex, channels, navigation, addRecentlyWatched]);

  // PanResponder for swipe detection on mobile
  const panResponder = useMemo(() => {
    if (!isMobile || type !== 'live') return null;
    return PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 50 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 1.5;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy < -80) {
          zapToChannel('down');
        } else if (gestureState.dy > 80) {
          zapToChannel('up');
        }
      },
    });
  }, [type, zapToChannel]);

  // ── Compute optimized player config ──
  const playerConfig = useMemo(
    () => getPlayerConfig(type as 'live' | 'vod' | 'series', streamingSettings),
    [type, streamingSettings]
  );

  // ── Determine optimal stream extension ──
  const optimalExtension = useMemo(() => {
    if (config?.type === 'm3u') return extension;
    return fallbackExtensions[currentExtIndex] || getOptimalExtension(type as 'live' | 'vod' | 'series', extension);
  }, [type, extension, config?.type, fallbackExtensions, currentExtIndex]);

  useEffect(() => {
    if (isMobile) {
      StatusBar.setHidden(true, 'fade');
      return () => { StatusBar.setHidden(false, 'fade'); };
    }
  }, []);

  // ── Check for saved playback position (Resume dialog) ──
  useEffect(() => {
    if (type !== 'live' && channelId) {
      const recent = recentlyWatched.find(r => r.id === channelId && r.type === type);
      if (recent && recent.position && recent.position > 30 && recent.duration && recent.position < recent.duration - 30) {
        setSavedPosition(recent.position);
        setSavedDuration(recent.duration);
        setShowResumeDialog(true);
      }
    }
  }, [channelId, type]);

  useEffect(() => {
    const fetchUrl = async () => {
      if (showResumeDialog) return; // Wait for user choice

      if (config?.type === 'xtream' && channelId) {
        const xtream = new XtreamService(config);
        if (type === 'vod') {
          const url = xtream.getVodStreamUrl(channelId as number, optimalExtension);
          setStreamUrl(url);
        } else if (type === 'series') {
          try {
            const seriesInfo = await xtream.getSeriesInfo(channelId as number);
            let firstEpisodeId = null;
            let epExtension = 'mp4';
            if (seriesInfo && seriesInfo.episodes) {
              const seasons = Object.values(seriesInfo.episodes) as any[][];
              if (seasons.length > 0 && seasons[0].length > 0) {
                const firstEp = seasons[0][0];
                firstEpisodeId = firstEp.id;
                if (firstEp.container_extension) {
                  epExtension = firstEp.container_extension;
                }
              }
            }
            if (firstEpisodeId) {
              const finalExt = getOptimalExtension('series', epExtension);
              const url = xtream.getSeriesStreamUrl(firstEpisodeId, finalExt);
              setStreamUrl(url);
            } else {
              setError(true);
              setLoading(false);
            }
          } catch (err) {
            console.error('Failed to get series info', err);
            setError(true);
            setLoading(false);
          }
        } else {
          const url = xtream.getLiveStreamUrl(channelId as number, optimalExtension);
          setStreamUrl(url);
        }
      } else if (config?.type === 'm3u' && directSource) {
        setStreamUrl(directSource);
      }
    };

    fetchUrl();
  }, [config, channelId, optimalExtension, directSource, type, showResumeDialog]);

  // ── Fallback extension retry on error ──
  const handleStreamError = useCallback((e: any) => {
    console.error('Playback Error:', e);

    // Try next extension first (Xtream only)
    if (config?.type === 'xtream' && currentExtIndex < fallbackExtensions.length - 1) {
      console.log(`Trying fallback extension: ${fallbackExtensions[currentExtIndex + 1]}`);
      setCurrentExtIndex(prev => prev + 1);
      setError(false);
      setLoading(true);
      return;
    }

    // Then retry with cache-busting
    if (retryCount < 3) {
      setError(false);
      setLoading(true);
      setRetryCount(prev => prev + 1);
      setStreamUrl(prev => {
        if (!prev) return prev;
        const separator = prev.includes('?') ? '&' : '?';
        return `${prev}${separator}_retry=${Date.now()}`;
      });
    } else {
      setError(true);
      setLoading(false);
    }
  }, [config?.type, currentExtIndex, fallbackExtensions, retryCount]);

  // ── Manual retry (resets everything) ──
  const handleRetry = useCallback(() => {
    setCurrentExtIndex(0);
    setRetryCount(0);
    setError(false);
    setLoading(true);
    setStreamUrl(prev => {
      if (!prev) return prev;
      const base = prev.split('?_retry=')[0].split('&_retry=')[0];
      return `${base}?_retry=${Date.now()}`;
    });
  }, []);

  // ── Resume dialog handlers ──
  const handleResumeFromPosition = useCallback(() => {
    setSeekOnLoad(savedPosition);
    setShowResumeDialog(false);
  }, [savedPosition]);

  const handleStartOver = useCallback(() => {
    setSeekOnLoad(0);
    setShowResumeDialog(false);
  }, []);

  const resetOverlayTimer = useCallback(() => {
    setShowOverlay(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();

    if (hideTimer.current) clearTimeout(hideTimer.current);

    hideTimer.current = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => setShowOverlay(false));
    }, isMobile ? 3000 : 5000);
  }, [fadeAnim]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      navigation.goBack();
      return true;
    });

    resetOverlayTimer();

    return () => {
      backHandler.remove();
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [navigation, resetOverlayTimer]);

  // ── Cycle playback speed ──
  const cyclePlaybackSpeed = useCallback(() => {
    setPlaybackRate(prev => {
      const currentIdx = SPEED_OPTIONS.indexOf(prev);
      const nextIdx = (currentIdx + 1) % SPEED_OPTIONS.length;
      return SPEED_OPTIONS[nextIdx];
    });
  }, []);

  // ── Sleep timer management ──
  const startSleepTimer = useCallback((minutes: number) => {
    if (sleepTimerRef.current) clearInterval(sleepTimerRef.current);
    setSleepMinutes(minutes);
    setSleepRemaining(minutes * 60);
    setShowSleepPicker(false);
    showToast(`Sleep timer: ${minutes} min`, 'info');
    sleepTimerRef.current = setInterval(() => {
      setSleepRemaining(prev => {
        if (prev <= 1) {
          if (sleepTimerRef.current) clearInterval(sleepTimerRef.current);
          setSleepMinutes(null);
          showToast('Sleep timer ended', 'info');
          navigation.goBack();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [navigation]);

  const cancelSleepTimer = useCallback(() => {
    if (sleepTimerRef.current) clearInterval(sleepTimerRef.current);
    setSleepMinutes(null);
    setSleepRemaining(0);
    setShowSleepPicker(false);
    showToast('Sleep timer cancelled', 'info');
  }, []);

  useEffect(() => {
    return () => {
      if (sleepTimerRef.current) clearInterval(sleepTimerRef.current);
    };
  }, []);

  // ── Handle video loaded - extract tracks ──
  const handleVideoLoad = useCallback((data: any) => {
    setLoading(false);
    setRetryCount(0);
    resetOverlayTimer();
    if (seekOnLoad !== null && seekOnLoad > 0 && videoRef.current) {
      videoRef.current.seek(seekOnLoad);
      setSeekOnLoad(null);
    }
    // Extract audio tracks
    if (data?.audioTracks && data.audioTracks.length > 0) {
      setAudioTracks(data.audioTracks);
    }
    // Extract text/subtitle tracks
    if (data?.textTracks && data.textTracks.length > 0) {
      setTextTracks(data.textTracks);
    }
    // Store duration for auto-play
    if (data?.duration) {
      setCurrentDuration(data.duration);
    }
    // Capture video metadata for stats overlay
    setVideoMeta({
      naturalSize: data?.naturalSize,
      width: data?.naturalSize?.width,
      height: data?.naturalSize?.height,
      codec: data?.videoCodec || data?.codec,
      audioCodec: data?.audioCodec,
      fps: data?.fps,
      bitrate: data?.bitrate,
      audioChannels: data?.audioChannels,
    });
  }, [resetOverlayTimer, seekOnLoad]);

  // ── Handle progress - auto-play next episode detection ──
  const handleProgress = useCallback((data: { currentTime: number; seekableDuration: number }) => {
    setCurrentTime(data.currentTime);
    // Save position for VOD/Series
    if (type !== 'live' && channelId && data.currentTime > 0 && Math.floor(data.currentTime) % 10 === 0) {
      updatePlaybackPosition(channelId, data.currentTime, data.seekableDuration);
    }
    // Auto-play next episode: show prompt 30s before end
    if (type === 'series' && nextEpisodeInfo && !autoPlayTriggered.current) {
      if (data.seekableDuration > 60 && data.currentTime > data.seekableDuration - 30) {
        setShowNextEpisode(true);
        autoPlayTriggered.current = true;
      }
    }
  }, [type, channelId, updatePlaybackPosition, nextEpisodeInfo]);

  // ── Auto-play: navigate to next episode ──
  const playNextEpisode = useCallback(() => {
    if (!nextEpisodeInfo) return;
    setShowNextEpisode(false);
    addRecentlyWatched({
      id: nextEpisodeInfo.id,
      type: 'series',
      name: nextEpisodeInfo.name,
      icon: '',
      extension: nextEpisodeInfo.ext,
      lastWatchedAt: Date.now(),
    });
    navigation.replace('LivePlayer', {
      channelId: nextEpisodeInfo.id,
      channelName: nextEpisodeInfo.name,
      extension: nextEpisodeInfo.ext,
      type: 'series',
    });
  }, [nextEpisodeInfo, navigation, addRecentlyWatched]);

  const dismissNextEpisode = useCallback(() => {
    setShowNextEpisode(false);
  }, []);

  // ── Share current stream ──
  const handleShare = useCallback(() => {
    shareStream({
      channelName: currentChannelName,
      type: type as 'live' | 'vod' | 'series',
      streamUrl: streamUrl || undefined,
    });
  }, [currentChannelName, type, streamUrl]);

  // ── Fetch next episode info for series ──
  useEffect(() => {
    if (type !== 'series' || !config || config.type !== 'xtream' || !channelId) return;
    const fetchNextEp = async () => {
      try {
        const xtream = new XtreamService(config);
        const seriesInfo = await xtream.getSeriesInfo(channelId as number);
        if (!seriesInfo?.episodes) return;
        const allEpisodes: any[] = [];
        Object.values(seriesInfo.episodes).forEach((season: any) => {
          if (Array.isArray(season)) allEpisodes.push(...season);
        });
        const currentIdx = allEpisodes.findIndex((ep: any) => ep.id === channelId);
        if (currentIdx >= 0 && currentIdx < allEpisodes.length - 1) {
          const next = allEpisodes[currentIdx + 1];
          setNextEpisodeInfo({
            id: next.id,
            name: next.title || `Episode ${next.episode_num || currentIdx + 2}`,
            ext: next.container_extension || 'mp4',
          });
        }
      } catch (e) {
        // Silently fail - no next episode available
      }
    };
    fetchNextEp();
  }, [type, config, channelId]);

  // ── Double-tap seek (10 seconds) ──
  const handleSeekForward = useCallback(() => {
    if (type === 'live' || !videoRef.current) return;
    videoRef.current.seek && videoRef.current.seek(10);
  }, [type]);

  const handleSeekBackward = useCallback(() => {
    if (type === 'live' || !videoRef.current) return;
    videoRef.current.seek && videoRef.current.seek(-10);
  }, [type]);

  // ── Get EPG channel ID for MiniEpg ──
  const epgChannelId = useMemo(() => {
    if (type !== 'live' || currentChannelIndex < 0) return undefined;
    const ch = channels[currentChannelIndex];
    return ch?.epg_channel_id || ch?.stream_id?.toString();
  }, [type, currentChannelIndex, channels]);

  // ── Resume dialog screen ──
  if (showResumeDialog) {
    return (
      <View style={styles.container}>
        <View style={mStyles.resumeOverlay}>
          <View style={mStyles.resumeDialog}>
            <Text style={mStyles.resumeTitle}>Continue Watching?</Text>
            <Text style={mStyles.resumeSubtitle}>
              You stopped at {formatTime(savedPosition)} of {formatTime(savedDuration)}
            </Text>
            <View style={mStyles.resumeProgressBg}>
              <View style={[mStyles.resumeProgressFill, { width: `${Math.min((savedPosition / savedDuration) * 100, 100)}%` }]} />
            </View>
            <TouchableOpacity
              style={mStyles.resumeButton}
              onPress={handleResumeFromPosition}
              {...(isTV ? { hasTVPreferredFocus: true } : {})}
            >
              <Play color="#FFF" size={18} />
              <Text style={mStyles.resumeButtonText}>Continue from {formatTime(savedPosition)}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={mStyles.restartButton}
              onPress={handleStartOver}
            >
              <RotateCcw color="#FFF" size={18} />
              <Text style={mStyles.restartButtonText}>Start from Beginning</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  if (!streamUrl) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // ── Build Video source ──
  const videoSource = {
    uri: streamUrl,
    ...(type === 'live' && Platform.OS !== 'web' ? { type: optimalExtension === 'm3u8' ? 'm3u8' : undefined } : {}),
  };

  // ── Keyboard shortcut handlers (web) ──
  const handlePlayPause = useCallback(() => {
    if (videoRef.current) {
      // Toggle play/pause via ref if available
    }
  }, []);

  const handleMute = useCallback(() => {
    setVolume(prev => prev > 0 ? 0 : 1.0);
  }, []);

  const handleVolumeUp = useCallback(() => {
    setVolume(prev => Math.min(1, prev + 0.1));
  }, []);

  const handleVolumeDown = useCallback(() => {
    setVolume(prev => Math.max(0, prev - 0.1));
  }, []);

  const handleFullscreen = useCallback(() => {
    if (typeof globalThis !== 'undefined' && (globalThis as any).document) {
      const doc = (globalThis as any).document;
      const el = doc.documentElement;
      if (!doc.fullscreenElement) {
        el.requestFullscreen?.();
      } else {
        doc.exitFullscreen?.();
      }
    }
  }, []);

  const handleSpeedUp = useCallback(() => {
    if (type === 'live') return;
    setPlaybackRate(prev => {
      const currentIdx = SPEED_OPTIONS.indexOf(prev);
      return currentIdx < SPEED_OPTIONS.length - 1 ? SPEED_OPTIONS[currentIdx + 1] : prev;
    });
  }, [type]);

  const handleSpeedDown = useCallback(() => {
    if (type === 'live') return;
    setPlaybackRate(prev => {
      const currentIdx = SPEED_OPTIONS.indexOf(prev);
      return currentIdx > 0 ? SPEED_OPTIONS[currentIdx - 1] : prev;
    });
  }, [type]);

  return (
    <KeyboardShortcuts
      onPlayPause={handlePlayPause}
      onSeekForward={handleSeekForward}
      onSeekBackward={handleSeekBackward}
      onVolumeUp={handleVolumeUp}
      onVolumeDown={handleVolumeDown}
      onMute={handleMute}
      onFullscreen={handleFullscreen}
      onEscape={() => navigation.goBack()}
      onSpeedUp={handleSpeedUp}
      onSpeedDown={handleSpeedDown}
      onNextChannel={() => zapToChannel('down')}
      onPrevChannel={() => zapToChannel('up')}
      onToggleStats={() => setShowStats(s => !s)}
      enabled={true}
    >
    <GestureControls
      enabled={isMobile}
      onVolumeChange={setVolume}
    >
    <PlayerGestures
      onSeekForward={handleSeekForward}
      onSeekBackward={handleSeekBackward}
      onTap={resetOverlayTimer}
      enabled={type !== 'live'}
    >
    <TouchableOpacity
      style={styles.container}
      activeOpacity={1}
      onPress={type === 'live' ? resetOverlayTimer : undefined}
      {...(panResponder ? panResponder.panHandlers : {})}
    >
      {(Platform.OS as string) === 'ios' || (Platform.OS as string) === 'tvos' || (Platform.OS as string) === 'macos' ? (
        <KSPlayerView
          source={{ uri: streamUrl }}
          style={styles.videoPlayer}
          onLoadStart={() => setLoading(true)}
          onLoad={() => {
            setLoading(false);
            setRetryCount(0);
            resetOverlayTimer();
          }}
          onError={(e) => {
            handleStreamError(e);
          }}
          onBuffer={({ isBuffering: buf }: { isBuffering: boolean }) => {
            setIsBuffering(buf);
            if (buf && !loading) setLoading(true);
            else if (!buf && loading) setLoading(false);
          }}
          preferredForwardBufferDuration={playerConfig.bufferConfig.minBufferMs / 1000}
          maxBufferDuration={playerConfig.bufferConfig.maxBufferMs / 1000}
          hardwareDecode={streamingSettings.hardwareAcceleration}
          isSecondOpen={true}
          videoAdaptable={streamingSettings.videoQuality === 'auto'}
          isAutoPlay={true}
          {...(playerConfig.maxBitRate > 0 ? { maxBitRate: playerConfig.maxBitRate } : {})}
        />
      ) : (
        <Video
          ref={videoRef}
          source={videoSource}
          style={styles.videoPlayer}
          resizeMode="contain"
          rate={type !== 'live' ? playbackRate : 1.0}
          volume={volume}
          onLoadStart={() => setLoading(true)}
          onLoad={handleVideoLoad}
          onError={(e) => {
            handleStreamError(e);
          }}
          onProgress={handleProgress}
          onBuffer={({ isBuffering: buf }: { isBuffering: boolean }) => {
            setIsBuffering(buf);
            if (buf && !loading) setLoading(true);
            else if (!buf && loading) setLoading(false);
          }}
          bufferConfig={playerConfig.bufferConfig}
          {...(playerConfig.maxBitRate > 0 ? { maxBitRate: playerConfig.maxBitRate } : {})}
          {...(Platform.OS === 'android' ? { viewType: playerConfig.viewType as any } : {})}
          disableDisconnectError={playerConfig.disableDisconnectError}
          minLoadRetryCount={playerConfig.minLoadRetryCount}
          hideShutterView={playerConfig.hideShutterView}
          shutterColor={playerConfig.shutterColor}
          playInBackground={false}
          controls={isMobile}
          reportBandwidth={true}
          onBandwidthUpdate={({ bitrate }: { bitrate: number }) => setVideoMeta((prev: any) => ({ ...prev, bitrate }))}
          progressUpdateInterval={1000}
          {...(selectedAudioTrack ? { selectedAudioTrack } : {})}
          {...(selectedTextTrack ? { selectedTextTrack } : {})}
        />
      )}

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#FFF" />
          <Text style={styles.loadingText}>Buffering...</Text>
          {currentExtIndex > 0 && (
            <Text style={mStyles.fallbackHint}>
              Trying format: {fallbackExtensions[currentExtIndex]?.toUpperCase()}
            </Text>
          )}
        </View>
      )}

      {error && (
        <View style={styles.errorOverlay}>
          <Text style={[styles.errorText, isMobile && mStyles.errorText]}>Unable to play stream</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleRetry}
            {...(isTV ? { hasTVPreferredFocus: true } : {})}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.backButton, isMobile && mStyles.errorBackButton]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      )}

      {showOverlay && !error && (
        <Animated.View style={[styles.infoOverlay, isMobile && mStyles.infoOverlay, { opacity: fadeAnim }]}>
          {isMobile && (
            <TouchableOpacity
              style={mStyles.topBackButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <ChevronLeft color="#FFF" size={28} />
            </TouchableOpacity>
          )}

          {/* Mobile VOD: playback speed button */}
          {isMobile && type !== 'live' && (
            <TouchableOpacity
              style={mStyles.speedButton}
              onPress={cyclePlaybackSpeed}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Change playback speed, currently ${playbackRate}x`}
            >
              <FastForward color="#FFF" size={16} />
              <Text style={mStyles.speedButtonText}>{playbackRate}x</Text>
            </TouchableOpacity>
          )}

          {/* Mini EPG for live channels */}
          {type === 'live' && (
            <MiniEpg
              channelId={channelId}
              epgChannelId={epgChannelId}
              visible={true}
              configType={config?.type}
            />
          )}

          <View style={[styles.infoBottom, isMobile && mStyles.infoBottom]}>
            <View style={styles.infoContainer}>
              <Tv color="#FFF" size={isMobile ? 22 : 32} />
              <View style={styles.textContainer}>
                <Text style={[styles.channelName, isMobile && mStyles.channelName]}>{channelName}</Text>
                {type === 'live' && (
                  <View style={styles.liveRow}>
                    <View style={styles.liveDot} />
                    <Text style={[styles.channelStatus, isMobile && mStyles.channelStatus]}>LIVE</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </Animated.View>
      )}

      {/* Channel zap hint */}
      {isMobile && type === 'live' && channels.length > 1 && showOverlay && !error && (
        <Animated.View style={[mStyles.zapHint, { opacity: fadeAnim }]} pointerEvents="none">
          <ChevronUp size={16} color="#999" />
          <ChevronDown size={16} color="#999" />
        </Animated.View>
      )}

      {/* Zap direction animation */}
      {zapDirection && (
        <View style={mStyles.zapOverlay}>
          <Text style={mStyles.zapText}>
            {zapDirection === 'up' ? '\u2B06 Previous' : '\u2B07 Next'}
          </Text>
        </View>
      )}

      {/* Player toolbar: audio, subtitles, sleep timer */}
      {showOverlay && !error && isMobile && (
        <Animated.View style={[mStyles.playerToolbar, { opacity: fadeAnim }]}>
          {audioTracks.length > 1 && (
            <TouchableOpacity style={mStyles.toolbarButton} onPress={() => { setShowTrackPicker('audio'); resetOverlayTimer(); }}>
              <Volume2 color="#FFF" size={20} />
              <Text style={mStyles.toolbarLabel}>Audio</Text>
            </TouchableOpacity>
          )}
          {textTracks.length > 0 && (
            <TouchableOpacity style={mStyles.toolbarButton} onPress={() => { setShowTrackPicker('subtitle'); resetOverlayTimer(); }}>
              <Subtitles color="#FFF" size={20} />
              <Text style={mStyles.toolbarLabel}>Subs</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={mStyles.toolbarButton} onPress={() => { setShowSleepPicker(true); resetOverlayTimer(); }}>
            <Moon color={sleepMinutes ? '#4CD964' : '#FFF'} size={20} />
            <Text style={[mStyles.toolbarLabel, sleepMinutes ? { color: '#4CD964' } : {}]}>
              {sleepMinutes ? `${Math.floor(sleepRemaining / 60)}m` : 'Sleep'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={mStyles.toolbarButton} onPress={handleShare}>
            <Share2 color="#FFF" size={20} />
            <Text style={mStyles.toolbarLabel}>Share</Text>
          </TouchableOpacity>
          <TouchableOpacity style={mStyles.toolbarButton} onPress={() => { setShowStats(s => !s); resetOverlayTimer(); }}>
            <Activity color={showStats ? '#4CD964' : '#FFF'} size={20} />
            <Text style={[mStyles.toolbarLabel, showStats ? { color: '#4CD964' } : {}]}>Stats</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Sleep timer remaining indicator */}
      {sleepMinutes && !showOverlay && (
        <View style={mStyles.sleepBadge}>
          <Moon color="#4CD964" size={12} />
          <Text style={mStyles.sleepBadgeText}>{Math.floor(sleepRemaining / 60)}:{(sleepRemaining % 60).toString().padStart(2, '0')}</Text>
        </View>
      )}

      {/* Audio/Subtitle Track Picker Modal */}
      <Modal
        visible={showTrackPicker !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTrackPicker(null)}
      >
        <TouchableOpacity style={mStyles.modalBackdrop} activeOpacity={1} onPress={() => setShowTrackPicker(null)}>
          <View style={mStyles.trackPickerContainer}>
            <Text style={mStyles.trackPickerTitle}>
              {showTrackPicker === 'audio' ? 'Audio Track' : 'Subtitles'}
            </Text>
            <ScrollView style={mStyles.trackPickerList}>
              {showTrackPicker === 'subtitle' && (
                <TouchableOpacity
                  style={[mStyles.trackItem, !selectedTextTrack ? mStyles.trackItemActive : {}]}
                  onPress={() => { setSelectedTextTrack({ type: 'disabled' }); setShowTrackPicker(null); }}
                >
                  <Text style={[mStyles.trackItemText, !selectedTextTrack ? mStyles.trackItemTextActive : {}]}>Off</Text>
                </TouchableOpacity>
              )}
              {(showTrackPicker === 'audio' ? audioTracks : textTracks).map((track: any, idx: number) => {
                const isSelected = showTrackPicker === 'audio'
                  ? selectedAudioTrack?.value === (track.index ?? idx)
                  : selectedTextTrack?.value === (track.index ?? idx);
                const label = track.language
                  ? `${track.title || track.language}${track.language ? ` (${track.language})` : ''}`
                  : track.title || `Track ${idx + 1}`;
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[mStyles.trackItem, isSelected ? mStyles.trackItemActive : {}]}
                    onPress={() => {
                      if (showTrackPicker === 'audio') {
                        setSelectedAudioTrack({ type: 'index', value: track.index ?? idx });
                      } else {
                        setSelectedTextTrack({ type: 'index', value: track.index ?? idx });
                      }
                      setShowTrackPicker(null);
                    }}
                  >
                    <Text style={[mStyles.trackItemText, isSelected ? mStyles.trackItemTextActive : {}]}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Sleep Timer Picker Modal */}
      <Modal
        visible={showSleepPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSleepPicker(false)}
      >
        <TouchableOpacity style={mStyles.modalBackdrop} activeOpacity={1} onPress={() => setShowSleepPicker(false)}>
          <View style={mStyles.trackPickerContainer}>
            <Text style={mStyles.trackPickerTitle}>Sleep Timer</Text>
            <ScrollView style={mStyles.trackPickerList}>
              {sleepMinutes && (
                <TouchableOpacity style={[mStyles.trackItem, { borderBottomWidth: 1, borderBottomColor: '#333' }]} onPress={cancelSleepTimer}>
                  <Text style={[mStyles.trackItemText, { color: '#FF453A' }]}>Cancel Timer ({Math.floor(sleepRemaining / 60)}m remaining)</Text>
                </TouchableOpacity>
              )}
              {SLEEP_OPTIONS.map((mins) => (
                <TouchableOpacity
                  key={mins}
                  style={[mStyles.trackItem, sleepMinutes === mins ? mStyles.trackItemActive : {}]}
                  onPress={() => startSleepTimer(mins)}
                >
                  <Text style={[mStyles.trackItemText, sleepMinutes === mins ? mStyles.trackItemTextActive : {}]}>
                    {mins < 60 ? `${mins} minutes` : `${mins / 60} hour${mins > 60 ? 's' : ''}`}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Player stats overlay */}
      <PlayerStats
        visible={showStats}
        streamUrl={streamUrl}
        videoData={videoMeta}
        bufferHealth={{ isBuffering }}
        currentTime={currentTime}
        duration={currentDuration}
        playbackRate={playbackRate}
      />

      {/* Auto-play next episode prompt */}
      {showNextEpisode && nextEpisodeInfo && (
        <View style={mStyles.nextEpisodeBar}>
          <View style={mStyles.nextEpisodeInfo}>
            <Text style={mStyles.nextEpisodeLabel}>Up Next</Text>
            <Text style={mStyles.nextEpisodeName} numberOfLines={1}>{nextEpisodeInfo.name}</Text>
          </View>
          <TouchableOpacity style={mStyles.nextEpisodePlayBtn} onPress={playNextEpisode}>
            <SkipForward color="#FFF" size={18} />
            <Text style={mStyles.nextEpisodePlayText}>Play</Text>
          </TouchableOpacity>
          <TouchableOpacity style={mStyles.nextEpisodeDismiss} onPress={dismissNextEpisode}>
            <Text style={mStyles.nextEpisodeDismissText}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
    </PlayerGestures>
    </GestureControls>
    </KeyboardShortcuts>
  );
};

// ── Base styles (TV) ──────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoPlayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  loadingText: {
    color: '#FFF',
    fontSize: 20,
    marginTop: 15,
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  errorText: {
    color: '#FF453A',
    fontSize: 24,
    marginBottom: 20,
    fontWeight: 'bold',
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  backButton: {
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#3C3C3E',
  },
  backButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  infoOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  infoBottom: {
    height: 150,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
    padding: 40,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textContainer: {
    marginLeft: 20,
  },
  channelName: {
    color: '#FFF',
    fontSize: 32,
    fontWeight: 'bold',
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF453A',
    marginRight: 6,
  },
  channelStatus: {
    color: '#FF453A',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

// ── Mobile overrides ──────────────────────────────────────────────────────
const mStyles = StyleSheet.create({
  infoOverlay: {
    justifyContent: 'space-between',
  },
  topBackButton: {
    position: 'absolute',
    top: 44,
    left: 16,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  speedButton: {
    position: 'absolute',
    top: 44,
    right: 16,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  speedButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  infoBottom: {
    height: 'auto',
    padding: 20,
    paddingBottom: 30,
  },
  channelName: {
    fontSize: 18,
  },
  channelStatus: {
    fontSize: 13,
    marginTop: 2,
  },
  errorText: {
    fontSize: 18,
  },
  errorBackButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  zapHint: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  zapOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  zapText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },
  fallbackHint: {
    color: '#999',
    fontSize: 13,
    marginTop: 8,
  },
  // ── Resume dialog styles ──
  resumeOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resumeDialog: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 30,
    width: isMobile ? '85%' : '40%',
    alignItems: 'center',
  },
  resumeTitle: {
    color: '#FFF',
    fontSize: isMobile ? 20 : 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  resumeSubtitle: {
    color: '#AAA',
    fontSize: isMobile ? 14 : 18,
    marginBottom: 16,
    textAlign: 'center',
  },
  resumeProgressBg: {
    width: '100%',
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
    marginBottom: 24,
    overflow: 'hidden',
  },
  resumeProgressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  resumeButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 12,
  },
  resumeButtonText: {
    color: '#FFF',
    fontSize: isMobile ? 16 : 20,
    fontWeight: '600',
  },
  restartButton: {
    backgroundColor: '#2C2C2E',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  restartButtonText: {
    color: '#FFF',
    fontSize: isMobile ? 16 : 20,
    fontWeight: '600',
  },
  // ── Player toolbar (audio/subs/sleep) ──
  playerToolbar: {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: [{ translateY: -60 }],
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 12,
    padding: 8,
    gap: 4,
  },
  toolbarButton: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    minWidth: 48,
  },
  toolbarLabel: {
    color: '#FFF',
    fontSize: 10,
    marginTop: 3,
    fontWeight: '600',
  },
  // ── Sleep badge ──
  sleepBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  sleepBadgeText: {
    color: '#4CD964',
    fontSize: 11,
    fontWeight: '600',
  },
  // ── Track picker modal ──
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  trackPickerContainer: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '50%',
    paddingBottom: 30,
  },
  trackPickerTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  trackPickerList: {
    maxHeight: 300,
  },
  trackItem: {
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  trackItemActive: {
    backgroundColor: 'rgba(0,122,255,0.2)',
  },
  trackItemText: {
    color: '#CCC',
    fontSize: 16,
  },
  trackItemTextActive: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  // ── Next episode bar ──
  nextEpisodeBar: {
    position: 'absolute',
    bottom: 80,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.85)',
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  nextEpisodeInfo: {
    flex: 1,
  },
  nextEpisodeLabel: {
    color: '#999',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  nextEpisodeName: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  nextEpisodePlayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
  },
  nextEpisodePlayText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  nextEpisodeDismiss: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  nextEpisodeDismissText: {
    color: '#999',
    fontSize: 13,
  },
});