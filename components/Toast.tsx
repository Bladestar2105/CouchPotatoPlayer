import React from 'react';
import { ToastAndroid, Platform, Alert } from 'react-native';

export const showToast = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  } else if (Platform.OS === 'web') {
    alert(message);
  } else {
    Alert.alert(type.toUpperCase(), message);
  }
};
