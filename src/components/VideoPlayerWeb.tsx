/**
 * VideoPlayerWeb – HLS-capable <video> wrapper for web.
 *
 * Replaces react-native-video on the web because the built-in Video.web.tsx
 * only renders a plain <video> element without HLS.js support, so IPTV
 * streams (.ts, .m3u8) cannot play.
 *
 * This component provides the same callback interface that LivePlayerScreen
 * expects (onLoad, onError, onProgress, onBuffer, onLoadStart).
 *
 * NOTE: Uses `any` for DOM types to avoid adding "dom" to the tsconfig lib
 * (which would break native builds). This file only runs on web.
 */
import React, { useEffect, useRef, useImperativeHandle, forwardRef, useCallback, useState } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Hls from 'hls.js';

interface VideoSource {
  uri: string | null | undefined;
  type?: string;
}

interface VideoPlayerWebProps {
  source: VideoSource;
  style?: StyleProp<ViewStyle>;
  paused?: boolean;
  volume?: number;
  rate?: number;
  muted?: boolean;
  repeat?: boolean;
  controls?: boolean;
  resizeMode?: 'contain' | 'cover' | 'stretch' | 'none';
  onLoadStart?: () => void;
  onLoad?: (data: any) => void;
  onError?: (e: any) => void;
  onProgress?: (data: { currentTime: number; seekableDuration: number }) => void;
  onBuffer?: (data: { isBuffering: boolean }) => void;
  onEnd?: () => void;
  onBandwidthUpdate?: (data: { bitrate: number }) => void;
  progressUpdateInterval?: number;
  // Native-only props accepted but ignored on web
  bufferConfig?: any;
  maxBitRate?: number;
  viewType?: any;
  disableDisconnectError?: boolean;
  minLoadRetryCount?: number;
  hideShutterView?: boolean;
  shutterColor?: string;
  playInBackground?: boolean;
  reportBandwidth?: boolean;
  selectedAudioTrack?: any;
  selectedTextTrack?: any;
}

export interface VideoPlayerWebRef {
  seek: (time: number) => void;
  pause: () => void;
  resume: () => void;
}

/**
 * Extract the IPTV server origin from a proxied URL.
 * e.g. "/proxy/http://server:port/live/user/pass/123.ts"
 *   -> "http://server:port"
 */
function extractServerOrigin(proxyUrl: string): string | null {
  const prefix = '/proxy/';
  if (!proxyUrl.startsWith(prefix)) return null;
  const actualUrl = proxyUrl.slice(prefix.length);
  try {
    const parsed = new URL(actualUrl);
    return parsed.origin; // e.g. "http://server:port"
  } catch {
    return null;
  }
}

/**
 * Get the current browser origin for URL comparison.
 */
function getBrowserOrigin(): string {
  try {
    return (globalThis as any).location?.origin || '';
  } catch {
    return '';
  }
}

/**
 * Rewrite segment/playlist URLs that HLS.js resolves.
 *
 * CRITICAL: By the time xhrSetup fires, the browser has ALREADY resolved
 * relative/absolute paths against the current page origin. So a segment
 * URL "/live/segment/..." in the M3U8 manifest arrives as:
 *   "https://browser-host.com/live/segment/..."
 *
 * We need to detect URLs that were resolved against the browser origin
 * and re-route them through the proxy to the actual IPTV server.
 */
function rewriteUrl(url: string, serverOrigin: string | null, browserOrigin: string): string {
  if (!serverOrigin) return url;

  // Already going through our proxy — leave it alone
  if (url.includes('/proxy/')) return url;

  // URL was resolved against the browser origin by HLS.js
  // e.g. "https://00i7a.app.super.myninja.ai/live/segment/..."
  // Replace browser origin with IPTV server origin and proxy it
  if (browserOrigin && url.startsWith(browserOrigin)) {
    const path = url.slice(browserOrigin.length); // e.g. "/live/segment/..."
    return `/proxy/${serverOrigin}${path}`;
  }

  // Absolute URL pointing to the IPTV server — wrap in proxy
  if (url.startsWith(serverOrigin)) {
    return `/proxy/${url}`;
  }

  // Any other absolute URL — wrap in proxy
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return `/proxy/${url}`;
  }

  // Absolute path (e.g. /live/segment/...)
  if (url.startsWith('/')) {
    return `/proxy/${serverOrigin}${url}`;
  }

  // Relative path
  return `/proxy/${serverOrigin}/${url}`;
}

