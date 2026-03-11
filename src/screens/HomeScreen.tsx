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
  const {
    config,
    categories,
    channels,
    setCategories,
    setChannels,
    epgData,
    setEpgData,
    showAdult,
    updateIntervalHours,
    lastProviderUpdate,
    setLastProviderUpdate,
    lastEpgUpdate,
    setLastEpgUpdate
  } = useAppStore();
  const navigation = useNavigation<NavigationProp>();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'live' | 'vod' | 'series'>('live');
  const [lastFetchedTab, setLastFetchedTab] = useState<'live' | 'vod' | 'series' | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!config) return;

      const needsProviderUpdate = !categories.length || (Date.now() - lastProviderUpdate > updateIntervalHours * 3600000);
      const tabChanged = config.type === 'xtream' && activeTab !== lastFetchedTab;

      if (!needsProviderUpdate && !tabChanged) {
        if (categories.length > 0) {
           setSelectedCategoryId(null);
        }
        return;
      }

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
          setLastFetchedTab(activeTab);
          setSelectedCategoryId(null);
        } else if (config.type === 'm3u') {
          const m3uService = new M3UService(config);
          const m3uData = await m3uService.parsePlaylist();
          setCategories(m3uData.categories);
          setChannels(m3uData.channels);
          setSelectedCategoryId(null);
        }
        setLastProviderUpdate(Date.now());
      } catch (error) {
        console.error('Failed to load data:', error instanceof Error ? error.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    if (config) {
      fetchData();
    }
  }, [config, setCategories, setChannels, activeTab, lastFetchedTab]);

  const visibleCategories = useMemo(() => {
    return categories.filter(c => showAdult || (String(c.adult) !== '1' && String(c.is_adult) !== '1'));
  }, [categories, showAdult]);

  useEffect(() => {
    const fetchFullEpg = async () => {
      if (!config) return;

      const needsEpgUpdate = Object.keys(epgData).length === 0 || (Date.now() - lastEpgUpdate > updateIntervalHours * 3600000);
      if (!needsEpgUpdate) return;

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
             setLastEpgUpdate(Date.now());
          }
        }
      } catch (err) {
        console.error('Failed to load full EPG:', err);
      }
    };

    fetchFullEpg();
  }, [config, epgData, setEpgData, updateIntervalHours, lastEpgUpdate, setLastEpgUpdate]);

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
      navigation.navigate('LivePlayer', {
        channelId: channel.stream_id,
        channelName: channel.title || channel.name,
        extension: extension,
        directSource: channel.direct_source,
        type: activeTab
      });
    } else if (activeTab === 'vod' || activeTab === 'series') {
      extension = channel.container_extension || 'mp4';
      if ((Platform.OS === 'web' || Platform.OS === 'ios') && extension === 'mkv') {
        extension = 'mp4';
      }
      navigation.navigate('MediaInfo', {
        id: activeTab === 'series' ? (channel.series_id as number) : channel.stream_id,
        type: activeTab,
        title: channel.title || channel.name,
        cover: channel.cover || channel.stream_icon,
        extension: extension
      });
    }
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

  const timelineStart = useMemo(() => {
    const now = new Date();
    // Start timeline 30 minutes before current time, rounded to previous half hour
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes() < 30 ? 0 : 30, 0, 0);
    start.setMinutes(start.getMinutes() - 30);
    return start.getTime();
  }, []);

  // 6 hour timeline window
  const TIMELINE_DURATION = 6 * 60 * 60 * 1000;
  const timelineEnd = timelineStart + TIMELINE_DURATION;

  const timeMarkers = useMemo(() => {
    const markers = [];
    for (let i = 0; i < 7; i++) {
      const markerTime = new Date(timelineStart + i * 60 * 60 * 1000);
      markers.push({
        time: markerTime.getTime(),
        label: `${markerTime.getHours().toString().padStart(2, '0')}:${markerTime.getMinutes().toString().padStart(2, '0')}`
      });
    }
    return markers;
  }, [timelineStart]);

  const [nowTime, setNowTime] = useState(Date.now());

  useEffect(() => {
    // Update the current time indicator every minute
    const interval = setInterval(() => {
      setNowTime(Date.now());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const currentProgressPercent = ((nowTime - timelineStart) / TIMELINE_DURATION) * 100;

  const renderChannelListItem = ({ item }: ListRenderItemInfo<LiveChannel>) => {
    const isFocused = (item.stream_id || item.series_id) === focusedChannelId;
    const epgKey = config?.type === 'm3u' ? item.epg_channel_id : item.epg_channel_id || item.stream_id?.toString();
    const epg = epgData[epgKey] as ParsedProgram[] | undefined;

    let nowProg: ParsedProgram | null = null;
    let visibleEpg: ParsedProgram[] = [];

    if (epg && epg.length > 0) {
      const nowMs = Date.now();
      const nowIndex = epg.findIndex(p => p.start <= nowMs && p.end > nowMs);
      if (nowIndex !== -1) {
        nowProg = epg[nowIndex];
      }

      visibleEpg = epg.filter(p => p.end > timelineStart && p.start < timelineEnd);
    }

    return (
      <TouchableOpacity
        style={[styles.channelListItem, isFocused && styles.channelListItemFocused]}
        onFocus={() => setFocusedChannelId(item.stream_id || item.series_id || null)}
        onBlur={() => setFocusedChannelId(null)}
        onPress={() => handleChannelPress(item)}
        onLongPress={() => handleChannelLongPress(item)}
      >
        {/* Left Pane (Logo, Channel Info) */}
        <View style={styles.channelListLeftPane}>
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
            {nowProg && (
              <Text style={styles.channelListNowProgram} numberOfLines={1}>
                {nowProg.title_raw}
              </Text>
            )}
          </View>
        </View>

        {/* Right Pane (Continuous Timeline) */}
        <View style={styles.timelineRow}>
            {visibleEpg.map((prog, index) => {
              // Calculate positioning
              const startPos = Math.max(timelineStart, prog.start);
              const endPos = Math.min(timelineEnd, prog.end);
              const leftPercent = ((startPos - timelineStart) / TIMELINE_DURATION) * 100;
              const widthPercent = ((endPos - startPos) / TIMELINE_DURATION) * 100;

              if (widthPercent <= 0) return null;

              const isNow = prog.start <= nowTime && prog.end > nowTime;

              return (
                <View
                  key={`${prog.start}-${index}`}
                  style={[
                    styles.programBlockTimeline,
                    { left: `${leftPercent}%`, width: `${widthPercent}%` },
                    isNow && styles.programBlockTimelineNow
                  ]}
                >
                  <Text style={[styles.programTitleTimeline, isNow && styles.programTitleTimelineNow]} numberOfLines={1}>
                    <Text style={[styles.programTimeTimeline, isNow && styles.programTimeTimelineNow]}>
                      {prog.start_formatted || formatProgramTime(prog.start)}{' '}
                    </Text>
                    {prog.title_raw}
                  </Text>
                </View>
              );
            })}
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
                        <View style={styles.channelListLeftPaneHeader} />
                        <View style={styles.timelineHeaderMarkers}>
                          {timeMarkers.map((marker, idx) => (
                            <View key={idx} style={[styles.timeMarker, { left: `${((marker.time - timelineStart) / TIMELINE_DURATION) * 100}%` }]}>
                              <Text style={styles.timelineHeaderText}>{marker.label}</Text>
                            </View>
                          ))}
                        </View>
                    </View>
                    <View style={styles.timelineContainer}>
                      {currentProgressPercent >= 0 && currentProgressPercent <= 100 && (
                        <View style={[styles.currentTimeIndicator, { left: `${currentProgressPercent}%`, marginLeft: 250 }]} />
                      )}
                      <FlatList
                          data={displayedChannels}
                          keyExtractor={(item) => (item.stream_id || item.series_id || Math.random()).toString()}
                          renderItem={renderChannelListItem}
                          showsVerticalScrollIndicator={false}
                          contentContainerStyle={styles.channelListContent}
                      />
                    </View>
                </View>
              ) : (
                <FlatList
                  key={`grid-${activeTab}`}
                  data={displayedChannels}
                  keyExtractor={(item) => (item.stream_id || item.series_id || Math.random()).toString()}
                  renderItem={renderChannelCard}
                  numColumns={3}
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
    width: '31%',
    marginRight: '3%',
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
    height: 50,
    backgroundColor: '#1A1A1C',
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
    alignItems: 'center',
  },
  timelineHeaderMarkers: {
    flex: 1,
    flexDirection: 'row',
    position: 'relative',
    height: '100%',
    marginLeft: 250,
  },
  timeMarker: {
    position: 'absolute',
    borderLeftWidth: 1,
    borderLeftColor: '#2C2C2E',
    height: '100%',
    paddingLeft: 10,
    justifyContent: 'center',
  },
  timelineHeaderText: {
    color: '#888',
    fontSize: 14,
    fontWeight: 'bold',
  },
  timelineContainer: {
    flex: 1,
    position: 'relative',
  },
  currentTimeIndicator: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#FF453A',
    zIndex: 10,
  },
  channelListContent: {
    padding: 0,
  },
  channelListItem: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: '#1C1C1E',
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
    height: 80,
  },
  channelListItemFocused: {
    backgroundColor: '#2C2C2E',
  },
  channelListLeftPaneHeader: {
    width: 250,
    borderRightWidth: 1,
    borderRightColor: '#2C2C2E',
    height: '100%',
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 1,
    backgroundColor: '#1A1A1C',
  },
  channelListLeftPane: {
    width: 250,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRightWidth: 1,
    borderRightColor: '#2C2C2E',
    backgroundColor: '#1C1C1E',
    zIndex: 2,
  },
  channelListImageContainer: {
    width: 50,
    height: 50,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  channelListIcon: {
    width: '100%',
    height: '100%',
  },
  channelListInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  channelListName: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  channelListNowProgram: {
    color: '#888',
    fontSize: 12,
  },
  timelineRow: {
    flex: 1,
    position: 'relative',
  },
  programBlockTimeline: {
    position: 'absolute',
    top: 5,
    bottom: 5,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#1C1C1E',
  },
  programBlockTimelineNow: {
    backgroundColor: '#1E3A8A', // Dark blue
    borderColor: '#3B82F6', // Lighter blue border
  },
  programTitleTimeline: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: 'bold',
  },
  programTitleTimelineNow: {
    color: '#FFF',
  },
  programTimeTimeline: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: 'normal',
  },
  programTimeTimelineNow: {
    color: '#93C5FD',
  },
  noDataText: {
    color: '#64748B',
    fontSize: 13,
    fontStyle: 'italic',
  }
});
