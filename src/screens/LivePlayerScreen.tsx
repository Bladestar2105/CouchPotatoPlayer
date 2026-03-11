import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, BackHandler, ActivityIndicator, TouchableOpacity, Animated, Platform, StatusBar, PanResponder } from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import Video from 'react-native-video';
import { RootStackParamList } from '../../App';
import { useAppStore } from '../store';
import { XtreamService } from '../services/xtream';
import { LiveChannel } from '../types/iptv';
import { Tv, ChevronLeft, ChevronUp, ChevronDown, RotateCcw, Play, FastForward } from 'lucide-react-native';
import { KSPlayerView } from '../components/KSPlayerView';
import { isTV, isMobile } from '../utils/platform';
import { getPlayerConfig, getOptimalExtension } from '../utils/streamingConfig';

type LivePlayerRouteProp = RouteProp<RootStackParamList, 'LivePlayer'>;

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
  const navigation = useNavigation();
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
    ...(type === 'live' ? { type: optimalExtension === 'm3u8' ? 'm3u8' : undefined } : {}),
  };

  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={1}
      onPress={resetOverlayTimer}
      {...(panResponder ? panResponder.panHandlers : {})}
    >
      {Platform.OS === 'ios' || Platform.OS === 'tvos' || Platform.OS === 'macos' ? (
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
          onBuffer={({ isBuffering }: { isBuffering: boolean }) => {
            if (isBuffering && !loading) setLoading(true);
            else if (!isBuffering && loading) setLoading(false);
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
          onLoadStart={() => setLoading(true)}
          onLoad={() => {
            setLoading(false);
            setRetryCount(0);
            resetOverlayTimer();
            if (seekOnLoad !== null && seekOnLoad > 0 && videoRef.current) {
              videoRef.current.seek(seekOnLoad);
              setSeekOnLoad(null);
            }
          }}
          onError={(e) => {
            handleStreamError(e);
          }}
          onProgress={({ currentTime, seekableDuration }: { currentTime: number; seekableDuration: number }) => {
            if (type !== 'live' && channelId && currentTime > 0 && Math.floor(currentTime) % 10 === 0) {
              updatePlaybackPosition(channelId, currentTime, seekableDuration);
            }
          }}
          onBuffer={({ isBuffering }: { isBuffering: boolean }) => {
            if (isBuffering && !loading) setLoading(true);
            else if (!isBuffering && loading) setLoading(false);
          }}
          bufferConfig={playerConfig.bufferConfig}
          {...(playerConfig.maxBitRate > 0 ? { maxBitRate: playerConfig.maxBitRate } : {})}
          {...(Platform.OS === 'android' ? { viewType: playerConfig.viewType } : {})}
          disableDisconnectError={playerConfig.disableDisconnectError}
          minLoadRetryCount={playerConfig.minLoadRetryCount}
          hideShutterView={playerConfig.hideShutterView}
          shutterColor={playerConfig.shutterColor}
          playInBackground={false}
          controls={isMobile}
          reportBandwidth={true}
          progressUpdateInterval={1000}
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
            >
              <FastForward color="#FFF" size={16} />
              <Text style={mStyles.speedButtonText}>{playbackRate}x</Text>
            </TouchableOpacity>
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
    </TouchableOpacity>
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
});