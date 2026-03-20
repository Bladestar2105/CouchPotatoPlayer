import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../App';
import { useIPTV } from '../context/IPTVContext';
import { useSettings } from '../context/SettingsContext';
import { EPGProgram, Channel } from '../types';
import { isProgramCatchupAvailable, getCatchupDays } from '../utils/catchupUtils';
import { Ionicons } from '@expo/vector-icons';

type EPGScreenRouteProp = RouteProp<RootStackParamList, 'EPG'>;

const EPGScreen = () => {
  const route = useRoute<EPGScreenRouteProp>();
  const navigation = useNavigation<any>();
  const { epg, getCatchupUrl, hasCatchup, playStream } = useIPTV();
  const { colors } = useSettings();

  const { channelId, channelName, channel } = route.params;

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
    const isPast = now >= endMs;
    
    // Check if catchup is available for this program
    const canWatchCatchup = channel && isPast && hasCatchup(channel) && 
      isProgramCatchupAvailable(channel, item.start, item.end);
    
    const catchupDays = channel ? getCatchupDays(channel) : 0;

    const bgColor = isNow ? colors.primary + '33' : colors.card; // 33 for 20% opacity
    const borderColor = isNow ? colors.primary : colors.divider;

    const handlePlayCatchup = () => {
      if (!channel) return;
      
      const catchupUrl = getCatchupUrl(channel, item.start, item.end);
      if (catchupUrl) {
        playStream({ url: catchupUrl, id: `${channelId}_${startMs}` });
        navigation.navigate('Player');
      } else {
        Alert.alert('Error', 'Unable to generate catchup URL for this program.');
      }
    };

    return (
      <View style={[styles.epgItem, { backgroundColor: bgColor, borderColor: borderColor }]}>
        <View style={styles.timeRow}>
          <Text style={{ color: isNow ? colors.primary : colors.textSecondary, fontWeight: 'bold' }}>
            {item.start.getHours().toString().padStart(2, '0')}:{item.start.getMinutes().toString().padStart(2, '0')}
            {' - '}
            {item.end.getHours().toString().padStart(2, '0')}:{item.end.getMinutes().toString().padStart(2, '0')}
          </Text>
          {canWatchCatchup && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Catchup ({catchupDays}d)</Text>
            </View>
          )}
        </View>
        <Text style={[styles.title, { color: colors.text, fontWeight: isNow ? 'bold' : 'normal' }]}>{item.title}</Text>
        {item.description && item.description.length > 0 ? (
          <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={3}>
            {item.description}
          </Text>
        ) : null}
        
        {/* Catchup watch button */}
        {canWatchCatchup && (
          <View style={styles.actionRow}>
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={handlePlayCatchup}
            >
              <Ionicons name="play-circle" size={18} color="white" />
              <Text style={styles.actionButtonText}>Watch Catchup</Text>
            </TouchableOpacity>
          </View>
        )}
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
  badge: {
    marginLeft: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#27ae60',
    borderRadius: 10,
  },
  badgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 16,
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
});

export default EPGScreen;
