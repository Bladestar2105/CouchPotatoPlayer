import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, BackHandler, ActivityIndicator, TouchableOpacity, Animated, Platform, StatusBar } from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import Video from 'react-native-video';
import { RootStackParamList } from '../../App';
import { useAppStore } from '../store';
import { XtreamService } from '../services/xtream';
import { Tv, ChevronLeft } from 'lucide-react-native';
import { KSPlayerView } from '../components/KSPlayerView';
import { isTV, isMobile } from '../utils/platform';

type LivePlayerRouteProp = RouteProp<RootStackParamList, 'LivePlayer'>;

export const LivePlayerScreen = () => {
  const route = useRoute<LivePlayerRouteProp>();
  const navigation = useNavigation();
  const { channelId, channelName, extension = 'ts', directSource, type = 'live' } = route.params;
  const config = useAppStore(state => state.config);

  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
          const url = xtream.getVodStreamUrl(channelId as number, extension);
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
              const url = xtream.getSeriesStreamUrl(firstEpisodeId, epExtension);
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
          const url = xtream.getLiveStreamUrl(channelId as number, extension);
          setStreamUrl(url);
        }
      } else if (config?.type === 'm3u' && directSource) {
        setStreamUrl(directSource);
      }
    };

    fetchUrl();
  }, [config, channelId, extension, directSource, type]);

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
            resetOverlayTimer();
          }}
          onError={(e) => {
            console.error('KSPlayer Playback Error:', e);
            setError(true);
            setLoading(false);
          }}
        />
      ) : (
        <Video
          source={{ uri: streamUrl }}
          style={styles.videoPlayer}
          resizeMode="contain"
          onLoadStart={() => setLoading(true)}
          onLoad={() => {
            setLoading(false);
            resetOverlayTimer();
          }}
          onError={(e) => {
            console.error('Video Playback Error:', e && typeof e === 'object' && 'error' in e ? (e as any).error.errorString || (e as any).error.message || 'Unknown video error' : 'Unknown video error');
            setError(true);
            setLoading(false);
          }}
          bufferConfig={{
            minBufferMs: 5000,
            maxBufferMs: 15000,
            bufferForPlaybackMs: 500,
            bufferForPlaybackAfterRebufferMs: 1000
          }}
          playInBackground={false}
          controls={isMobile}
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
          <TouchableOpacity
            style={[styles.backButton, isMobile && mStyles.errorBackButton]}
            onPress={() => navigation.goBack()}
            {...(isTV ? { hasTVPreferredFocus: true } : {})}
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
                  <Text style={[styles.channelStatus, isMobile && mStyles.channelStatus]}>LIVE</Text>
                )}
              </View>
            </View>
          </View>
        </Animated.View>
      )}
    </TouchableOpacity>
  );
};

// ── Base styles (TV) ──────────────────────────────────────────────
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
  channelStatus: {
    color: '#FF453A',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 5,
  }
});

// ── Mobile overrides ──────────────────────────────────────────────
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