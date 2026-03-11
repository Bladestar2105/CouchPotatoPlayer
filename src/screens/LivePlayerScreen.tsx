import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, BackHandler, ActivityIndicator, TouchableOpacity, Animated, Platform, StatusBar } from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import Video from 'react-native-video';
import { RootStackParamList } from '../../App';
import { useAppStore } from '../store';
import { XtreamService } from '../services/xtream';
import { Tv, ChevronLeft } from 'lucide-react-native';
import { KSPlayerView } from '../components/KSPlayerView';
import { isTV, isMobile } from '../utils/platform';
import { getPlayerConfig, getOptimalExtension } from '../utils/streamingConfig';

type LivePlayerRouteProp = RouteProp<RootStackParamList, 'LivePlayer'>;

export const LivePlayerScreen = () => {
  const route = useRoute<LivePlayerRouteProp>();
  const navigation = useNavigation();
  const { channelId, channelName, extension = 'ts', directSource, type = 'live' } = route.params;
  const config = useAppStore(state => state.config);
  const streamingSettings = useAppStore(state => state.streamingSettings);

  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoRef = useRef<any>(null);

  // ── Compute optimized player config based on stream type and settings ──
  const playerConfig = useMemo(
    () => getPlayerConfig(type as 'live' | 'vod' | 'series', streamingSettings),
    [type, streamingSettings]
  );

  // ── Determine optimal stream extension ──
  const optimalExtension = useMemo(() => {
    if (config?.type === 'm3u') return extension; // M3U uses direct source URL
    return getOptimalExtension(type as 'live' | 'vod' | 'series', extension);
  }, [type, extension, config?.type]);

  useEffect(() => {
    // Hide status bar for immersive player on mobile
    if (isMobile) {
      StatusBar.setHidden(true, 'fade');
      return () => { StatusBar.setHidden(false, 'fade'); };
    }
  }, []);

  useEffect(() => {
    const fetchUrl = async () => {
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
          // Live stream – use optimal extension (m3u8 for ABR)
          const url = xtream.getLiveStreamUrl(channelId as number, optimalExtension);
          setStreamUrl(url);
        }
      } else if (config?.type === 'm3u' && directSource) {
        setStreamUrl(directSource);
      }
    };

    fetchUrl();
  }, [config, channelId, optimalExtension, directSource, type]);

  // ── Retry mechanism for stream errors ──
  const handleRetry = useCallback(() => {
    if (retryCount < 3) {
      setError(false);
      setLoading(true);
      setRetryCount(prev => prev + 1);
      // Force re-fetch by toggling URL
      setStreamUrl(prev => {
        if (!prev) return prev;
        // Add a cache-busting param to force reload
        const separator = prev.includes('?') ? '&' : '?';
        return `${prev}${separator}_retry=${Date.now()}`;
      });
    }
  }, [retryCount]);

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

  if (!streamUrl) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // ── Build Video source with headers for better compatibility ──
  const videoSource = {
    uri: streamUrl,
    // Enable HLS/DASH metadata for adaptive streaming
    ...(type === 'live' ? { type: optimalExtension === 'm3u8' ? 'm3u8' : undefined } : {}),
  };

  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={1}
      onPress={resetOverlayTimer}
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
            console.error('KSPlayer Playback Error:', e);
            // Auto-retry on error for iOS/tvOS/macOS
            if (retryCount < 3) {
              handleRetry();
            } else {
              setError(true);
              setLoading(false);
            }
          }}
          onBuffer={({ isBuffering }: { isBuffering: boolean }) => {
            if (isBuffering && !loading) {
              setLoading(true);
            } else if (!isBuffering && loading) {
              setLoading(false);
            }
          }}
          // ── Optimized KSPlayer Settings ──
          preferredForwardBufferDuration={
            type === 'live'
              ? (playerConfig.bufferConfig.minBufferMs / 1000)
              : (playerConfig.bufferConfig.minBufferMs / 1000)
          }
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
          onLoadStart={() => setLoading(true)}
          onLoad={() => {
            setLoading(false);
            setRetryCount(0);
            resetOverlayTimer();
          }}
          onError={(e) => {
            console.error('Video Playback Error:', e && typeof e === 'object' && 'error' in e ? (e as any).error.errorString || (e as any).error.message || 'Unknown video error' : 'Unknown video error');
            setError(true);
            setLoading(false);
          }}
          onBuffer={({ isBuffering }: { isBuffering: boolean }) => {
            if (isBuffering && !loading) {
              setLoading(true);
            } else if (!isBuffering && loading) {
              setLoading(false);
            }
          }}
          // ── Optimized Buffer Configuration ──
          bufferConfig={playerConfig.bufferConfig}
          // ── Quality & Bitrate Control ──
          {...(playerConfig.maxBitRate > 0 ? { maxBitRate: playerConfig.maxBitRate } : {})}
          // ── Android: SurfaceView for HW-accelerated rendering ──
          {...(Platform.OS === 'android' ? { viewType: playerConfig.viewType } : {})}
          // ── Network Resilience ──
          disableDisconnectError={playerConfig.disableDisconnectError}
          minLoadRetryCount={playerConfig.minLoadRetryCount}
          // ── Visual: No black flashes on stream switch ──
          hideShutterView={playerConfig.hideShutterView}
          shutterColor={playerConfig.shutterColor}
          // ── Playback settings ──
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
        </View>
      )}

      {error && (
        <View style={styles.errorOverlay}>
          <Text style={[styles.errorText, isMobile && mStyles.errorText]}>Unable to play stream</Text>
          {retryCount < 3 && (
            <TouchableOpacity
              style={[styles.retryButton]}
              onPress={handleRetry}
              {...(isTV ? { hasTVPreferredFocus: true } : {})}
            >
              <Text style={styles.retryButtonText}>Retry ({3 - retryCount} left)</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.backButton, isMobile && mStyles.errorBackButton]}
            onPress={() => navigation.goBack()}
            {...(isTV && retryCount >= 3 ? { hasTVPreferredFocus: true } : {})}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      )}

      {showOverlay && !error && (
        <Animated.View style={[styles.infoOverlay, isMobile && mStyles.infoOverlay, { opacity: fadeAnim }]}>
          {/* Mobile: back button at top */}
          {isMobile && (
            <TouchableOpacity
              style={mStyles.topBackButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <ChevronLeft color="#FFF" size={28} />
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
    </TouchableOpacity>
  );
};

// ── Base styles (TV) ──────────────────────────────────────────────────
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
  }
});

// ── Mobile overrides ──────────────────────────────────────────────────
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
});