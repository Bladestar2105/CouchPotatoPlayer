import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, AppState, AppStateStatus } from 'react-native';
import { isMobile } from '../utils/platform';

type NetworkStatus = 'online' | 'offline' | 'reconnecting';

let globalNetworkStatus: NetworkStatus = 'online';
let listeners: Array<(status: NetworkStatus) => void> = [];

export const getNetworkStatus = () => globalNetworkStatus;

export const onNetworkChange = (cb: (status: NetworkStatus) => void) => {
  listeners.push(cb);
  return () => { listeners = listeners.filter(l => l !== cb); };
};

const setNetworkStatus = (status: NetworkStatus) => {
  globalNetworkStatus = status;
  listeners.forEach(cb => cb(status));
};

// Simple connectivity check via fetch
const checkConnectivity = async (): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    await fetch(`https://www.google.com/generate_204?_=${Date.now()}`, {
      method: 'HEAD',
      mode: 'no-cors',
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return true;
  } catch {
    return false;
  }
};

export const NetworkMonitor: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<NetworkStatus>('online');
  const slideAnim = useRef(new Animated.Value(-50)).current;
  const checkInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const wasOffline = useRef(false);

  const updateStatus = useCallback(async () => {
    const online = await checkConnectivity();
    if (online) {
      if (wasOffline.current) {
        setStatus('reconnecting');
        setNetworkStatus('reconnecting');
        setTimeout(() => {
          setStatus('online');
          setNetworkStatus('online');
          wasOffline.current = false;
        }, 2000);
      } else {
        setStatus('online');
        setNetworkStatus('online');
      }
    } else {
      wasOffline.current = true;
      setStatus('offline');
      setNetworkStatus('offline');
    }
  }, []);

  useEffect(() => {
    // Initial check
    updateStatus();

    // Periodic check every 15 seconds
    checkInterval.current = setInterval(updateStatus, 15000);

    // Check on app foreground
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        updateStatus();
      }
    });

    return () => {
      if (checkInterval.current) clearInterval(checkInterval.current);
      subscription.remove();
    };
  }, [updateStatus]);

  // Animate banner
  useEffect(() => {
    if (status === 'offline') {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();
    } else if (status === 'reconnecting') {
      // Keep visible briefly
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -50,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [status, slideAnim]);

  return (
    <View style={{ flex: 1 }}>
      {children}
      <Animated.View
        style={[
          styles.banner,
          status === 'offline' ? styles.offlineBanner : styles.reconnectBanner,
          { transform: [{ translateY: slideAnim }] },
        ]}
        pointerEvents="none"
      >
        <Text style={styles.bannerText}>
          {status === 'offline' ? '⚡ No Internet Connection' : '✓ Back Online'}
        </Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: isMobile ? 44 : 36,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 6,
    zIndex: 99999,
  },
  offlineBanner: {
    backgroundColor: '#FF453A',
  },
  reconnectBanner: {
    backgroundColor: '#34C759',
  },
  bannerText: {
    color: '#FFF',
    fontSize: isMobile ? 13 : 16,
    fontWeight: '600',
  },
});