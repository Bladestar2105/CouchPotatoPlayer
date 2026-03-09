import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, ListRenderItemInfo } from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import { useAppStore } from '../store';
import { XtreamService } from '../services/xtream';
import { XMLTVParser } from '../services/xmltv';
import { UnifiedEpgProgram, M3UFormattedEpgProgram, EpgRenderItemType } from '../types/iptv';
import { Calendar, Clock, ChevronLeft } from 'lucide-react-native';
import { Buffer } from 'buffer';

type EpgRouteProp = RouteProp<RootStackParamList, 'Epg'>;

export const EpgScreen = () => {
  const route = useRoute<EpgRouteProp>();
  const navigation = useNavigation();
  const { channelId } = route.params;
  const config = useAppStore(state => state.config);

  const [epgData, setEpgData] = useState<UnifiedEpgProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchEpg = async () => {
      if (!config) return;
      try {
        setLoading(true);
        if (config.type === 'xtream') {
          const xtream = new XtreamService(config);
          const data = await xtream.getShortEpg(channelId as number);
          if (data && data.epg_listings) {
            setEpgData(data.epg_listings);
          } else {
            setEpgData([]);
          }
        } else if (config.type === 'm3u' && config.epgUrl) {
          const xmltv = new XMLTVParser(config.epgUrl);
          const { programmes } = await xmltv.fetchAndParseEPG();
          const channelProgs = xmltv.getChannelProgrammes(programmes, channelId as string);

          const formatted: M3UFormattedEpgProgram[] = channelProgs.map((p: Record<string, any>) => {
            const startRaw = p['@_start'] || '';
            const endRaw = p['@_stop'] || '';
            // Very basic parse assuming YYYYMMDDHHmmss formatting
            const formatTime = (t: string) => {
              if (t.length >= 12) return `${t.substring(8, 10)}:${t.substring(10, 12)}`;
              return t;
            };

            return {
              start: formatTime(startRaw),
              end: formatTime(endRaw),
              title_raw: p.title?.['#text'] || p.title || 'Unknown Title',
              description_raw: p.desc?.['#text'] || p.desc || '',
              has_archive: 1, // Defaulting false for heuristic later
            };
          });
          setEpgData(formatted);
        } else {
          setEpgData([]); // M3U without EPG URL
        }
      } catch (err) {
        console.error('Failed to load EPG:', err instanceof Error ? err.message : 'Unknown error');
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchEpg();
  }, [channelId, config]);

  const renderEpgItem = ({ item }: ListRenderItemInfo<EpgRenderItemType>) => {
    const isNow = item.has_archive === 0; // Rough heuristic, typically EPG API indicates now playing

    // M3U EPG vs Xtream EPG decode
    const title = 'title_raw' in item
      ? item.title_raw
      : Buffer.from(item.title || '', 'base64').toString('utf-8').replace(new RegExp('=', 'g'), '');

    const description = 'description_raw' in item
      ? item.description_raw
      : (item.description ? Buffer.from(item.description, 'base64').toString('utf-8').replace(new RegExp('=', 'g'), '') : '');

    return (
      <View style={[styles.epgCard, isNow && styles.epgCardNow]}>
        <View style={styles.timeContainer}>
          <Clock size={20} color={isNow ? "#FFF" : "#888"} />
          <Text style={[styles.timeText, isNow && styles.timeTextNow]}>
            {item.start} - {item.end}
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hasTVPreferredFocus
        >
          <ChevronLeft size={32} color="#FFF" />
          <Text style={styles.headerTitle}>TV Guide</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Unable to load EPG data for this channel.</Text>
        </View>
      ) : epgData.length === 0 ? (
        <View style={styles.centerContainer}>
          <Calendar size={64} color="#444" />
          <Text style={styles.emptyText}>No programming information available.</Text>
        </View>
      ) : (
        <FlatList
          data={epgData}
          keyExtractor={(item, index) => index.toString()}
          renderItem={renderEpgItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

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
  errorText: {
    color: '#FF453A',
    fontSize: 20,
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
