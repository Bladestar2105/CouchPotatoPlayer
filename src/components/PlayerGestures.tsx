import React, { useRef, useCallback, useState } from 'react';
import { View, Text, StyleSheet, Animated, PanResponder, Dimensions } from 'react-native';
import { isMobile } from '../utils/platform';

interface PlayerGesturesProps {
  onSeekForward?: () => void;
  onSeekBackward?: () => void;
  onTap?: () => void;
  enabled?: boolean;
  children: React.ReactNode;
}

export const PlayerGestures: React.FC<PlayerGesturesProps> = ({
  onSeekForward,
  onSeekBackward,
  onTap,
  enabled = true,
  children,
}) => {
  const [seekIndicator, setSeekIndicator] = useState<'forward' | 'backward' | null>(null);
  const seekAnim = useRef(new Animated.Value(0)).current;
  const lastTap = useRef<{ time: number; x: number }>({ time: 0, x: 0 });
  const tapTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showSeekIndicator = useCallback((direction: 'forward' | 'backward') => {
    setSeekIndicator(direction);
    seekAnim.setValue(1);
    Animated.timing(seekAnim, {
      toValue: 0,
      duration: 600,
      useNativeDriver: true,
    }).start(() => setSeekIndicator(null));
  }, [seekAnim]);

  const handleTouchEnd = useCallback((evt: any) => {
    if (!enabled || !isMobile) return;

    const now = Date.now();
    const { locationX } = evt.nativeEvent;
    const screenWidth = Dimensions.get('window').width;
    const isRight = locationX > screenWidth / 2;

    // Double tap detection (300ms window)
    if (now - lastTap.current.time < 300) {
      // Clear single tap timeout
      if (tapTimeout.current) {
        clearTimeout(tapTimeout.current);
        tapTimeout.current = null;
      }

      if (isRight && onSeekForward) {
        onSeekForward();
        showSeekIndicator('forward');
      } else if (!isRight && onSeekBackward) {
        onSeekBackward();
        showSeekIndicator('backward');
      }
      lastTap.current = { time: 0, x: 0 };
    } else {
      lastTap.current = { time: now, x: locationX };
      // Single tap: wait to see if it's a double tap
      tapTimeout.current = setTimeout(() => {
        if (onTap) onTap();
        tapTimeout.current = null;
      }, 300);
    }
  }, [enabled, onSeekForward, onSeekBackward, onTap, showSeekIndicator]);

  if (!isMobile) {
    return <>{children}</>;
  }

  return (
    <View style={styles.container} onTouchEnd={handleTouchEnd}>
      {children}
      
      {/* Seek indicator overlays */}
      {seekIndicator === 'backward' && (
        <Animated.View style={[styles.seekOverlay, styles.seekLeft, { opacity: seekAnim }]}>
          <Text style={styles.seekText}>⟪ 10s</Text>
        </Animated.View>
      )}
      {seekIndicator === 'forward' && (
        <Animated.View style={[styles.seekOverlay, styles.seekRight, { opacity: seekAnim }]}>
          <Text style={styles.seekText}>10s ⟫</Text>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  seekOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '40%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 100,
  },
  seekLeft: {
    left: 0,
  },
  seekRight: {
    right: 0,
  },
  seekText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});