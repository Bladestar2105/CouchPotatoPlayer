import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, BackHandler, ActivityIndicator, TouchableOpacity, Animated, Platform } from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import Video from 'react-native-video';
import { RootStackParamList } from '../../App';
import { useAppStore } from '../store';
import { XtreamService } from '../services/xtream';
import { Tv } from 'lucide-react-native';
import { KSPlayerView } from '../components/KSPlayerView';

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
    const fetchUrl = async () => {
      if (config?.type === 'xtream' && channelId) {
        const xtream = new XtreamService(config);
        if (type === 'vod') {
          const url = xtream.getVodStreamUrl(channelId as number, extension);
          setStreamUrl(url);
        } else if (type === 'series') {
          try {
            const seriesInfo = await xtream.getSeriesInfo(channelId as number);
            // find the first available episode
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
    }, 5000);
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
          controls={false}
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
          <Text style={styles.errorText}>Unable to play stream</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            hasTVPreferredFocus
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      )}

      {showOverlay && !error && (
        <Animated.View style={[styles.infoOverlay, { opacity: fadeAnim }]}>
          <View style={styles.infoContainer}>
            <Tv color="#FFF" size={32} />
            <View style={styles.textContainer}>
              <Text style={styles.channelName}>{channelName}</Text>
              <Text style={styles.channelStatus}>LIVE</Text>
            </View>
          </View>
        </Animated.View>
      )}
    </TouchableOpacity>
  );
};

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
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
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
