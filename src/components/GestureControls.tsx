import React, { useState, useRef, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, PanResponder, Animated, Dimensions, Platform } from 'react-native';
import { Sun, Volume2, VolumeX } from 'lucide-react-native';
import { isMobile, isTV } from '../utils/platform';

interface GestureControlsProps {
  children: React.ReactNode;
  enabled?: boolean;
  onVolumeChange?: (volume: number) => void;
  onBrightnessChange?: (brightness: number) => void;
}

export const GestureControls: React.FC<GestureControlsProps> = ({
  children,
  enabled = true,
  onVolumeChange,
  onBrightnessChange,
}) => {
  const [volume, setVolume] = useState(1.0);
  const [brightness, setBrightness] = useState(1.0);
  const [activeControl, setActiveControl] = useState<'volume' | 'brightness' | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const startY = useRef(0);
  const startValue = useRef(0);
  const hideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const screenWidth = Dimensions.get('window').width;

  const showIndicator = useCallback(() => {
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 100,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const hideIndicator = useCallback(() => {
    hideTimeout.current = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setActiveControl(null));
    }, 500);
  }, [fadeAnim]);

  const panResponder = useMemo(() => {
    if (!enabled || !isMobile || isTV) return null;
    return PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only activate for vertical swipes (not horizontal)
        return Math.abs(gestureState.dy) > 30 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 2;
      },
      onPanResponderGrant: (evt) => {
        const touchX = evt.nativeEvent.locationX;
        const isLeftSide = touchX < screenWidth / 2;
        const control = isLeftSide ? 'brightness' : 'volume';
        setActiveControl(control);
        startY.current = 0;
        startValue.current = control === 'volume' ? volume : brightness;
        showIndicator();
      },
      onPanResponderMove: (_, gestureState) => {
        if (!activeControl) return;
        // Moving up increases, moving down decreases
        const screenH = Dimensions.get('window').height;
        const delta = -gestureState.dy / (screenH * 0.5); // 50% of screen = full range
        const newValue = Math.max(0, Math.min(1, startValue.current + delta));

        if (activeControl === 'volume') {
          setVolume(newValue);
          onVolumeChange?.(newValue);
        } else {
          setBrightness(newValue);
          onBrightnessChange?.(newValue);
        }
      },
      onPanResponderRelease: () => {
        hideIndicator();
      },
      onPanResponderTerminate: () => {
        hideIndicator();
      },
    });
  }, [enabled, activeControl, volume, brightness, screenWidth, showIndicator, hideIndicator, onVolumeChange, onBrightnessChange]);

  if (!enabled || !isMobile || isTV) {
    return <>{children}</>;
  }

  const currentValue = activeControl === 'volume' ? volume : brightness;
  const percentage = Math.round(currentValue * 100);

  return (
    <View style={styles.container} {...(panResponder ? panResponder.panHandlers : {})}>
      {children}

      {/* Volume/Brightness indicator */}
      {activeControl && (
        <Animated.View
          style={[
            styles.indicator,
            activeControl === 'volume' ? styles.indicatorRight : styles.indicatorLeft,
            { opacity: fadeAnim },
          ]}
        >
          <View style={styles.indicatorContent}>
            {activeControl === 'volume' ? (
              percentage === 0 ? (
                <VolumeX color="#FFF" size={22} />
              ) : (
                <Volume2 color="#FFF" size={22} />
              )
            ) : (
              <Sun color="#FFF" size={22} />
            )}
            <View style={styles.barContainer}>
              <View style={styles.barBg}>
                <View style={[styles.barFill, { height: `${percentage}%` }]} />
              </View>
            </View>
            <Text style={styles.percentText}>{percentage}%</Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  indicator: {
    position: 'absolute',
    top: '20%',
    width: 44,
    height: '40%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  indicatorLeft: {
    left: 16,
  },
  indicatorRight: {
    right: 16,
  },
  indicatorContent: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    gap: 8,
    width: 44,
  },
  barContainer: {
    height: 100,
    width: 6,
    justifyContent: 'flex-end',
  },
  barBg: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  barFill: {
    backgroundColor: '#FFF',
    borderRadius: 3,
    width: '100%',
  },
  percentText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '600',
  },
});