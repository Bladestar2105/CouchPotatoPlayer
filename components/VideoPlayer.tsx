import React, { useMemo } from 'react';
import { View, StyleSheet, Platform, NativeSyntheticEvent } from 'react-native';
import { useIPTVPlayback } from '../context/IPTVContext';
import { useSettings } from '../context/SettingsContext';
import { KSPlayerView } from './KSPlayerView';
import { detectStreamKind, selectEffectivePlayer, type EffectivePlayer, type StreamKind } from './player/PlayerAdapter';
import {
  EMPTY_PLAYBACK_TRACKS,
  serializePlaybackTrackGroups,
  type PlaybackTrack,
  type PlaybackTrackGroups,
} from './player/PlaybackTracks';

// ---------------------------------------------------------------------------
// Platform-gated player imports
// ---------------------------------------------------------------------------

// expo-av (web only)
let WebVideoComponent: any;

// react-native-video (iOS phone/tablet & Android, NOT tvOS)
let NativeVideoComponent: any;

// react-native-vlc-media-player (Android, iOS phone/tablet, AND tvOS via TVVLCKit)
let VLCPlayerComponent: any;

if (Platform.OS === 'web') {
  WebVideoComponent = require('expo-av').Video;
} else {
  // VLC is available on ALL native platforms including tvOS (via TVVLCKit)
  try {
    VLCPlayerComponent = require('react-native-vlc-media-player').VLCPlayer;
  } catch (e) {
    console.warn('[VideoPlayer] react-native-vlc-media-player not available:', e);
  }

  // react-native-video is only available on non-TV platforms
  if (!Platform.isTV) {
    try {
      NativeVideoComponent = require('react-native-video').default;
    } catch (e) {
      console.warn('[VideoPlayer] react-native-video not available:', e);
    }
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface VideoMetadata {
  width?: number;
  height?: number;
  fps?: number;
  bitrate?: number;
}

export type { PlaybackTrack, PlaybackTrackGroups } from './player/PlaybackTracks';

interface VideoPlayerProps {
  paused?: boolean;
  seekPosition?: number;
  selectedAudioTrackId?: number | string | null;
  selectedTextTrackId?: number | string | null;
  onProgress?: (data: { currentTime: number; duration: number }) => void;
  onVideoLoad?: (metadata: VideoMetadata) => void;
  onPlaybackError?: (message?: string) => void;
  onTracksChange?: (tracks: PlaybackTrackGroups) => void;
}

import { SwiftTSPlayer, SwiftTSVideoLoadEvent, SwiftTSVideoErrorEvent } from './SwiftTSPlayer';

const toMilliseconds = (value?: number, reference?: number): number => {
  if (!Number.isFinite(value as number) || value === undefined) return 0;
  // Some players report seconds, others milliseconds.
  // If the reference clearly looks like milliseconds, keep value as-is.
  if (reference !== undefined && reference > 10000) return value;
  // Otherwise treat small values as seconds and normalize to ms.
  if (value >= 0 && value <= 10000) {
    return value * 1000;
  }
  return value;
};

type RawTrack = {
  id?: number | string;
  index?: number;
  name?: string;
  title?: string;
  language?: string;
  selected?: boolean;
};

const normalizeTrackGroups = ({
  audioTracks,
  textTracks,
}: {
  audioTracks?: RawTrack[];
  textTracks?: RawTrack[];
}): PlaybackTrackGroups => {
  const mapTracks = (
    tracks: RawTrack[] | undefined,
    kind: PlaybackTrack['kind'],
    fallbackPrefix: string,
  ): PlaybackTrack[] => (
    (tracks ?? []).map((track, index) => ({
      id: track.id ?? track.index ?? index,
      label: track.name ?? track.title ?? `${fallbackPrefix} ${index + 1}`,
      language: track.language,
      selected: Boolean(track.selected),
      kind,
    }))
  );

  return {
    audioTracks: mapTracks(audioTracks, 'audio', 'Audio'),
    textTracks: mapTracks(textTracks, 'text', 'Subtitle'),
  };
};

const cloneTrackGroups = (groups: PlaybackTrackGroups): PlaybackTrackGroups => ({
  audioTracks: [...groups.audioTracks],
  textTracks: [...groups.textTracks],
});

const toNumericTrackId = (value: number | string | null | undefined): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
};

// ---------------------------------------------------------------------------
// Apple AVPlayer component (HLS & MP4 ONLY)
// ---------------------------------------------------------------------------
const AppleAVPlayer = ({
  streamUrl,
  paused,
  seekPosition,
  selectedAudioTrackId,
  selectedTextTrackId,
  onProgress,
  onVideoLoad,
  onPlaybackError,
  onTracksChange,
}: {
  streamUrl: string;
  paused: boolean;
  seekPosition?: number;
  selectedAudioTrackId?: number | null;
  selectedTextTrackId?: number | null;
  onProgress?: VideoPlayerProps['onProgress'];
  onVideoLoad?: VideoPlayerProps['onVideoLoad'];
  onPlaybackError?: VideoPlayerProps['onPlaybackError'];
  onTracksChange?: VideoPlayerProps['onTracksChange'];
}) => {
  return (
    <SwiftTSPlayer
      streamUrl={streamUrl}
      paused={paused}
      seekPosition={seekPosition}
      selectedAudioTrackId={selectedAudioTrackId}
      selectedTextTrackId={selectedTextTrackId}
      style={styles.video}
      onVideoLoad={(event: NativeSyntheticEvent<SwiftTSVideoLoadEvent>) => {
        if (onVideoLoad && event.nativeEvent) {
          onVideoLoad({
            width: event.nativeEvent.width,
            height: event.nativeEvent.height,
          });
        }
      }}
      onProgress={(event) => {
        if (onProgress && event?.nativeEvent) {
          const durationRaw = event.nativeEvent.duration || 0;
          onProgress({
            currentTime: toMilliseconds(event.nativeEvent.currentTime, durationRaw),
            duration: toMilliseconds(durationRaw, durationRaw),
          });
        }
      }}
      onVideoError={(event: NativeSyntheticEvent<SwiftTSVideoErrorEvent>) => {
        const message = event.nativeEvent?.error;
        console.warn('[SwiftTSPlayerView] Playback error:', message);
        if (onPlaybackError) onPlaybackError(message);
      }}
      onTracksChanged={(event) => {
        if (onTracksChange && event?.nativeEvent) {
          onTracksChange({
            audioTracks: event.nativeEvent.audioTracks ?? [],
            textTracks: event.nativeEvent.textTracks ?? [],
          });
        }
      }}
    />
  );
};

// ---------------------------------------------------------------------------
// Main VideoPlayer component
// ---------------------------------------------------------------------------

const VideoPlayer = React.forwardRef(
  (
    {
      paused = false,
      seekPosition,
      selectedAudioTrackId,
      selectedTextTrackId,
      onProgress,
      onVideoLoad,
      onPlaybackError,
      onTracksChange,
    }: VideoPlayerProps,
    ref,
  ) => {
    const { currentStream } = useIPTVPlayback();
    const { bufferSize, playerType, vlcHardwareAcceleration, ksplayerHardwareDecode, ksplayerAsynchronousDecompression, ksplayerDisplayFrameRate } = useSettings();
    const lastTracksSignatureRef = React.useRef('');
    const lastTrackGroupsRef = React.useRef<PlaybackTrackGroups>(cloneTrackGroups(EMPTY_PLAYBACK_TRACKS));

    const emitTracksChange = React.useCallback((groups: PlaybackTrackGroups) => {
      const signature = serializePlaybackTrackGroups(groups);
      lastTrackGroupsRef.current = groups;
      if (signature === lastTracksSignatureRef.current) return;
      lastTracksSignatureRef.current = signature;
      onTracksChange?.(groups);
    }, [onTracksChange]);

    const mergeTrackGroups = React.useCallback((partial: Partial<PlaybackTrackGroups>) => {
      emitTracksChange({
        audioTracks: partial.audioTracks ?? lastTrackGroupsRef.current.audioTracks,
        textTracks: partial.textTracks ?? lastTrackGroupsRef.current.textTracks,
      });
    }, [emitTracksChange]);

    const streamUrl = useMemo(() => {
      if (!currentStream?.url) return null;
      if (Platform.OS === 'web') {
        return `/proxy/${currentStream.url}`;
      }
      return currentStream.url;
    }, [currentStream?.url]);

    // Detect stream kind
    const streamKind = useMemo((): StreamKind => {
      if (!streamUrl) return 'unknown';
      return detectStreamKind(streamUrl);
    }, [streamUrl]);

    // Determine the effective player to use (with smart fallback)
    const effectivePlayer = useMemo<EffectivePlayer>(() => {
      return selectEffectivePlayer({
        platformOS: Platform.OS,
        isTV: Platform.isTV,
        preferredPlayer: playerType,
        streamKind,
      });
    }, [playerType, streamKind]);

    React.useEffect(() => {
      lastTracksSignatureRef.current = '';
      lastTrackGroupsRef.current = cloneTrackGroups(EMPTY_PLAYBACK_TRACKS);
      if (onTracksChange) {
        onTracksChange(cloneTrackGroups(EMPTY_PLAYBACK_TRACKS));
      }
    }, [currentStream?.id, effectivePlayer, onTracksChange]);

    // Ref for imperative seek
    const videoRef = React.useRef<any>(null);

    React.useImperativeHandle(ref, () => ({
      seek: (position: number) => {
        if (videoRef.current?.seek) {
          videoRef.current.seek(position / 1000);
        }
      },
      // Picture-in-Picture is only available on the react-native-video backend
      // (iOS phone/tablet + Android non-TV). On other backends or platforms the
      // call is a graceful no-op so the UI button can still be wired up.
      enterPictureInPicture: () => {
        const native = videoRef.current;
        if (!native) return false;
        if (typeof native.enterPictureInPictureMode === 'function') {
          try {
            native.enterPictureInPictureMode();
            return true;
          } catch (e) {
            console.warn('[VideoPlayer] enterPictureInPicture failed', e);
          }
        }
        return false;
      },
      // Trigger the iOS native fullscreen player which exposes the system
      // AirPlay / route picker. Android's react-native-video doesn't have
      // a built-in route picker, so the call is a graceful no-op there.
      presentExternalPlaybackPicker: () => {
        const native = videoRef.current;
        if (!native) return false;
        if (typeof native.presentFullscreenPlayer === 'function') {
          try {
            native.presentFullscreenPlayer();
            return true;
          } catch (e) {
            console.warn('[VideoPlayer] presentFullscreenPlayer failed', e);
          }
        }
        return false;
      },
    }));

    React.useEffect(() => {
      if (seekPosition === undefined) return;
      if (videoRef.current?.seek) {
        videoRef.current.seek(seekPosition / 1000.0);
      }
    }, [seekPosition]);

    const safeVlcBufferSizeMs = useMemo(() => {
      return Math.max(
        bufferSize > 100 ? bufferSize : bufferSize * 100,
        1500,
      );
    }, [bufferSize]);

    const vlcInitOptions = useMemo(() => [
      `--network-caching=${safeVlcBufferSizeMs}`,
      `--live-caching=${safeVlcBufferSizeMs}`,
      `--file-caching=${safeVlcBufferSizeMs}`,
      vlcHardwareAcceleration ? '--avcodec-hw=any' : '--avcodec-hw=none',
    ], [safeVlcBufferSizeMs, vlcHardwareAcceleration]);

    // -----------------------------------------------------------------------
    // Render helpers
    // -----------------------------------------------------------------------

    const renderAVPlayer = () => {
      if (!streamUrl) return null;
      const selectedAudioTrack = toNumericTrackId(selectedAudioTrackId);
      const selectedTextTrack = selectedTextTrackId === null
        ? null
        : toNumericTrackId(selectedTextTrackId);
      return (
        <AppleAVPlayer
          streamUrl={streamUrl}
          paused={paused}
          seekPosition={seekPosition}
          selectedAudioTrackId={selectedAudioTrack}
          selectedTextTrackId={selectedTextTrack}
          onProgress={onProgress}
          onVideoLoad={onVideoLoad}
          onPlaybackError={onPlaybackError}
          onTracksChange={emitTracksChange}
        />
      );
    };

    const renderWebPlayer = () => (
      <WebVideoComponent
        ref={videoRef}
        key={currentStream?.id}
        onProgress={(event: { currentTime?: number; duration?: number }) => {
          if (!onProgress) return;
          const durationMs = toMilliseconds(event?.duration, event?.duration);
          const currentMs = toMilliseconds(event?.currentTime, event?.duration);
          onProgress({ currentTime: currentMs, duration: durationMs });
        }}
        source={{ uri: streamUrl! }}
        paused={paused}
        autoplay={!paused}
        shouldPlay={!paused}
        style={styles.video}
        resizeMode="contain"
        useNativeControls={true}
        onError={(event: any) => {
          const message = event?.error ?? event?.nativeEvent?.error ?? 'Web playback error';
          console.warn('[WebVideoComponent] Playback error:', message);
          if (onPlaybackError) onPlaybackError(String(message));
        }}
      />
    );

    const renderNativePlayer = () => {
      if (!NativeVideoComponent || !streamUrl) return null;
      const selectedAudioTrackIndex = toNumericTrackId(selectedAudioTrackId);
      const selectedTextTrackIndex = toNumericTrackId(selectedTextTrackId);

      let sourceType: string | undefined;
      const lowerUrl = streamUrl.toLowerCase();
      if (lowerUrl.includes('.m3u8')) sourceType = 'm3u8';
      else if (lowerUrl.includes('.ts')) sourceType = 'ts';
      else if (lowerUrl.includes('.mp4')) sourceType = 'mp4';

      return (
        <NativeVideoComponent
          ref={videoRef}
          key={currentStream?.id}
          source={{ uri: streamUrl, type: sourceType }}
          // Enable Picture-in-Picture: works on iOS (phone / tablet) and on
          // Android API 26+. The system PiP transition is a no-op on devices
          // that don't support it, so the prop is safe to leave on.
          pictureInPicture={true}
          // Allow iOS AirPlay receivers to play the stream via the OS-level
          // route picker (Control Center / fullscreen native chrome).
          allowsExternalPlayback={true}
          ignoreSilentSwitch="ignore"
          playInBackground={false}
          playWhenInactive={true}
          selectedAudioTrack={selectedAudioTrackIndex == null ? undefined : { type: 'index', value: selectedAudioTrackIndex }}
          selectedTextTrack={
            selectedTextTrackId === undefined
              ? undefined
              : selectedTextTrackId === null
                ? { type: 'disabled' }
                : selectedTextTrackIndex == null
                  ? { type: 'disabled' }
                  : { type: 'index', value: selectedTextTrackIndex }
          }
          paused={paused}
          style={styles.video}
          resizeMode="contain"
          onProgress={(event: { currentTime: number; playableDuration?: number; seekableDuration?: number }) => {
            if (!onProgress) return;
            const durationRaw = event?.seekableDuration ?? event?.playableDuration ?? 0;
            const durationMs = toMilliseconds(durationRaw, durationRaw);
            const currentMs = toMilliseconds(event?.currentTime, durationRaw);
            onProgress({ currentTime: currentMs, duration: durationMs });
          }}
          onError={(error: { error: { code: number; domain: string } }) => {
            console.warn('[NativeVideoComponent] Playback error:', error);
            if (onPlaybackError) {
              const message = error?.error?.domain
                ? `${error.error.domain}:${error.error.code}`
                : 'Native playback error';
              onPlaybackError(message);
            }
          }}
          onLoad={(payload: { naturalSize: { width: number; height: number }; videoTrack?: { frameRate: number; bitrate: number }; audioTracks?: RawTrack[]; textTracks?: RawTrack[] }) => {
            mergeTrackGroups(normalizeTrackGroups({
              audioTracks: payload?.audioTracks,
              textTracks: payload?.textTracks,
            }));
            if (onVideoLoad && payload?.naturalSize) {
              onVideoLoad({
                width: payload.naturalSize.width,
                height: payload.naturalSize.height,
                fps: payload.videoTrack?.frameRate,
                bitrate: payload.videoTrack?.bitrate,
              });
            }
          }}
          onAudioTracks={(event: { audioTracks?: RawTrack[] }) => {
            mergeTrackGroups({
              audioTracks: normalizeTrackGroups({
                audioTracks: event?.audioTracks,
              }).audioTracks,
            });
          }}
          onTextTracks={(event: { textTracks?: RawTrack[] }) => {
            mergeTrackGroups({
              textTracks: normalizeTrackGroups({
                textTracks: event?.textTracks,
              }).textTracks,
            });
          }}
          bufferConfig={{
            minBufferMs: Math.max(
              bufferSize > 100 ? bufferSize : bufferSize * 100,
              1500,
            ),
            maxBufferMs: Math.max(
              bufferSize > 100 ? bufferSize * 2 : bufferSize * 200,
              3000,
            ),
            bufferForPlaybackMs: 2500,
            bufferForPlaybackAfterRebufferMs: 5000,
          }}
        />
      );
    };

    const renderVLCPlayer = (url?: string) => {
      const effectiveUrl = url || streamUrl;
      if (!VLCPlayerComponent || !effectiveUrl) return null;

      return (
        <VLCPlayerComponent
          ref={videoRef}
          key={currentStream?.id}
          audioTrack={selectedAudioTrackId == null ? undefined : Number(selectedAudioTrackId)}
          textTrack={
            selectedTextTrackId === undefined
              ? undefined
              : selectedTextTrackId === null
                ? -1
                : Number(selectedTextTrackId)
          }
          onProgress={(event: { currentTime?: number; duration?: number }) => {
            if (!onProgress) return;
            const durationRaw = event?.duration ?? 0;
            const durationMs = toMilliseconds(durationRaw, durationRaw);
            const currentMs = toMilliseconds(event?.currentTime, durationRaw);
            onProgress({ currentTime: currentMs, duration: durationMs });
          }}
          source={{ uri: effectiveUrl, initOptions: vlcInitOptions }}
          paused={paused}
          autoplay={!paused}
          style={styles.video}
          resizeMode="contain"
          onError={(event: any) => {
            const message = event?.message ?? event?.error ?? 'VLC playback error';
            console.warn('[VLCPlayerComponent] Playback error:', event);
            if (onPlaybackError) onPlaybackError(String(message));
          }}
          onPlaying={(event: { videoWidth?: number; videoHeight?: number; target?: { videoWidth?: number; videoHeight?: number } }) => {
            if (onVideoLoad && event) {
              onVideoLoad({
                width: event.videoWidth || event.target?.videoWidth,
                height: event.videoHeight || event.target?.videoHeight,
              });
            }
          }}
          onLoad={(event: { audioTracks?: RawTrack[]; textTracks?: RawTrack[]; videoSize?: { width?: number; height?: number } }) => {
            mergeTrackGroups(normalizeTrackGroups({
              audioTracks: event?.audioTracks,
              textTracks: event?.textTracks,
            }));
            if (onVideoLoad && event?.videoSize) {
              onVideoLoad({
                width: event.videoSize.width,
                height: event.videoSize.height,
              });
            }
          }}
        />
      );
    };

    // KSPlayer — FFmpeg-based player via react-native-ksplayer native bridge.
    // Supports raw MPEG-TS, HLS, MP4 and all FFmpeg formats on iOS & tvOS 13+.
    const renderKSPlayer = () => {
      const effectiveUrl = streamUrl;
      if (!effectiveUrl) return null;
      const selectedAudioTrack = toNumericTrackId(selectedAudioTrackId);
      const selectedTextTrack = selectedTextTrackId === null
        ? null
        : toNumericTrackId(selectedTextTrackId);

      // KSPlayerView is only available on iOS/tvOS.
      if (Platform.OS !== 'ios') {
        console.warn('[VideoPlayer] KSPlayer is only available on iOS/tvOS');
        return null;
      }

      return (
        <KSPlayerView
          key={currentStream?.id}
          style={styles.video}
          streamUrl={effectiveUrl}
          paused={paused}
          hardwareDecode={ksplayerHardwareDecode}
          asynchronousDecompression={ksplayerAsynchronousDecompression}
          displayFrameRate={ksplayerDisplayFrameRate}
          seekPosition={seekPosition}
          selectedAudioTrackId={selectedAudioTrack}
          selectedTextTrackId={selectedTextTrack}
          onVideoLoad={(metadata) => {
            if (onVideoLoad) {
              onVideoLoad({
                width: metadata.width,
                height: metadata.height,
              });
            }
          }}
          onVideoError={(error) => {
            console.warn('[KSPlayerView] Playback error:', error);
            if (onPlaybackError) onPlaybackError(error);
          }}
          onProgress={(data) => {
            if (onProgress) {
              const durationRaw = data.duration ?? 0;
              onProgress({
                currentTime: toMilliseconds(data.currentTime, durationRaw),
                duration: toMilliseconds(durationRaw, durationRaw),
              });
            }
          }}
          onTracksChanged={emitTracksChange}
        />
      );
    };

    const renderPlayer = () => {
      if (!streamUrl) return null;

      switch (effectivePlayer) {
        case 'web':
          return renderWebPlayer();
        case 'avkit':
          return renderAVPlayer();
        case 'vlc':
          return renderVLCPlayer();
        case 'ksplayer':
          return renderKSPlayer();
        case 'native':
          return renderNativePlayer();
        default:
          return renderNativePlayer();
      }
    };

    return (
      <View style={styles.container}>
        {streamUrl ? (
          renderPlayer()
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
});

export default VideoPlayer;
