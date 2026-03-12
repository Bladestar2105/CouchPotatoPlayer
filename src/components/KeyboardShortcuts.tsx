import React, { useEffect, useCallback } from 'react';
import { Platform } from 'react-native';

interface KeyboardShortcutsProps {
  onPlayPause?: () => void;
  onSeekForward?: () => void;
  onSeekBackward?: () => void;
  onVolumeUp?: () => void;
  onVolumeDown?: () => void;
  onMute?: () => void;
  onFullscreen?: () => void;
  onEscape?: () => void;
  onSpeedUp?: () => void;
  onSpeedDown?: () => void;
  onNextChannel?: () => void;
  onPrevChannel?: () => void;
  onToggleStats?: () => void;
  onToggleSubtitles?: () => void;
  enabled?: boolean;
  children: React.ReactNode;
}

export const KeyboardShortcuts: React.FC<KeyboardShortcutsProps> = ({
  onPlayPause,
  onSeekForward,
  onSeekBackward,
  onVolumeUp,
  onVolumeDown,
  onMute,
  onFullscreen,
  onEscape,
  onSpeedUp,
  onSpeedDown,
  onNextChannel,
  onPrevChannel,
  onToggleStats,
  onToggleSubtitles,
  enabled = true,
  children,
}) => {
  const handleKeyDown = useCallback((event: any) => {
    if (!enabled) return;

    // Don't trigger shortcuts when typing in inputs
    const target = event.target;
    if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable) {
      return;
    }

    switch (event.key) {
      case ' ':
      case 'k':
        event.preventDefault();
        onPlayPause?.();
        break;
      case 'ArrowRight':
        event.preventDefault();
        if (event.shiftKey) {
          onSpeedUp?.();
        } else {
          onSeekForward?.();
        }
        break;
      case 'ArrowLeft':
        event.preventDefault();
        if (event.shiftKey) {
          onSpeedDown?.();
        } else {
          onSeekBackward?.();
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (event.ctrlKey || event.metaKey) {
          onPrevChannel?.();
        } else {
          onVolumeUp?.();
        }
        break;
      case 'ArrowDown':
        event.preventDefault();
        if (event.ctrlKey || event.metaKey) {
          onNextChannel?.();
        } else {
          onVolumeDown?.();
        }
        break;
      case 'm':
      case 'M':
        event.preventDefault();
        onMute?.();
        break;
      case 'f':
      case 'F':
        event.preventDefault();
        onFullscreen?.();
        break;
      case 'Escape':
        onEscape?.();
        break;
      case 'i':
      case 'I':
        event.preventDefault();
        onToggleStats?.();
        break;
      case 'c':
      case 'C':
        event.preventDefault();
        onToggleSubtitles?.();
        break;
      case 'j':
        // Seek backward 10s (YouTube-style)
        event.preventDefault();
        onSeekBackward?.();
        break;
      case 'l':
        // Seek forward 10s (YouTube-style)
        event.preventDefault();
        onSeekForward?.();
        break;
      case '>':
        event.preventDefault();
        onSpeedUp?.();
        break;
      case '<':
        event.preventDefault();
        onSpeedDown?.();
        break;
    }
  }, [
    enabled, onPlayPause, onSeekForward, onSeekBackward,
    onVolumeUp, onVolumeDown, onMute, onFullscreen, onEscape,
    onSpeedUp, onSpeedDown, onNextChannel, onPrevChannel,
    onToggleStats, onToggleSubtitles,
  ]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const doc = typeof globalThis !== 'undefined' && (globalThis as any).document ? (globalThis as any).document : null;
    if (!doc) return;

    doc.addEventListener('keydown', handleKeyDown);
    return () => {
      doc.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return <>{children}</>;
};

// Keyboard shortcut help text for display
export const KEYBOARD_SHORTCUTS = [
  { key: 'Space / K', action: 'Play / Pause' },
  { key: '← / J', action: 'Seek backward 10s' },
  { key: '→ / L', action: 'Seek forward 10s' },
  { key: '↑', action: 'Volume up' },
  { key: '↓', action: 'Volume down' },
  { key: 'M', action: 'Mute / Unmute' },
  { key: 'F', action: 'Fullscreen' },
  { key: 'Shift + → / >', action: 'Speed up' },
  { key: 'Shift + ← / <', action: 'Speed down' },
  { key: 'Ctrl + ↑', action: 'Previous channel' },
  { key: 'Ctrl + ↓', action: 'Next channel' },
  { key: 'I', action: 'Toggle stream info' },
  { key: 'C', action: 'Toggle subtitles' },
  { key: 'Esc', action: 'Back / Exit' },
];