const VideoPlayerWeb = forwardRef<VideoPlayerWebRef, VideoPlayerWebProps>((props, ref) => {
  const {
    source,
    paused = false,
    volume = 1.0,
    rate = 1.0,
    muted = false,
    controls = false,
    resizeMode = 'contain',
    onLoadStart,
    onLoad,
    onError,
    onProgress,
    onBuffer,
    onEnd,
    onBandwidthUpdate,
    progressUpdateInterval = 1000,
    style,
  } = props;

  // Use `any` for the video ref to avoid DOM type issues in React Native tsconfig
  const videoRef = useRef<any>(null);
  const hlsRef = useRef<Hls | null>(null);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Expose imperative methods
  useImperativeHandle(ref, () => ({
    seek: (time: number) => {
      if (videoRef.current) {
        videoRef.current.currentTime = time;
      }
    },
    pause: () => {
      if (videoRef.current) {
        videoRef.current.pause();
      }
    },
    resume: () => {
      if (videoRef.current) {
        videoRef.current.play().catch(() => {});
      }
    },
  }), []);

  // Determine if URL needs HLS.js
  const needsHls = useCallback((url: string): boolean => {
    const lower = url.toLowerCase();
    if (lower.includes('.m3u8')) return true;
    if (/\/\d+\.(ts)(\?.*)?$/i.test(lower)) return true;
    if (lower.includes('/live/') || lower.includes('/movie/') || lower.includes('/series/')) return true;
    return false;
  }, []);

  // Cleanup HLS instance
  const cleanupHls = useCallback(() => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
  }, []);

  // Fire onLoad callback helper
  const fireOnLoad = useCallback((video: any) => {
    onLoad?.({
      duration: video.duration || 0,
      naturalSize: {
        width: video.videoWidth || 1920,
        height: video.videoHeight || 1080,
        orientation: 'landscape',
      },
      currentTime: 0,
      audioTracks: [],
      textTracks: [],
    });
  }, [onLoad]);

  // Setup video source
  useEffect(() => {
    const video = videoRef.current;
    const uri = source?.uri;
    if (!video || !uri) return;

    onLoadStart?.();
    cleanupHls();
    setIsReady(false);

    // Extract the IPTV server origin for URL rewriting
    const serverOrigin = extractServerOrigin(uri);
    const browserOrigin = getBrowserOrigin();

    if (needsHls(uri) && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        maxBufferHole: 0.5,
        liveSyncDuration: 3,
        liveMaxLatencyDuration: 10,
        manifestLoadingMaxRetry: 6,
        levelLoadingMaxRetry: 6,
        fragLoadingMaxRetry: 6,
        // Rewrite all URLs through our proxy so that segment/playlist
        // requests from the IPTV server don't hit the browser origin.
        // By the time xhrSetup fires, HLS.js has already resolved relative
        // URLs against the browser's location.origin, so we need to detect
        // and replace that with the actual IPTV server origin.
        xhrSetup: (xhr: any, urlToLoad: string) => {
          const rewritten = rewriteUrl(urlToLoad, serverOrigin, browserOrigin);
          if (rewritten !== urlToLoad) {
            xhr.open('GET', rewritten, true);
          }
        },
      });

      hls.loadSource(uri);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsReady(true);
        if (!paused) {
          video.play().catch(() => {});
        }
        fireOnLoad(video);
      });

      hls.on(Hls.Events.ERROR, (_event: any, data: any) => {
        console.warn('[HLS Error]', data.type, data.details, data.fatal);
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log('[HLS] Attempting network recovery...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log('[HLS] Attempting media recovery...');
              hls.recoverMediaError();
              break;
            default:
              onError?.({ error: { code: -1, domain: 'HLS', localizedDescription: data.details } });
              hls.destroy();
              break;
          }
        }
      });

      hls.on(Hls.Events.FRAG_BUFFERED, (_event: any, data: any) => {
        if (data.stats && onBandwidthUpdate) {
          const loadTime = data.stats.loading.end - data.stats.loading.start;
          if (loadTime > 0) {
            const bitrate = Math.round((data.stats.total * 8) / loadTime * 1000);
            if (!isNaN(bitrate) && isFinite(bitrate)) {
              onBandwidthUpdate({ bitrate });
            }
          }
        }
      });

      hlsRef.current = hls;
    } else if (videoRef.current?.canPlayType && videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari has native HLS support
      video.src = uri;
      const onMetadata = () => {
        setIsReady(true);
        if (!paused) {
          video.play().catch(() => {});
        }
        fireOnLoad(video);
      };
      video.addEventListener('loadedmetadata', onMetadata, { once: true });
    } else {
      // Direct playback for MP4/WebM
      video.src = uri;
      const onMetadata = () => {
        setIsReady(true);
        if (!paused) {
          video.play().catch(() => {});
        }
        fireOnLoad(video);
      };
      video.addEventListener('loadedmetadata', onMetadata, { once: true });
    }

    return () => {
      cleanupHls();
    };
  }, [source?.uri]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle play/pause
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isReady) return;

    if (paused) {
      video.pause();
    } else {
      video.play().catch(() => {});
    }
  }, [paused, isReady]);

  // Handle volume
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = Math.max(0, Math.min(1, volume));
    }
  }, [volume]);

  // Handle muted
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = muted;
    }
  }, [muted]);

  // Handle playback rate
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  }, [rate]);

  // Progress reporting
  useEffect(() => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
    }

    progressTimerRef.current = setInterval(() => {
      const video = videoRef.current;
      if (video && onProgress && !video.paused) {
        onProgress({
          currentTime: video.currentTime || 0,
          seekableDuration: video.duration || 0,
        });
      }
    }, progressUpdateInterval);

    return () => {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
      }
    };
  }, [onProgress, progressUpdateInterval]);

  // Buffer and error events
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleWaiting = () => onBuffer?.({ isBuffering: true });
    const handlePlaying = () => onBuffer?.({ isBuffering: false });
    const handleCanPlay = () => onBuffer?.({ isBuffering: false });
    const handleEnded = () => onEnd?.();
    const handleError = () => {
      const mediaError = video.error;
      onError?.({
        error: {
          code: mediaError?.code || -1,
          domain: 'HTMLMediaElement',
          localizedDescription: mediaError?.message || 'Failed to load video source.',
        },
      });
    };

    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('error', handleError);
    };
  }, [onBuffer, onEnd, onError]);

  // Map resizeMode to CSS object-fit
  const objectFit = resizeMode === 'contain' ? 'contain'
    : resizeMode === 'cover' ? 'cover'
    : resizeMode === 'stretch' ? 'fill'
    : 'contain';

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupHls();
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
      }
    };
  }, [cleanupHls]);

  return React.createElement('video', {
    ref: videoRef,
    controls: controls,
    playsInline: true,
    autoPlay: false,
    style: {
      width: '100%',
      height: '100%',
      backgroundColor: '#000',
      objectFit,
    },
  });
});

VideoPlayerWeb.displayName = 'VideoPlayerWeb';

export default VideoPlayerWeb;