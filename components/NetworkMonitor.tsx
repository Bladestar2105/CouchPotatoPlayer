import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useTranslation } from 'react-i18next';
import { WifiOff } from 'lucide-react-native';

export const NetworkMonitor = () => {
  const { t } = useTranslation();
  const [isConnected, setIsConnected] = useState<boolean | null>(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: any) => {
      setIsConnected(state.isConnected);
    });
    return () => unsubscribe();
  }, []);

  if (isConnected !== false) return null;

  return (
    <View style={styles.container}>
      <WifiOff color="#FFF" size={20} />
      <Text style={styles.text}>{t('noInternetConnection', 'No Internet Connection')}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FF453A',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  text: {
    color: '#FFF',
    fontWeight: 'bold',
  },
});
