import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, ListRenderItemInfo } from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import { useAppStore } from '../store';
import { UnifiedEpgProgram, EpgRenderItemType } from '../types/iptv';
import { Calendar, Clock, ChevronLeft } from 'lucide-react-native';
import { formatProgramTime } from '../services/xmltv';
import { Buffer } from 'buffer';
import { isTV, isMobile } from '../utils/platform';
import { SafeAreaView } from 'react-native-safe-area-context';

type EpgRouteProp = RouteProp<RootStackParamList, 'Epg'>;

const BASE64_PADDING_REGEX = new RegExp('=+', 'g');

export const EpgScreen = () => {
  const route = useRoute<EpgRouteProp>();
  const navigation = useNavigation();
  const { channelId } = route.params;
  const config = useAppStore(state => state.config);
  const globalEpgData = useAppStore(state => state.epgData);

  const [epgData, setEpgData] = useState<UnifiedEpgProgram[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!config) return;
    const channelEpg = globalEpgData[channelId as string] || [];
    setEpgData(channelEpg);
    setLoading(false);
  }, [channelId, config, globalEpgData]);

  const renderEpgItem = ({ item }: ListRenderItemInfo<EpgRenderItemType>) => {
    let isNow = false;
    let title = 'Unknown Title';
    let description = '';
    let startStr = '';
    let endStr = '';

    if ('title_raw' in item && typeof item.start === 'number') {
      const nowMs = Date.now();
      isNow = item.start <= nowMs && (item.end as number) > nowMs;
      title = item.title_raw;
      description = item.description_raw;
      startStr = (item as any).start_formatted || formatProgramTime(item.start);
      endStr = (item as any).end_formatted || formatProgramTime(item.end as number);
    } else if ('title_raw' in item) {
      isNow = item.has_archive === 0;
      title = item.title_raw;
      description = item.description_raw;
      startStr = String(item.start);
      endStr = String(item.end);
    } else {
      isNow = item.has_archive === 0;
      title = Buffer.from(item.title || '', 'base64').toString('utf-8').replace(BASE64_PADDING_REGEX, '');
      description = item.description ? Buffer.from(item.description, 'base64').toString('utf-8').replace(BASE64_PADDING_REGEX, '') : '';
      startStr = item.start;
      endStr = item.end;
    }

    if (isMobile) {
      return (
        <View style={[mStyles.epgCard, isNow && mStyles.epgCardNow]}>
          <View style={mStyles.timeRow}>
            <Clock size={14} color={isNow ? "#FFF" : "#888"} />
            <Text style={[mStyles.timeText, isNow && mStyles.timeTextNow]}>
              {startStr} – {endStr}
            </Text>
          </View>
          <Text style={[mStyles.title, isNow && mStyles.titleNow]} numberOfLines={2}>
            {title || 'Unknown Title'}
          </Text>
          {description ? (
            <Text style={mStyles.description} numberOfLines={2}>
              {description}
            </Text>
          ) : null}
        </View>
      );
    }

    // TV layout
    return (
      <View style={[styles.epgCard, isNow && styles.epgCardNow]}>
        <View style={styles.timeContainer}>
          <Clock size={20} color={isNow ? "#FFF" : "#888"} />
          <Text style={[styles.timeText, isNow && styles.timeTextNow]}>
            {startStr} - {endStr}
          </Text>
        </View>
        <Text style={[styles.title, isNow && styles.titleNow]} numberOfLines={2}>
          {title || 'Unknown Title'}
        </Text>
        {description ? (
          <Text style={styles.description} numberOfLines={3}>
            {description}
          </Text>
        ) : null}
      </View>
    );
  };

  const Wrapper = isMobile ? SafeAreaView : View;
  const wrapperProps = isMobile ? { edges: ['top'] as const, style: mStyles.container } : { style: styles.container };

  return (
    <Wrapper {...wrapperProps}>
      {/* Header */}
      <View style={isMobile ? mStyles.header : styles.header}>
        <TouchableOpacity
          style={isMobile ? mStyles.backButton : styles.backButton}
          onPress={() => navigation.goBack()}
          {...(isTV ? { hasTVPreferredFocus: true } : {})}
        >
          <ChevronLeft size={isMobile ? 24 : 32} color="#FFF" />
          {!isMobile && <Text style={styles.headerTitle}>TV Guide</Text>}
        </TouchableOpacity>
        {isMobile && <Text style={mStyles.headerTitle}>TV Guide</Text>}
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : epgData.length === 0 ? (
        <View style={styles.centerContainer}>
          <Calendar size={isMobile ? 48 : 64} color="#444" />
          <Text style={isMobile ? mStyles.emptyText : styles.emptyText}>No programming information available.</Text>
        </View>
      ) : (
        <FlatList
          data={epgData}
          keyExtractor={(item, index) => index.toString()}
          renderItem={renderEpgItem}
          contentContainerStyle={isMobile ? mStyles.listContainer : styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </Wrapper>
  );
};

// ── TV styles (original) ──────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  header: {
    paddingTop: 40,
    paddingHorizontal: 40,
    paddingBottom: 20,
    backgroundColor: '#1C1C1E',
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 32,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#888',
    fontSize: 20,
    marginTop: 20,
  },
  listContainer: {
    padding: 40,
  },
  epgCard: {
    backgroundColor: '#1C1C1E',
    padding: 25,
    borderRadius: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  epgCardNow: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  timeText: {
    color: '#888',
    fontSize: 18,
    marginLeft: 10,
    fontWeight: '600',
  },
  timeTextNow: {
    color: '#FFF',
  },
  title: {
    color: '#E5E5E5',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  titleNow: {
    color: '#FFF',
  },
  description: {
    color: '#AAA',
    fontSize: 16,
    lineHeight: 24,
  }
});

// ── Mobile styles ─────────────────────────────────────────────────
const mStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#1C1C1E',
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  backButton: {
    marginRight: 12,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
    marginTop: 16,
  },
  listContainer: {
    padding: 16,
  },
  epgCard: {
    backgroundColor: '#1C1C1E',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  epgCardNow: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  timeText: {
    color: '#888',
    fontSize: 13,
    marginLeft: 6,
    fontWeight: '600',
  },
  timeTextNow: {
    color: '#FFF',
  },
  title: {
    color: '#E5E5E5',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  titleNow: {
    color: '#FFF',
  },
  description: {
    color: '#AAA',
    fontSize: 13,
    lineHeight: 19,
  },
});