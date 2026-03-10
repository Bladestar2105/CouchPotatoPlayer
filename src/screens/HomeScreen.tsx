import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, ListRenderItemInfo, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { useAppStore } from '../store';
import { XtreamService } from '../services/xtream';
import { M3UService } from '../services/m3u';
import { XMLTVParser, parseXmltvDate, formatProgramTime } from '../services/xmltv';
import { Category, LiveChannel, ParsedProgram } from '../types/iptv';
import { Tv, PlaySquare, FileVideo, LayoutList, Search, Settings, Clock } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

export const HomeScreen = () => {
  const { config, categories, channels, setCategories, setChannels, epgData, setEpgData, showAdult } = useAppStore();
  const navigation = useNavigation<NavigationProp>();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'live' | 'vod' | 'series'>('live');

  useEffect(() => {
    const fetchData = async () => {
      if (!config) return;
      setLoading(true);

      try {
        if (config.type === 'xtream') {
          const xtream = new XtreamService(config);
          let catData;
          if (activeTab === 'vod') {
            catData = await xtream.getVodCategories();
          } else if (activeTab === 'series') {
            catData = await xtream.getSeriesCategories();
          } else {
            catData = await xtream.getLiveCategories();
          }
          setCategories(catData);
          setSelectedCategoryId(null);
        } else if (config.type === 'm3u') {
          const m3uService = new M3UService(config);
          const m3uData = await m3uService.parsePlaylist();
          setCategories(m3uData.categories);
          setChannels(m3uData.channels);
          setSelectedCategoryId(null);
        }
      } catch (error) {
        console.error('Failed to load data:', error instanceof Error ? error.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    if (config) {
      fetchData();
    }
  }, [config, setCategories, setChannels, activeTab]);

  const visibleCategories = useMemo(() => {
    return categories.filter(c => showAdult || String(c.adult) !== '1');
  }, [categories, showAdult]);

  useEffect(() => {
    const fetchFullEpg = async () => {
      if (!config) return;

      // Only fetch once
      if (Object.keys(epgData).length > 0) return;

      try {
        let epgUrl = '';
        if (config.type === 'xtream') {
          const xtream = new XtreamService(config);
          epgUrl = xtream.getXmltvUrl();
        } else if (config.type === 'm3u' && config.epgUrl) {
          epgUrl = config.epgUrl;
        }

        if (epgUrl) {
          const parser = new XMLTVParser(epgUrl);
          const { programmes } = await parser.fetchAndParseEPG();

          if (programmes && programmes.length > 0) {
             const grouped: Record<string, ParsedProgram[]> = {};
             programmes.forEach((p: any) => {
               const cid = p['@_channel'];
               if (!cid) return;

               const startMs = parseXmltvDate(p['@_start']);
               const stopMs = parseXmltvDate(p['@_stop']);

               if (!startMs || !stopMs) return;

               const prog: ParsedProgram = {
                 start: startMs,
                 end: stopMs,
                 start_formatted: formatProgramTime(startMs),
                 end_formatted: formatProgramTime(stopMs),
                 title_raw: p.title?.['#text'] || p.title || 'Unknown Title',
                 description_raw: p.desc?.['#text'] || p.desc || '',
                 has_archive: 0
               };

               if (!grouped[cid]) {
                 grouped[cid] = [];
               }
               grouped[cid].push(prog);
             });

             // Sort arrays
             for (const cid in grouped) {
               grouped[cid].sort((a, b) => a.start - b.start);
             }

             setEpgData(grouped);
          }
        }
      } catch (err) {
        console.error('Failed to load full EPG:', err);
      }
    };

    fetchFullEpg();
  }, [config, epgData, setEpgData]);

  useEffect(() => {
    const fetchChannels = async () => {
      if (!config || !selectedCategoryId) return;
      if (config.type === 'm3u') return;

      try {
        const xtream = new XtreamService(config);
        let channelData;
        if (activeTab === 'vod') {
          channelData = await xtream.getVodStreams(selectedCategoryId);
        } else if (activeTab === 'series') {
          channelData = await xtream.getSeries(selectedCategoryId);
        } else {
          channelData = await xtream.getLiveStreams(selectedCategoryId);
          setChannels(channelData);
        }

        if (activeTab === 'vod' || activeTab === 'series') {
          setChannels(channelData);
        }
      } catch (error) {
        console.error('Failed to load channels:', error instanceof Error ? error.message : 'Unknown error');
      }
    };

    if (selectedCategoryId && config?.type === 'xtream') {
      fetchChannels();
    }
  }, [selectedCategoryId, config, setChannels, activeTab]);

  const handleChannelPress = (channel: LiveChannel) => {
    let extension = 'm3u8';
    if (activeTab === 'live' && channel.stream_type === 'live') {
      extension = Platform.OS === 'web' || Platform.OS === 'ios' ? 'm3u8' : 'ts';
    } else if (activeTab === 'vod' || activeTab === 'series') {
      extension = channel.container_extension || 'mp4';
      if ((Platform.OS === 'web' || Platform.OS === 'ios') && extension === 'mkv') {
        extension = 'mp4';
      }
    }

    navigation.navigate('LivePlayer', {
      channelId: activeTab === 'series' ? (channel.series_id as number) : channel.stream_id,
      channelName: channel.title || channel.name,
      extension: extension,
      directSource: channel.direct_source,
      type: activeTab
    });
  };

  const handleChannelLongPress = (channel: LiveChannel) => {
    navigation.navigate('Epg', {
      channelId: config?.type === 'm3u' ? channel.epg_channel_id : (channel.epg_channel_id || channel.stream_id)
    });
  };

  const displayedChannels = useMemo(() => {
    if (!selectedCategoryId) return [];
    return config?.type === 'm3u'
      ? channels.filter(c => c.category_id === selectedCategoryId)
      : channels;
  }, [config?.type, channels, selectedCategoryId]);

  const [focusedCategoryId, setFocusedCategoryId] = useState<string | null>(null);

  const renderCategory = ({ item }: ListRenderItemInfo<Category>) => {
    const isSelected = item.category_id === selectedCategoryId;
    const isFocused = item.category_id === focusedCategoryId;

    return (
      <TouchableOpacity
        style={[
          styles.categoryItem,
          isSelected && styles.categoryItemSelected,
          isFocused && styles.categoryItemFocused
        ]}
        onFocus={() => {
          setFocusedCategoryId(item.category_id);
          setSelectedCategoryId(item.category_id);
        }}
        onBlur={() => setFocusedCategoryId(null)}
        onPress={() => setSelectedCategoryId(item.category_id)}
      >
        <Text style={[
          styles.categoryText,
          (isSelected || isFocused) && styles.categoryTextSelected
        ]} numberOfLines={1}>
          {item.category_name}
        </Text>
      </TouchableOpacity>
    );
  };

  const [focusedChannelId, setFocusedChannelId] = useState<string | number | null>(null);

  const renderChannelCard = ({ item }: ListRenderItemInfo<LiveChannel>) => {
    const isFocused = (item.stream_id || item.series_id) === focusedChannelId;

    return (
      <TouchableOpacity
        style={[styles.channelCard, isFocused && styles.channelCardFocused]}
        onFocus={() => setFocusedChannelId(item.stream_id || item.series_id || null)}
        onBlur={() => setFocusedChannelId(null)}
        onPress={() => handleChannelPress(item)}
        onLongPress={() => handleChannelLongPress(item)}
      >
        <View style={styles.channelImageContainer}>
          {(item.stream_icon || item.cover) ? (
            <Image
              source={{ uri: item.stream_icon || item.cover }}
              style={styles.channelIcon}
              resizeMode="contain"
              defaultSource={require('../../assets/images/placeholder.png')}
            />
          ) : (
            <Tv size={48} color="#444" />
          )}
        </View>
        <Text style={styles.channelName} numberOfLines={2}>
          {item.title || item.name}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderChannelListItem = ({ item }: ListRenderItemInfo<LiveChannel>) => {
    const isFocused = (item.stream_id || item.series_id) === focusedChannelId;
    const epgKey = config?.type === 'm3u' ? item.epg_channel_id : item.epg_channel_id || item.stream_id?.toString();
    const epg = epgData[epgKey] as ParsedProgram[] | undefined;

    let nowProg: ParsedProgram | null = null;
    let nextProg: ParsedProgram | null = null;
    let laterProg: ParsedProgram | null = null;
    let progressWidth = '0%';

    if (epg && epg.length > 0) {
      const nowMs = Date.now();

      const nowIndex = epg.findIndex(p => p.start <= nowMs && p.end > nowMs);
      if (nowIndex !== -1) {
        nowProg = epg[nowIndex];
        nextProg = epg[nowIndex + 1] || null;
        laterProg = epg[nowIndex + 2] || null;

        const total = nowProg.end - nowProg.start;
        const current = nowMs - nowProg.start;
        progressWidth = `${Math.round((current / total) * 100)}%`;
      } else {
        // Find next future program
        const nextIndex = epg.findIndex(p => p.start > nowMs);
        if (nextIndex !== -1) {
          nextProg = epg[nextIndex];
          laterProg = epg[nextIndex + 1] || null;
        }
      }
    }

    return (
      <TouchableOpacity
        style={[styles.channelListItem, isFocused && styles.channelListItemFocused]}
        onFocus={() => setFocusedChannelId(item.stream_id || item.series_id || null)}
        onBlur={() => setFocusedChannelId(null)}
        onPress={() => handleChannelPress(item)}
        onLongPress={() => handleChannelLongPress(item)}
      >
        <View style={styles.channelListImageContainer}>
          {(item.stream_icon || item.cover) ? (
            <Image
              source={{ uri: item.stream_icon || item.cover }}
              style={styles.channelListIcon}
              resizeMode="contain"
              defaultSource={require('../../assets/images/placeholder.png')}
            />
          ) : (
            <Tv size={24} color="#444" />
          )}
        </View>
        <View style={styles.channelListInfo}>
            <Text style={styles.channelListName} numberOfLines={1}>
            {item.title || item.name}
            </Text>

            <View style={styles.timelineRow}>
              {/* NOW Block */}
              <View style={[styles.programBlock, styles.programBlockNow]}>
                {nowProg ? (
                  <>
                    <View style={styles.programProgressBg}>
                      <View style={[styles.programProgressBar, { width: progressWidth as any }]} />
                    </View>
                    <Text style={styles.programTitle} numberOfLines={1}>{nowProg.title_raw}</Text>
                    <Text style={styles.programTime}>{nowProg.start_formatted} - {nowProg.end_formatted}</Text>
                  </>
                ) : (
                  <Text style={styles.noDataText}>No EPG</Text>
                )}
              </View>

              {/* NEXT Block */}
              <View style={styles.programBlock}>
                {nextProg ? (
                  <>
                    <Text style={styles.programTitle} numberOfLines={1}>{nextProg.title_raw}</Text>
                    <Text style={styles.programTime}>{nextProg.start_formatted} - {nextProg.end_formatted}</Text>
                  </>
                ) : null}
              </View>

              {/* LATER Block */}
              <View style={styles.programBlock}>
                {laterProg ? (
                  <>
                    <Text style={styles.programTitle} numberOfLines={1}>{laterProg.title_raw}</Text>
                    <Text style={styles.programTime}>{laterProg.start_formatted} - {laterProg.end_formatted}</Text>
                  </>
                ) : null}
              </View>
            </View>
        </View>
      </TouchableOpacity>
    );
  };

  const [focusedTab, setFocusedTab] = useState<string | null>(null);

  if (loading && categories.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 1. Sidebar */}
      <View style={styles.sidebar}>
        <View style={styles.sidebarTop}>
            <PlaySquare color="#007AFF" size={32} style={styles.sidebarLogo} />

            <TouchableOpacity
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={t('sidebar.live')}
              accessibilityState={{ selected: activeTab === 'live' }}
              style={[
                styles.sidebarItem,
                activeTab === 'live' && styles.sidebarItemSelected,
                focusedTab === 'live' && styles.sidebarItemFocused
              ]}
              onFocus={() => { setFocusedTab('live'); setActiveTab('live'); }}
              onBlur={() => setFocusedTab(null)}
              onPress={() => setActiveTab('live')}
            >
              <Tv color={(activeTab === 'live' || focusedTab === 'live') ? "#FFF" : "#888"} size={24} />
            </TouchableOpacity>

            <TouchableOpacity
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={t('sidebar.movies')}
              accessibilityState={{ selected: activeTab === 'vod' }}
              style={[
                styles.sidebarItem,
                activeTab === 'vod' && styles.sidebarItemSelected,
                focusedTab === 'vod' && styles.sidebarItemFocused
              ]}
              onFocus={() => { setFocusedTab('vod'); setActiveTab('vod'); }}
              onBlur={() => setFocusedTab(null)}
              onPress={() => setActiveTab('vod')}
            >
              <FileVideo color={(activeTab === 'vod' || focusedTab === 'vod') ? "#FFF" : "#888"} size={24} />
            </TouchableOpacity>

            <TouchableOpacity
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={t('sidebar.series')}
              accessibilityState={{ selected: activeTab === 'series' }}
              style={[
                styles.sidebarItem,
                activeTab === 'series' && styles.sidebarItemSelected,
                focusedTab === 'series' && styles.sidebarItemFocused
              ]}
              onFocus={() => { setFocusedTab('series'); setActiveTab('series'); }}
              onBlur={() => setFocusedTab(null)}
              onPress={() => setActiveTab('series')}
            >
              <LayoutList color={(activeTab === 'series' || focusedTab === 'series') ? "#FFF" : "#888"} size={24} />
            </TouchableOpacity>

            <TouchableOpacity
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={t('sidebar.search')}
              style={[
                styles.sidebarItem,
                focusedTab === 'search' && styles.sidebarItemFocused
              ]}
              onFocus={() => setFocusedTab('search')}
              onBlur={() => setFocusedTab(null)}
              onPress={() => navigation.navigate('Search')}
            >
              <Search color={focusedTab === 'search' ? "#FFF" : "#888"} size={24} />
            </TouchableOpacity>
        </View>

        <View style={styles.sidebarBottom}>
            <TouchableOpacity
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Settings"
              style={[
                styles.sidebarItem,
                focusedTab === 'settings' && styles.sidebarItemFocused
              ]}
              onFocus={() => setFocusedTab('settings')}
              onBlur={() => setFocusedTab(null)}
              onPress={() => navigation.navigate('Settings')}
            >
              <Settings color={focusedTab === 'settings' ? "#FFF" : "#888"} size={24} />
            </TouchableOpacity>
        </View>
      </View>

      {/* 2. Categories */}
      <View style={styles.categoriesContainer}>
        <FlatList
          data={visibleCategories}
          keyExtractor={(item) => item.category_id}
          renderItem={renderCategory}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.categoriesList}
        />
      </View>

      {/* 3. Main Content */}
      <View style={styles.mainContent}>
        {!selectedCategoryId ? (
          <View style={styles.emptyContainer}>
            <Clock size={64} color="#444" style={styles.recentlyWatchedIcon} />
            <Text style={styles.recentlyWatchedTitle}>{t('home.recentlyWatched')}</Text>
            <Text style={styles.emptyText}>{t('home.nothingToSeeHere')}</Text>
          </View>
        ) : (
          <View style={styles.channelsContainer}>
            {displayedChannels.length === 0 ? (
              <View style={styles.emptyContainer}>
                <ActivityIndicator size="large" color="#444" />
                <Text style={styles.emptyText}>{t('home.noChannels')}</Text>
              </View>
            ) : (
              activeTab === 'live' ? (
                <View style={styles.liveTvContainer}>
                    <View style={styles.timelineHeader}>
                        <Text style={styles.timelineHeaderText}>Now</Text>
                        <Text style={styles.timelineHeaderText}>Next</Text>
                        <Text style={styles.timelineHeaderText}>Later</Text>
                    </View>
                    <FlatList
                        data={displayedChannels}
                        keyExtractor={(item) => (item.stream_id || item.series_id || Math.random()).toString()}
                        renderItem={renderChannelListItem}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.channelListContent}
                    />
                </View>
              ) : (
                <FlatList
                  data={displayedChannels}
                  keyExtractor={(item) => (item.stream_id || item.series_id || Math.random()).toString()}
                  renderItem={renderChannelCard}
                  numColumns={4}
                  showsVerticalScrollIndicator={false}
                  columnWrapperStyle={styles.channelsRow}
                  contentContainerStyle={styles.channelsGridList}
                />
              )
            )}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#0F0F0F',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F0F0F',
  },

  sidebar: {
    width: 80,
    backgroundColor: '#1C1C1E',
    borderRightWidth: 1,
    borderRightColor: '#2C2C2E',
    alignItems: 'center',
    paddingVertical: 20,
    justifyContent: 'space-between'
  },
  sidebarTop: {
    alignItems: 'center',
    width: '100%',
  },
  sidebarBottom: {
    alignItems: 'center',
    width: '100%',
  },
  sidebarLogo: {
    marginBottom: 40,
  },
  sidebarItem: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  sidebarItemSelected: {
    backgroundColor: '#2C2C2E',
  },
  sidebarItemFocused: {
    backgroundColor: '#007AFF',
    borderWidth: 2,
    borderColor: '#FFF',
  },

  categoriesContainer: {
    width: 250,
    backgroundColor: '#151515',
    borderRightWidth: 1,
    borderRightColor: '#2C2C2E',
  },
  categoriesList: {
    paddingVertical: 20,
    paddingHorizontal: 10,
  },
  categoryItem: {
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: 'transparent',
  },
  categoryItemSelected: {
    backgroundColor: '#2C2C2E',
  },
  categoryItemFocused: {
    backgroundColor: '#007AFF',
  },
  categoryText: {
    color: '#888',
    fontSize: 16,
    fontWeight: '500',
  },
  categoryTextSelected: {
    color: '#FFF',
    fontWeight: 'bold',
  },

  mainContent: {
    flex: 1,
    flexDirection: 'column',
  },
  recentlyWatchedIcon: {
    marginBottom: 20,
  },
  recentlyWatchedTitle: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#888',
    fontSize: 18,
  },
  channelsContainer: {
    flex: 1,
  },

  channelsGridList: {
    padding: 30,
  },
  channelsRow: {
    justifyContent: 'flex-start',
    marginBottom: 30,
  },
  channelCard: {
    width: '23%',
    marginRight: '2.6%',
    backgroundColor: '#1C1C1E',
    borderRadius: 15,
    padding: 15,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  channelCardFocused: {
    borderColor: '#007AFF',
    transform: [{ scale: 1.05 }],
  },
  channelImageContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#2C2C2E',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    overflow: 'hidden',
  },
  channelIcon: {
    width: '100%',
    height: '100%',
  },
  channelName: {
    color: '#FFF',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
  },

  liveTvContainer: {
    flex: 1,
  },
  timelineHeader: {
    flexDirection: 'row',
    paddingVertical: 15,
    paddingHorizontal: 30,
    backgroundColor: '#1A1A1C',
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
    justifyContent: 'space-around',
    marginLeft: 150,
  },
  timelineHeaderText: {
    color: '#888',
    fontSize: 14,
    fontWeight: 'bold',
  },
  channelListContent: {
    padding: 20,
  },
  channelListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 10,
    marginBottom: 10,
    padding: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  channelListItemFocused: {
    borderColor: '#007AFF',
    transform: [{ scale: 1.02 }],
  },
  channelListImageContainer: {
    width: 60,
    height: 60,
    backgroundColor: '#2C2C2E',
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    overflow: 'hidden',
  },
  channelListIcon: {
    width: '100%',
    height: '100%',
  },
  channelListInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  channelListName: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
    width: 150,
    marginRight: 20,
  },
  timelineRow: {
    flex: 1,
    flexDirection: 'row',
  },
  programBlock: {
    flex: 1,
    height: 45,
    backgroundColor: '#2C2C2E',
    borderRadius: 5,
    justifyContent: 'center',
    paddingHorizontal: 10,
    marginRight: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  programBlockNow: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  programProgressBg: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    right: 0,
  },
  programProgressBar: {
    height: '100%',
    backgroundColor: '#007AFF',
    opacity: 0.2,
  },
  programTitle: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: 'bold',
    position: 'relative',
    zIndex: 1,
  },
  programTime: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
    position: 'relative',
    zIndex: 1,
  },
  noDataText: {
    color: '#64748B',
    fontSize: 13,
    fontStyle: 'italic',
  }
});
