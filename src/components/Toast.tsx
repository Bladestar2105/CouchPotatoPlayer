import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { isMobile } from '../utils/platform';

type ToastType = 'success' | 'error' | 'info';

interface ToastMessage {
  id: number;
  text: string;
  type: ToastType;
}

let toastId = 0;
let globalShowToast: ((text: string, type?: ToastType) => void) | null = null;

export const showToast = (text: string, type: ToastType = 'info') => {
  if (globalShowToast) globalShowToast(text, type);
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((text: string, type: ToastType = 'info') => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 2500);
  }, []);

  useEffect(() => {
    globalShowToast = addToast;
    return () => { globalShowToast = null; };
  }, [addToast]);

  return (
    <View style={{ flex: 1 }}>
      {children}
      <View style={styles.container} pointerEvents="none">
        {toasts.map(toast => (
          <ToastItem key={toast.id} message={toast} />
        ))}
      </View>
    </View>
  );
};

const ToastItem: React.FC<{ message: ToastMessage }> = ({ message }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -20, duration: 300, useNativeDriver: true }),
      ]).start();
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const bgColor = message.type === 'success' ? '#34C759' : message.type === 'error' ? '#FF453A' : '#007AFF';

  return (
    <Animated.View style={[styles.toast, { backgroundColor: bgColor, opacity, transform: [{ translateY }] }]}>
      <Text style={styles.toastText}>{message.text}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: isMobile ? 100 : 60,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
  },
  toast: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 8,
    maxWidth: isMobile ? '85%' : '40%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  toastText: {
    color: '#FFF',
    fontSize: isMobile ? 14 : 18,
    fontWeight: '600',
    textAlign: 'center',
  },
});