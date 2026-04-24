import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Image, Platform, BackHandler, Animated, ScrollView } from 'react-native';
import TVFocusGuideView from '../components/TVFocusGuideView';
// @ts-ignore - TVEventControl is available in react-native-tvos but not in standard React Native types
import { TVEventControl, useTVEventHandler as _useTVEventHandler } from 'react-native';

const useTVEventHandler: (handler: (event: any) => void) => void =
  typeof _useTVEventHandler === 'function' ? _useTVEventHandler : () => {};

import VideoPlayer, { VideoMetadata, type PlaybackTrack, type PlaybackTrackGroups } from '../components/VideoPlayer';
import { useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import type * as ScreenOrientationModule from 'expo-screen-orientation';

let ScreenOrientation: typeof ScreenOrientationModule | undefined;
if (!Platform.isTV) {
  try {
    ScreenOrientation = require('expo-screen-orientation');
  } catch (e) {}
}
import { useIPTVCollections, useIPTVLibrary, useIPTVPlayback } from '../context/IPTVContext';
import { useSettings } from '../context/SettingsContext';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { Channel } from '../types';
import { findCurrentProgramIndex, findNextProgramIndex } from '../utils/epgUtils';
import { resolvePlayerRemoteAction } from '../utils/playerRemoteEvents';
import { EMPTY_PLAYBACK_TRACKS, serializePlaybackTrackGroups } from '../components/player/PlaybackTracks';
import { radii, spacing, typography } from '../theme/tokens';
import { useTVFocusGuideDestinations } from '../hooks/useTVFocusGuideDestinations';
import { useTVPreferredFocusKey } from '../hooks/useTVPreferredFocusKey';
// StreamHealthMonitor removed - info button was removed for cleaner UI

const defaultLogo = require('../assets/character_logo.png');

const timeFormatter = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' });
const RECONNECT_BACKOFF_MS = [1200, 2500, 4500] as const;
const MAX_RECONNECT_ATTEMPTS = RECONNECT_BACKOFF_MS.length;
const MAX_SEEKABLE_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
type PlaybackStatus = 'playing' | 'buffering' | 'reconnecting' | 'failed';
type TrackPanelMode = 'audio' | 'text' | null;
const areTrackIdsEqual = (left: number | string | null | undefined, right: number | string | null | undefined): boolean => {
  if (left == null || right == null) return left === right;
  return String(left) === String(right);
};

/**
 * PlayerScreen - TiviMate-style full-screen video player
 */
const PlayerScreen = () => {
  const { t } = useTranslation();
  const { colors } = useSettings();
  const { accent } = useTheme();
  const isFocused = useIsFocused();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { addRecentlyWatched } = useIPTVCollections();
  const { channels, epg } = useIPTVLibrary();
  const { currentStream, stopStream, playStream } = useIPTVPlayback();

  const returnGroupId = route.params?.returnGroupId;
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
  const [pendingSeekTime, setPendingSeekTime] = useState<number | undefined>(undefined);
  const [videoMetadata, setVideoMetadata] = useState<VideoMetadata | null>(null);
  const [playbackProgress, setPlaybackProgress] = useState<{ currentTime: number; duration: number }>({ currentTime: 0, duration: 0 });
  const [playbackStatus, setPlaybackStatus] = useState<PlaybackStatus>('buffering');
  const [reconnectNonce, setReconnectNonce] = useState(0);
  const [trackPanelMode, setTrackPanelMode] = useState<TrackPanelMode>(null);
  const [availableTracks, setAvailableTracks] = useState<PlaybackTrackGroups>(EMPTY_PLAYBACK_TRACKS);
  const [selectedAudioTrackId, setSelectedAudioTrackId] = useState<number | string | null | undefined>(undefined);
  const [selectedTextTrackId, setSelectedTextTrackId] = useState<number | string | null>(null);

  // Channel switch animation
  const channelSwitchOpacity = useRef(new Animated.Value(0)).current;

  const currentTimeRef = React.useRef(0);
  const lastProgressAtRef = useRef<number>(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptRef = useRef(0);
  const currentStreamRef = useRef<{ id: string; url: string } | null>(null);
  const currentChannelRef = useRef<Channel | null>(null);
  const isFocusedRef = useRef(false);
  const initializedStreamIdRef = useRef<string | null>(null);
  const playbackStatusRef = useRef<PlaybackStatus>('buffering');
  const addRecentlyWatchedRef = useRef(addRecentlyWatched);

  const lastLiveChannelIdRef = useRef<string | null>(null);
  const previousLiveChannelIdRef = useRef<string | null>(null);
  const playbackDurationRef = useRef(0);
  const seekBarWidthRef = useRef(0);
  const trackSelectionSignatureRef = useRef(serializePlaybackTrackGroups(EMPTY_PLAYBACK_TRACKS));
  const audioSelectionByStreamRef = useRef(new Map<string, number | string>());
  const textSelectionByStreamRef = useRef(new Map<string, number | string | null>());
  const lastBackHandledAtRef = useRef(0);

  const backButtonRef = React.useRef<any>(null);
  const audioButtonRef = React.useRef<any>(null);
  const subtitleButtonRef = React.useRef<any>(null);
  const overlayDestinationRefs = useMemo(() => [backButtonRef, audioButtonRef, subtitleButtonRef], []);
  const overlayFocusDestinations = useTVFocusGuideDestinations(overlayDestinationRefs, showOverlay);
  const preferredOverlayKey = useTVPreferredFocusKey(showOverlay ? 'overlay:back' : null);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const handleBack = useCallback(() => {
    if (trackPanelMode) {
      setTrackPanelMode(null);
      return true;
    }

    const now = Date.now();
    if (now - lastBackHandledAtRef.current < 350) {
      return true;
    }
    lastBackHandledAtRef.current = now;

    const fallbackChannelId =
      lastNavigationState.current.channelId ||
      currentStream?.id ||
      null;
    let fallbackGroupId: string | null = null;
    if (fallbackChannelId) {
      fallbackGroupId = channels.find((channel) => channel.id === fallbackChannelId)?.group || null;
    }

    stopStream();
    navigation.navigate('Home', {
      focusChannelId: lastNavigationState.current.channelId,
      returnGroupId: lastNavigationState.current.groupId || fallbackGroupId,
      returnTab,
    });

    return true;
  }, [navigation, stopStream, returnTab, trackPanelMode, currentStream?.id, channels]);

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

    const hasReliableDuration =
      Number.isFinite(playbackProgress.duration) &&
      playbackProgress.duration > 0 &&
      playbackProgress.duration < MAX_SEEKABLE_DURATION_MS;

    const stream = currentStream as any;
    const explicitType = typeof stream?.type === 'string' ? stream.type.toLowerCase() : '';
    const tab = route.params?.returnTab;
    const streamUrl = typeof stream?.url === 'string' ? stream.url.toLowerCase() : '';
    const isLikelyVod =
      explicitType === 'vod' ||
      explicitType === 'movie' ||
      explicitType === 'series' ||
      tab === 'movies' ||
      tab === 'series' ||
      streamUrl.includes('/movie/') ||
      streamUrl.includes('/series/') ||
      streamUrl.endsWith('.mp4') ||
      streamUrl.endsWith('.mkv') ||
      streamUrl.endsWith('.avi');

    if (isLikelyVod) return true;
    if (
      streamUrl.includes('/movie/') ||
      streamUrl.includes('/series/') ||
      streamUrl.endsWith('.mp4') ||
      streamUrl.endsWith('.mkv') ||
      streamUrl.endsWith('.avi')
    ) {
      return true;
    }

    const isLiveChannel = channelIndexMap.has(currentStream.id);
    if (isLiveChannel) return false;
    return hasReliableDuration;
  }, [currentStream, route.params?.returnTab, channelIndexMap, playbackProgress.duration]);

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
    const activeTime = pendingSeekTime ?? playbackProgress.currentTime;
    if (!playbackProgress.duration || playbackProgress.duration <= 0) return 0;
    return Math.min(100, Math.max(0, (activeTime / playbackProgress.duration) * 100));
  }, [playbackProgress, pendingSeekTime]);

  useEffect(() => {
    playbackDurationRef.current = playbackProgress.duration;
  }, [playbackProgress.duration]);

  const metadataItems = useMemo(() => {
    const items: string[] = [];
    if (videoMetadata?.width && videoMetadata?.height) items.push(`${videoMetadata.width}x${videoMetadata.height}`);
    if (videoMetadata?.fps) items.push(`${Math.round(videoMetadata.fps)} FPS`);
    if (videoMetadata?.bitrate) items.push(`${Math.round(videoMetadata.bitrate / 1000)} kbps`);
    items.push(canSeek ? t('vod') : t('live'));
    return items;
  }, [videoMetadata, canSeek, t]);

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

     const nowMs = Date.now();
     const currentIdx = findCurrentProgramIndex(channelEpg, nowMs);

     const nextIdx = currentIdx >= 0
       ? (currentIdx + 1 < channelEpg.length ? currentIdx + 1 : -1)
       : findNextProgramIndex(channelEpg, nowMs);

     if (currentIdx === -1) {
       return {
         currentProgram: null,
         nextProgram: nextIdx >= 0 ? channelEpg[nextIdx] : null,
         progressPercent: 0
       };
     }

     const currentProgram = channelEpg[currentIdx];
     const nextProgram = nextIdx >= 0 ? channelEpg[nextIdx] : null;

     const totalDuration = currentProgram.end - currentProgram.start;
     const elapsed = nowMs - currentProgram.start;
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

  const hasAudioTrackOptions = availableTracks.audioTracks.length > 1;
  const hasTextTrackOptions = availableTracks.textTracks.length > 0;

  const selectedAudioTrack = useMemo(() => {
    // Bolt: Use a single pass to resolve user selection and native fallback
    let matchedIdTrack = null;
    let selectedTrack = null;
    for (const track of availableTracks.audioTracks) {
      if (areTrackIdsEqual(track.id, selectedAudioTrackId)) {
        matchedIdTrack = track;
        break; // Highest priority found
      }
      if (track.selected && !selectedTrack) {
        selectedTrack = track;
      }
    }
    return matchedIdTrack ?? selectedTrack ?? null;
  }, [availableTracks.audioTracks, selectedAudioTrackId]);

  const selectedTextTrack = useMemo(() => {
    if (selectedTextTrackId === null) return null;
    // Bolt: Use a single pass to resolve user selection and native fallback
    let matchedIdTrack = null;
    let selectedTrack = null;
    for (const track of availableTracks.textTracks) {
      if (areTrackIdsEqual(track.id, selectedTextTrackId)) {
        matchedIdTrack = track;
        break; // Highest priority found
      }
      if (track.selected && !selectedTrack) {
        selectedTrack = track;
      }
    }
    return matchedIdTrack ?? selectedTrack ?? null;
  }, [availableTracks.textTracks, selectedTextTrackId]);

  const audioQuickLabel = selectedAudioTrack?.label ?? t('playerAudio');
  const subtitleQuickLabel = selectedTextTrack?.label ?? t('playerSubtitlesOff');

  const trackPanelOptions = useMemo(() => {
    if (trackPanelMode === 'audio') {
      return availableTracks.audioTracks.map((track) => ({
        id: track.id,
        label: track.label,
        secondaryLabel: track.language,
        selected: areTrackIdsEqual(track.id, selectedAudioTrack?.id),
      }));
    }

    if (trackPanelMode === 'text') {
      return [
        {
          id: null,
          label: t('playerSubtitlesOff'),
          secondaryLabel: undefined,
          selected: selectedTextTrack == null,
        },
        ...availableTracks.textTracks.map((track) => ({
          id: track.id,
          label: track.label,
          secondaryLabel: track.language,
          selected: areTrackIdsEqual(track.id, selectedTextTrack?.id),
        })),
      ];
    }

    return [];
  }, [availableTracks.audioTracks, availableTracks.textTracks, selectedAudioTrack?.id, selectedTextTrack, t, trackPanelMode]);

  const trackPanelTitle = trackPanelMode === 'audio'
    ? t('playerAudioTracks')
    : trackPanelMode === 'text'
      ? t('playerSubtitleTracks')
      : '';

  useEffect(() => {
    if (trackPanelMode === 'audio' && !hasAudioTrackOptions) {
      setTrackPanelMode(null);
    }
    if (trackPanelMode === 'text' && !hasTextTrackOptions) {
      setTrackPanelMode(null);
    }
  }, [hasAudioTrackOptions, hasTextTrackOptions, trackPanelMode]);

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
    if (showOverlay && !isPaused && !trackPanelMode && pendingSeekTime === undefined) {
        timer = setTimeout(() => {
            setShowOverlay(false);
        }, 6000);
    }
    return () => {
        if (timer) clearTimeout(timer);
    };
  }, [showOverlay, isPaused, trackPanelMode, pendingSeekTime]);

  useEffect(() => {
    if (seekTime === undefined) return;
    const timer = setTimeout(() => setSeekTime(undefined), 500);
    return () => clearTimeout(timer);
  }, [seekTime]);

  useEffect(() => {
    return () => {
      clearReconnectTimer();
    };
  }, [clearReconnectTimer]);

  useEffect(() => {
    if (!currentStream?.id || !currentStream.url) {
      currentStreamRef.current = null;
      return;
    }
    currentStreamRef.current = { id: currentStream.id, url: currentStream.url };
  }, [currentStream?.id, currentStream?.url]);

  useEffect(() => {
    const streamId = currentStream?.id;
    setTrackPanelMode(null);
    setAvailableTracks(EMPTY_PLAYBACK_TRACKS);
    setPendingSeekTime(undefined);
    trackSelectionSignatureRef.current = serializePlaybackTrackGroups(EMPTY_PLAYBACK_TRACKS);

    if (!streamId) {
      setSelectedAudioTrackId(undefined);
      setSelectedTextTrackId(null);
      return;
    }

    setSelectedAudioTrackId(audioSelectionByStreamRef.current.get(streamId));
    const persistedTextTrack = textSelectionByStreamRef.current.has(streamId)
      ? textSelectionByStreamRef.current.get(streamId) ?? null
      : null;
    if (!textSelectionByStreamRef.current.has(streamId)) {
      textSelectionByStreamRef.current.set(streamId, null);
    }
    setSelectedTextTrackId(persistedTextTrack);
  }, [currentStream?.id]);

  useEffect(() => {
    isFocusedRef.current = isFocused;
  }, [isFocused]);

  useEffect(() => {
    playbackStatusRef.current = playbackStatus;
  }, [playbackStatus]);

  useEffect(() => {
    addRecentlyWatchedRef.current = addRecentlyWatched;
  }, [addRecentlyWatched]);

  useEffect(() => {
    currentChannelRef.current = currentChannel;
  }, [currentChannel]);

  const scheduleReconnect = useCallback((reason?: string) => {
    const streamSnapshot = currentStreamRef.current;
    if (!isFocusedRef.current || !streamSnapshot) return;

    const normalizedReason = (reason || '').toLowerCase();
    const isAuthError =
      normalizedReason.includes('unauthorized') ||
      normalizedReason.includes('forbidden') ||
      normalizedReason.includes('nicht berechtigt') ||
      normalizedReason.includes('not authorized') ||
      normalizedReason.includes('401') ||
      normalizedReason.includes('403');
    if (isAuthError) {
      clearReconnectTimer();
      setPlaybackStatus('failed');
      console.warn('[PlayerScreen] Playback aborted due to authorization error', reason);
      return;
    }

    clearReconnectTimer();
    const nextAttempt = reconnectAttemptRef.current + 1;
    reconnectAttemptRef.current = nextAttempt;

    if (nextAttempt > MAX_RECONNECT_ATTEMPTS) {
      setPlaybackStatus('failed');
      return;
    }

    const backoffMs = RECONNECT_BACKOFF_MS[Math.min(nextAttempt - 1, RECONNECT_BACKOFF_MS.length - 1)];
    setPlaybackStatus('reconnecting');

    reconnectTimerRef.current = setTimeout(() => {
      reconnectTimerRef.current = null;
      if (!isFocusedRef.current) return;
      const latestStream = currentStreamRef.current;
      if (!latestStream) return;
      if (latestStream.id !== streamSnapshot.id || latestStream.url !== streamSnapshot.url) return;

      setReconnectNonce((prev) => prev + 1);
      setPlaybackStatus('buffering');
    }, backoffMs);

    if (reason) {
      console.warn(`[PlayerScreen] Reconnect scheduled (attempt ${nextAttempt}/${MAX_RECONNECT_ATTEMPTS})`, reason);
    }
  }, [clearReconnectTimer]);

  useEffect(() => {
    if (!isFocused || !currentStream?.id) {
      initializedStreamIdRef.current = null;
      return;
    }
    if (initializedStreamIdRef.current === currentStream.id) return;
    initializedStreamIdRef.current = currentStream.id;

    const channelSnapshot = currentChannelRef.current;
    clearReconnectTimer();
    reconnectAttemptRef.current = 0;
    setReconnectNonce((prev) => (prev === 0 ? prev : 0));

    const stream = currentStream as any;
    const explicitType = typeof stream?.type === 'string' ? stream.type.toLowerCase() : '';
    const inferredType: 'live' | 'vod' | 'series' =
      explicitType === 'series'
        ? 'series'
        : explicitType === 'vod' || explicitType === 'movie'
          ? 'vod'
          : channelSnapshot
            ? 'live'
            : route.params?.returnTab === 'series'
              ? 'series'
              : route.params?.returnTab === 'movies'
                ? 'vod'
                : 'live';

    const streamName = typeof stream?.name === 'string' && stream.name.trim().length > 0
      ? stream.name
      : route.params?.title || channelSnapshot?.name || currentStream.id;
    const directSource = typeof stream?.directSource === 'string' && stream.directSource.length > 0
      ? stream.directSource
      : typeof stream?.direct_source === 'string' && stream.direct_source.length > 0
        ? stream.direct_source
        : currentStream.url;

    addRecentlyWatchedRef.current({
      id: currentStream.id,
      type: inferredType,
      name: streamName,
      icon: channelSnapshot?.logo,
      extension: typeof stream?.extension === 'string' ? stream.extension : undefined,
      directSource,
      lastWatchedAt: Date.now(),
    });
    setShowOverlay(true);
    setVideoMetadata(null);
    setSeekTime(undefined);
    setPendingSeekTime(undefined);
    currentTimeRef.current = 0;
    lastProgressAtRef.current = Date.now();
    setPlaybackStatus('buffering');
    setPlaybackProgress((prev) => {
      if (prev.currentTime === 0 && prev.duration === 0) return prev;
      return { currentTime: 0, duration: 0 };
    });
  }, [isFocused, currentStream?.id, currentStream?.url, clearReconnectTimer, route.params?.returnTab, route.params?.title]);

  useEffect(() => {
    if (!isFocused || !currentStream?.id || isPaused) {
      setPlaybackStatus((prev) => (prev === 'failed' || prev === 'reconnecting' ? prev : 'playing'));
      return;
    }

    const interval = setInterval(() => {
      const staleMs = Date.now() - lastProgressAtRef.current;
      const nextStatus = staleMs > 3500 ? 'buffering' : 'playing';
      setPlaybackStatus((prev) => {
        if (prev === 'failed' || prev === 'reconnecting') return prev;
        return prev === nextStatus ? prev : nextStatus;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isFocused, currentStream?.id, isPaused]);

  const commitPendingSeek = useCallback(() => {
    if (pendingSeekTime === undefined) return false;
    currentTimeRef.current = pendingSeekTime;
    setSeekTime(pendingSeekTime);
    setPendingSeekTime(undefined);
    return true;
  }, [pendingSeekTime]);

  const queueSeekDelta = useCallback((deltaMs: number) => {
    if (!canSeek) return;
    const baseTime = pendingSeekTime ?? currentTimeRef.current;
    const duration = playbackDurationRef.current;
    const maxTime = Number.isFinite(duration) && duration > 0 ? duration : Number.POSITIVE_INFINITY;
    const nextSeekTime = Math.min(maxTime, Math.max(0, baseTime + deltaMs));
    setPendingSeekTime(nextSeekTime);
    setPlaybackProgress((prev) => ({ ...prev, currentTime: nextSeekTime }));
    setShowOverlay(true);
  }, [canSeek, pendingSeekTime]);

  const applySeekDelta = useCallback((deltaMs: number) => {
    if (!canSeek) return;
    const baseTime = pendingSeekTime ?? currentTimeRef.current;
    const duration = playbackDurationRef.current;
    const maxTime = Number.isFinite(duration) && duration > 0 ? duration : Number.POSITIVE_INFINITY;
    const nextSeekTime = Math.min(maxTime, Math.max(0, baseTime + deltaMs));
    currentTimeRef.current = nextSeekTime;
    setSeekTime(nextSeekTime);
    setPendingSeekTime(undefined);
    setPlaybackProgress((prev) => ({ ...prev, currentTime: nextSeekTime }));
    setShowOverlay(true);
  }, [canSeek, pendingSeekTime]);

  const seekToProgressRatio = useCallback((ratio: number, commit: boolean) => {
    if (!canSeek) return;
    const duration = playbackDurationRef.current;
    if (!Number.isFinite(duration) || duration <= 0) return;

    const clampedRatio = Math.min(1, Math.max(0, ratio));
    const nextSeekTime = duration * clampedRatio;
    setPlaybackProgress((prev) => ({ ...prev, currentTime: nextSeekTime }));

    if (commit) {
      currentTimeRef.current = nextSeekTime;
      setSeekTime(nextSeekTime);
      setPendingSeekTime(undefined);
    } else {
      setPendingSeekTime(nextSeekTime);
    }
    setShowOverlay(true);
  }, [canSeek]);

  const handleSeekBarTouch = useCallback((locationX: number, commit: boolean) => {
    const width = seekBarWidthRef.current;
    if (!width || width <= 0) return;
    seekToProgressRatio(locationX / width, commit);
  }, [seekToProgressRatio]);

  useEffect(() => {
    if (pendingSeekTime === undefined) return;
    // tvOS Simulator can miss center-click/select events.
    // Auto-commit seek after short inactivity as fallback.
    const timer = setTimeout(() => {
      commitPendingSeek();
      setShowOverlay(true);
    }, 1400);
    return () => clearTimeout(timer);
  }, [pendingSeekTime, commitPendingSeek]);

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
    if (commitPendingSeek()) {
      setShowOverlay(true);
      return;
    }
    setShowOverlay((prev) => {
      const next = !prev;
      if (!next) setTrackPanelMode(null);
      return next;
    });
  };

  const toggleTrackPanel = useCallback((mode: Exclude<TrackPanelMode, null>) => {
    setShowOverlay(true);
    setTrackPanelMode((prev) => (prev === mode ? null : mode));
  }, []);

  const handleTracksChange = useCallback((tracks: PlaybackTrackGroups) => {
    const signature = serializePlaybackTrackGroups(tracks);
    if (signature !== trackSelectionSignatureRef.current) {
      trackSelectionSignatureRef.current = signature;
      setAvailableTracks(tracks);
    }

    const streamId = currentStream?.id;
    if (!streamId) return;

    const persistedAudio = audioSelectionByStreamRef.current.get(streamId);
    let matchedPersistedAudio = false;
    let nativeSelectedAudio: string | number | undefined;

    // Bolt: Use a single pass to resolve both persisted preference and native selection
    for (const track of tracks.audioTracks) {
      if (areTrackIdsEqual(track.id, persistedAudio)) matchedPersistedAudio = true;
      if (track.selected) nativeSelectedAudio = track.id;
      if (matchedPersistedAudio && nativeSelectedAudio !== undefined) break;
    }

    if (matchedPersistedAudio) {
      setSelectedAudioTrackId((prev) => (prev === persistedAudio ? prev : (persistedAudio as string | number)));
    } else {
      if (persistedAudio !== undefined) audioSelectionByStreamRef.current.delete(streamId);
      setSelectedAudioTrackId(nativeSelectedAudio);
      if (nativeSelectedAudio !== undefined) {
        audioSelectionByStreamRef.current.set(streamId, nativeSelectedAudio);
      }
    }

    const hasPersistedTextSelection = textSelectionByStreamRef.current.has(streamId);
    if (!hasPersistedTextSelection) {
      textSelectionByStreamRef.current.set(streamId, null);
      setSelectedTextTrackId(null);
      return;
    }

    const persistedText = textSelectionByStreamRef.current.get(streamId) ?? null;
    if (persistedText === null) {
      setSelectedTextTrackId(null);
      return;
    }

    let matchedPersistedText = false;
    for (const track of tracks.textTracks) {
      if (areTrackIdsEqual(track.id, persistedText)) {
        matchedPersistedText = true;
        break;
      }
    }

    if (matchedPersistedText) {
      setSelectedTextTrackId((prev) => (prev === persistedText ? prev : (persistedText as string | number)));
    } else {
      textSelectionByStreamRef.current.set(streamId, null);
      setSelectedTextTrackId(null);
    }
  }, [currentStream?.id]);

  const handleTrackSelection = useCallback((track: PlaybackTrack | null, mode: Exclude<TrackPanelMode, null>) => {
    const streamId = currentStream?.id;
    if (mode === 'audio') {
      if (!track) return;
      setSelectedAudioTrackId(track.id);
      if (streamId) {
        audioSelectionByStreamRef.current.set(streamId, track.id);
      }
    } else {
      const nextValue = track?.id ?? null;
      setSelectedTextTrackId(nextValue);
      if (streamId) {
        textSelectionByStreamRef.current.set(streamId, nextValue);
      }
    }
    setTrackPanelMode(null);
    setShowOverlay(true);
  }, [currentStream?.id]);

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

  const switchToPreviousChannel = useCallback(() => {
    if (!currentStream) return;
    const previousChannelId = previousLiveChannelIdRef.current;
    if (!previousChannelId || previousChannelId === currentStream.id) return;
    const previousChannelIndex = channelIndexMap.get(previousChannelId);
    if (previousChannelIndex === undefined) return;
    const previousChannel = channels[previousChannelIndex];
    playStream({ url: previousChannel.url, id: previousChannel.id });
    showChannelSwitchBriefly();
  }, [channels, currentStream, channelIndexMap, playStream, showChannelSwitchBriefly]);

  useEffect(() => {
    if (!currentStream?.id) return;
    if (!channelIndexMap.has(currentStream.id)) return;

    if (lastLiveChannelIdRef.current && lastLiveChannelIdRef.current !== currentStream.id) {
      previousLiveChannelIdRef.current = lastLiveChannelIdRef.current;
    }
    lastLiveChannelIdRef.current = currentStream.id;
  }, [currentStream?.id, channelIndexMap]);

  const handleTVRemoteEvent = useCallback((evt: any) => {
    const action = resolvePlayerRemoteAction({
      isFocused,
      eventType: evt?.eventType,
      showOverlay,
      canSeek,
      hasPendingSeek: pendingSeekTime !== undefined,
    });

    if (action === 'commitPendingSeek') {
      commitPendingSeek();
      setShowOverlay(true);
      return;
    }

    if (action === 'menuBack') {
      handleBack();
    } else if (action === 'togglePause') {
      setIsPaused(prev => !prev);
      setShowOverlay(true);
    } else if (action === 'seekLeft') {
      queueSeekDelta(-10000);
    } else if (action === 'seekRight') {
      queueSeekDelta(10000);
    } else if (action === 'switchChannelUp') {
      switchChannel('up');
    } else if (action === 'switchChannelDown') {
      switchChannel('down');
    } else if (action === 'showOverlay') {
      setShowOverlay(true);
    } else if (action === 'switchToPreviousChannel') {
      switchToPreviousChannel();
    }
  }, [isFocused, handleBack, showOverlay, switchChannel, switchToPreviousChannel, commitPendingSeek, queueSeekDelta]);

  const handlePlayerProgress = useCallback((data: { currentTime: number; duration: number }) => {
    if (pendingSeekTime === undefined) {
      currentTimeRef.current = data.currentTime;
    }
    lastProgressAtRef.current = Date.now();
    reconnectAttemptRef.current = 0;
    clearReconnectTimer();
    if (playbackStatusRef.current !== 'playing') {
      setPlaybackStatus('playing');
    }
    setPlaybackProgress((prev) => {
      if (pendingSeekTime !== undefined) {
        if (prev.duration === data.duration) {
          return prev;
        }
        return { ...prev, duration: data.duration };
      }
      if (prev.currentTime === data.currentTime && prev.duration === data.duration) {
        return prev;
      }
      return { currentTime: data.currentTime, duration: data.duration };
    });
  }, [clearReconnectTimer, pendingSeekTime]);

  const handleVideoLoad = useCallback((metadata: VideoMetadata) => {
    setVideoMetadata((prev) => {
      if (
        prev?.width === metadata.width &&
        prev?.height === metadata.height &&
        prev?.fps === metadata.fps &&
        prev?.bitrate === metadata.bitrate
      ) {
        return prev;
      }
      return metadata;
    });
  }, []);

  const handlePlaybackError = useCallback((message?: string) => {
    scheduleReconnect(message || 'Playback error');
  }, [scheduleReconnect]);

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

  return (
    <View style={pStyles.container}>
      {/* TiviMate-style channel switch mini-overlay (top-right) */}
      {showChannelSwitch && currentChannel && (
        <Animated.View style={[pStyles.channelSwitchOverlay, { opacity: channelSwitchOpacity }]}>
          <View style={[pStyles.channelSwitchCard, { backgroundColor: 'rgba(30,30,46,0.92)', borderColor: accent }]}>
            <View style={[pStyles.channelNumberBadge, { backgroundColor: accent }]}>
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
          key={`${currentStream?.id ?? 'none'}:${reconnectNonce}`}
          paused={isPaused}
          seekPosition={seekTime}
          selectedAudioTrackId={selectedAudioTrackId}
          selectedTextTrackId={selectedTextTrackId}
          onProgress={handlePlayerProgress}
          onVideoLoad={handleVideoLoad}
          onPlaybackError={handlePlaybackError}
          onTracksChange={handleTracksChange}
        />
      </TouchableOpacity>

      {showOverlay && (
        <TVFocusGuideView style={pStyles.overlay} destinations={overlayFocusDestinations} pointerEvents="box-none">
          {/* Top Bar - Back + Channel Number Badge */}
          <View style={pStyles.topBar}>
            <TouchableOpacity
              ref={backButtonRef}
              style={[pStyles.iconBtn, { backgroundColor: 'rgba(30,30,46,0.75)' }]}
              onPress={handleBack}
              accessibilityRole="button"
              accessibilityLabel={t('back')}
              isTVSelectable={true}
              hasTVPreferredFocus={preferredOverlayKey === 'overlay:back'}
              tvParallaxProperties={{ enabled: false }}
            >
              <Icon name="arrow-back" size={24} color="#FFF" />
            </TouchableOpacity>
            {previousLiveChannelIdRef.current && (
              <TouchableOpacity
                style={[pStyles.iconBtn, { backgroundColor: 'rgba(30,30,46,0.75)', marginLeft: 10 }]}
                onPress={switchToPreviousChannel}
                accessibilityRole="button"
                accessibilityLabel={t('lastChannel')}
                isTVSelectable={true}
                tvParallaxProperties={{ enabled: false }}
              >
                <Icon name="history" size={22} color="#FFF" />
              </TouchableOpacity>
            )}
            <View
              style={[
                pStyles.statusBadge,
                playbackStatus === 'failed'
                  ? pStyles.statusBadgeDanger
                  : playbackStatus === 'reconnecting' || playbackStatus === 'buffering'
                    ? pStyles.statusBadgeWarning
                    : pStyles.statusBadgeLive,
              ]}
            >
              <Text style={pStyles.statusBadgeText}>
                {playbackStatus === 'failed'
                  ? t('playbackFailed')
                  : playbackStatus === 'reconnecting'
                    ? t('playbackReconnecting')
                    : playbackStatus === 'buffering'
                      ? t('playbackBuffering')
                      : t('live')}
              </Text>
            </View>
            <View style={pStyles.topBarSpacer} />
            {canSeek && (
              <>
                <TouchableOpacity
                  style={pStyles.seekActionBtn}
                  onPress={() => applySeekDelta(-10000)}
                  accessibilityRole="button"
                  accessibilityLabel={t('playerSeekBackward10')}
                  isTVSelectable={true}
                  tvParallaxProperties={{ enabled: false }}
                >
                  <Icon name="replay-10" size={20} color="#FFF" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={pStyles.seekActionBtn}
                  onPress={() => applySeekDelta(10000)}
                  accessibilityRole="button"
                  accessibilityLabel={t('playerSeekForward10')}
                  isTVSelectable={true}
                  tvParallaxProperties={{ enabled: false }}
                >
                  <Icon name="forward-10" size={20} color="#FFF" />
                </TouchableOpacity>
              </>
            )}
            {hasAudioTrackOptions && (
              <TouchableOpacity
                ref={audioButtonRef}
                style={[
                  pStyles.quickActionBtn,
                  trackPanelMode === 'audio' && [pStyles.quickActionBtnActive, { borderColor: accent }],
                ]}
                onPress={() => toggleTrackPanel('audio')}
                accessibilityRole="button"
                accessibilityLabel={t('playerAudioTracks')}
                isTVSelectable={true}
                tvParallaxProperties={{ enabled: false }}
              >
                <Icon name="audiotrack" size={18} color="#FFF" />
                <Text style={pStyles.quickActionLabel} numberOfLines={1}>{audioQuickLabel}</Text>
              </TouchableOpacity>
            )}
            {hasTextTrackOptions && (
              <TouchableOpacity
                ref={subtitleButtonRef}
                style={[
                  pStyles.quickActionBtn,
                  trackPanelMode === 'text' && [pStyles.quickActionBtnActive, { borderColor: accent }],
                ]}
                onPress={() => toggleTrackPanel('text')}
                accessibilityRole="button"
                accessibilityLabel={t('playerSubtitleTracks')}
                isTVSelectable={true}
                tvParallaxProperties={{ enabled: false }}
              >
                <Icon name="subtitles" size={18} color="#FFF" />
                <Text style={pStyles.quickActionLabel} numberOfLines={1}>{subtitleQuickLabel}</Text>
              </TouchableOpacity>
            )}

          </View>

          {trackPanelMode && (
            <View style={pStyles.trackPanelShell} pointerEvents="box-none">
              <View style={[pStyles.trackPanel, { borderColor: accent }]}>
                <View style={pStyles.trackPanelHeader}>
                  <Text style={pStyles.trackPanelTitle}>{trackPanelTitle}</Text>
                  <TouchableOpacity
                    style={pStyles.trackPanelCloseBtn}
                    onPress={() => setTrackPanelMode(null)}
                    accessibilityRole="button"
                    accessibilityLabel={t('close')}
                    isTVSelectable={true}
                    tvParallaxProperties={{ enabled: false }}
                  >
                    <Icon name="close" size={18} color="#FFF" />
                  </TouchableOpacity>
                </View>
                <ScrollView style={pStyles.trackOptionList} contentContainerStyle={pStyles.trackOptionListContent}>
                  {trackPanelOptions.map((option) => (
                    <TouchableOpacity
                      key={`${trackPanelMode}:${String(option.id ?? 'off')}`}
                      style={[
                        pStyles.trackOptionBtn,
                        option.selected && [pStyles.trackOptionBtnSelected, { borderColor: accent, backgroundColor: 'rgba(255,255,255,0.14)' }],
                      ]}
                      onPress={() => handleTrackSelection(
                        option.id == null
                          ? null
                          : ({ id: option.id, label: option.label, language: option.secondaryLabel, kind: trackPanelMode } as PlaybackTrack),
                        trackPanelMode,
                      )}
                      accessibilityRole="button"
                      accessibilityLabel={option.label}
                      isTVSelectable={true}
                      tvParallaxProperties={{ enabled: false }}
                    >
                      <View style={pStyles.trackOptionTextWrap}>
                        <Text style={pStyles.trackOptionLabel} numberOfLines={1}>{option.label}</Text>
                        {option.secondaryLabel ? (
                          <Text style={pStyles.trackOptionMeta} numberOfLines={1}>{option.secondaryLabel}</Text>
                        ) : null}
                      </View>
                      {option.selected ? <Icon name="check" size={18} color={accent} /> : null}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          )}

          {/* Pause Indicator */}
          {isPaused && (
            <View style={pStyles.pauseIndicator}>
               <Icon name="pause" size={48} color="#FFF" />
            </View>
          )}

          {/* Bottom Bar - TiviMate-style EPG info */}
          {currentChannel && (
              <View style={[pStyles.bottomBar, { borderTopColor: accent }]}>
                 <View style={pStyles.infoContainer}>
                     <Image source={currentChannel.logo && currentChannel.logo.startsWith('http') ? { uri: currentChannel.logo } : defaultLogo} style={pStyles.channelLogo} resizeMode="contain" />

                     <View style={pStyles.textContainer}>
                         <View style={pStyles.headerRow}>
                            <Text style={pStyles.channelName}>{currentChannel.name}</Text>
                            <Text style={pStyles.timeText}>{timeFormatter.format(Date.now())}</Text>
                         </View>

                         {currentProgram ? (
                            <View style={pStyles.epgContainer}>
                                <Text style={pStyles.programTitle} numberOfLines={1}>{currentProgram.title}</Text>

                                <View style={pStyles.progressRow}>
                                    <Text style={pStyles.programTimeText}>
                                      {canSeek
                                        ? formatDuration(pendingSeekTime ?? playbackProgress.currentTime)
                                        : timeFormatter.format(currentProgram.start)}
                                    </Text>
                                    <View
                                      style={pStyles.progressBarContainer}
                                      onLayout={(event) => {
                                        seekBarWidthRef.current = event.nativeEvent.layout.width;
                                      }}
                                      onStartShouldSetResponder={() => !Platform.isTV && canSeek}
                                      onMoveShouldSetResponder={() => !Platform.isTV && canSeek}
                                      onResponderGrant={(event) => {
                                        handleSeekBarTouch(event.nativeEvent.locationX, false);
                                      }}
                                      onResponderMove={(event) => {
                                        handleSeekBarTouch(event.nativeEvent.locationX, false);
                                      }}
                                      onResponderRelease={(event) => {
                                        handleSeekBarTouch(event.nativeEvent.locationX, true);
                                      }}
                                    >
                                        <View style={[pStyles.progressBarFill, { width: `${canSeek ? playbackPercent : progressPercent}%`, backgroundColor: accent }]} />
                                    </View>
                                    <Text style={pStyles.programTimeText}>
                                      {canSeek
                                        ? (playbackProgress.duration > 0 ? formatDuration(playbackProgress.duration) : '--:--')
                                        : timeFormatter.format(currentProgram.end)}
                                    </Text>
                                </View>

                                <Text style={pStyles.nextProgramText} numberOfLines={1}>
                                  {nextProgram
                                    ? `${t('focusPreviewNext')}: ${timeFormatter.format(nextProgram.start)} - ${nextProgram.title}`
                                    : `${t('focusPreviewNext')}: —`}
                                </Text>
                            </View>
                         ) : (
                             <Text style={pStyles.noEpgText}>{t('focusPreviewNoEpg')}</Text>
                         )}

                         {/* Metadata row */}
                         {metadataItems.length > 0 && (
                           <View style={pStyles.metadataRow}>
                             <Text style={pStyles.metadataText}>{metadataItems.join(' • ')}</Text>
                           </View>
                         )}
                     </View>
                 </View>
              </View>
          )}

          {/* VOD/Series/Catchup info bar */}
          {!currentChannel && (
            <View style={[pStyles.bottomBar, { borderTopColor: accent }]}>
              <View style={pStyles.vodInfoContainer}>
                <View style={pStyles.vodHeaderRow}>
                  <Text style={pStyles.vodTitle} numberOfLines={1}>{playbackTitle}</Text>
                  <Text style={pStyles.timeText}>{timeFormatter.format(Date.now())}</Text>
                </View>

                <View style={pStyles.progressRow}>
                  <Text style={pStyles.programTimeText}>{formatDuration(pendingSeekTime ?? playbackProgress.currentTime)}</Text>
                  <View
                    style={pStyles.progressBarContainer}
                    onLayout={(event) => {
                      seekBarWidthRef.current = event.nativeEvent.layout.width;
                    }}
                    onStartShouldSetResponder={() => !Platform.isTV && canSeek}
                    onMoveShouldSetResponder={() => !Platform.isTV && canSeek}
                    onResponderGrant={(event) => {
                      handleSeekBarTouch(event.nativeEvent.locationX, false);
                    }}
                    onResponderMove={(event) => {
                      handleSeekBarTouch(event.nativeEvent.locationX, false);
                    }}
                    onResponderRelease={(event) => {
                      handleSeekBarTouch(event.nativeEvent.locationX, true);
                    }}
                  >
                    <View style={[pStyles.progressBarFill, { width: `${playbackPercent}%`, backgroundColor: accent }]} />
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
    padding: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
  },
  topBarSpacer: {
    flex: 1,
  },
  iconBtn: {
    padding: spacing.sm + 2,
    borderRadius: spacing.xxl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadge: {
    marginLeft: spacing.md,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.sm - 2,
    borderRadius: radii.md,
  },
  statusBadgeLive: {
    backgroundColor: 'rgba(16,185,129,0.35)',
  },
  statusBadgeWarning: {
    backgroundColor: 'rgba(245,158,11,0.35)',
  },
  statusBadgeDanger: {
    backgroundColor: 'rgba(239,68,68,0.35)',
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontSize: typography.caption.fontSize,
    fontWeight: '700',
  },
  quickActionBtn: {
    marginLeft: spacing.sm + 2,
    minWidth: 120,
    maxWidth: 220,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.lg - 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(30,30,46,0.78)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  quickActionBtnActive: {
    backgroundColor: 'rgba(30,30,46,0.96)',
  },
  seekActionBtn: {
    marginLeft: spacing.sm + 2,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(30,30,46,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  quickActionLabel: {
    color: '#FFF',
    fontSize: typography.caption.fontSize,
    fontWeight: '600',
    marginLeft: spacing.sm,
    flex: 1,
  },
  trackPanelShell: {
    position: 'absolute',
    top: Platform.isTV ? 86 : 78,
    right: spacing.xl,
    left: Platform.isTV ? undefined : spacing.xl,
    zIndex: 40,
  },
  trackPanel: {
    alignSelf: 'flex-end',
    width: Platform.isTV ? 420 : undefined,
    maxWidth: 460,
    borderRadius: radii.lg + 2,
    borderWidth: 1,
    backgroundColor: 'rgba(18,18,30,0.96)',
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  trackPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  trackPanelTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  trackPanelCloseBtn: {
    width: spacing.xxl + 8,
    height: spacing.xxl + 8,
    borderRadius: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  trackOptionList: {
    maxHeight: Platform.isTV ? 420 : 260,
  },
  trackOptionListContent: {
    gap: spacing.sm,
    paddingBottom: spacing.xs,
  },
  trackOptionBtn: {
    minHeight: 54,
    borderRadius: radii.lg - 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  trackOptionBtnSelected: {
    borderWidth: 1.5,
  },
  trackOptionTextWrap: {
    flex: 1,
    marginRight: spacing.sm + 2,
  },
  trackOptionLabel: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  trackOptionMeta: {
    color: '#9E9EB8',
    fontSize: typography.caption.fontSize,
    marginTop: spacing.xs - 2,
  },
  // Channel switch mini-overlay
  channelSwitchOverlay: {
    position: 'absolute',
    top: spacing.xl,
    right: spacing.xl,
    zIndex: 50,
  },
  channelSwitchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg - 2,
    borderRadius: radii.md,
    borderWidth: 2,
    minWidth: 250,
  },
  channelNumberBadge: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm + 2,
  },
  channelNumberText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  switchLogo: {
    width: 40,
    height: 28,
    borderRadius: radii.sm - 4,
  },
  switchName: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  switchProgram: {
    color: '#9E9EB8',
    fontSize: typography.caption.fontSize,
    marginTop: spacing.xs - 2,
  },
  // Pause indicator
  pauseIndicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -40 }, { translateY: -40 }],
    backgroundColor: 'rgba(30,30,46,0.6)',
    padding: spacing.lg,
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
    padding: spacing.xl,
    paddingBottom: spacing.xl,
  },
  channelLogo: {
      width: 100,
      height: 100,
      marginRight: spacing.xl,
      backgroundColor: 'rgba(255,255,255,0.05)',
      borderRadius: radii.sm,
  },
  textContainer: {
      flex: 1,
  },
  vodInfoContainer: {
    padding: spacing.xl,
    paddingBottom: spacing.xl,
  },
  vodHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm + 2,
  },
  vodTitle: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '700',
    flex: 1,
    marginRight: spacing.md,
  },
  headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      marginBottom: spacing.sm - 2,
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
      marginBottom: spacing.sm + 2,
  },
  progressRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.sm - 2,
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
      marginHorizontal: spacing.sm + 2,
      overflow: 'hidden',
  },
  progressBarFill: {
      height: '100%',
      borderRadius: 2.5,
  },
  nextProgramText: {
      color: '#6B6B8D',
      fontSize: 14,
      marginTop: spacing.xs - 2,
  },
  noEpgText: {
      color: '#6B6B8D',
      fontSize: 16,
      fontStyle: 'italic',
      marginTop: spacing.sm - 2,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm - 2,
    opacity: 0.6,
  },
  metadataText: {
    color: '#9E9EB8',
    fontSize: typography.caption.fontSize,
    fontWeight: '500',
  },
});

export default PlayerScreen;
