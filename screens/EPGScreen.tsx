import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../App';
import { useIPTV } from '../context/IPTVContext';
import { useSettings } from '../context/SettingsContext';
import { EPGProgram } from '../types';

type EPGScreenRouteProp = RouteProp<RootStackParamList, 'EPG'>;

const EPGScreen = () => {
  const route = useRoute<EPGScreenRouteProp>();
  const navigation = useNavigation<any>();
  const { epg } = useIPTV();
  const { colors } = useSettings();

  const { channelId, channelName } = route.params;

  const [epgData, setEpgData] = useState<EPGProgram[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    navigation.setOptions({ title: `TV Guide - ${channelName}` });

    if (epg && epg[channelId]) {
      setEpgData(epg[channelId]);
    }
    setLoading(false);
  }, [channelId, channelName, epg, navigation]);

  const renderItem = ({ item }: { item: EPGProgram }) => {
    const now = new Date().getTime();
    const startMs = item.start.getTime();
    const endMs = item.end.getTime();

    const isNow = now >= startMs && now < endMs;

    const bgColor = isNow ? colors.primary + '33' : colors.card; // 33 for 20% opacity
    const borderColor = isNow ? colors.primary : colors.divider;

    return (
      <View style={[styles.epgItem, { backgroundColor: bgColor, borderColor: borderColor }]}>
        <View style={styles.timeRow}>
          <Text style={{ color: isNow ? colors.primary : colors.textSecondary, fontWeight: 'bold' }}>
            {item.start.getHours().toString().padStart(2, '0')}:{item.start.getMinutes().toString().padStart(2, '0')}
            {' - '}
            {item.end.getHours().toString().padStart(2, '0')}:{item.end.getMinutes().toString().padStart(2, '0')}
          </Text>
        </View>
        <Text style={[styles.title, { color: colors.text, fontWeight: isNow ? 'bold' : 'normal' }]}>{item.title}</Text>
        {item.description && item.description.length > 0 ? (
          <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={3}>
            {item.description}
          </Text>
        ) : null}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (epgData.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textSecondary, fontSize: 18 }}>No programming information available.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={epgData}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  epgItem: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: {
    fontSize: 16,
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  }
});

export default EPGScreen;
