import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Image,
  ActivityIndicator, ListRenderItemInfo, Platform, Dimensions, ScrollView, RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { useAppStore } from '../store';
import { XtreamService } from '../services/xtream';
import { M3UService } from '../services/m3u';
import {
  XMLTVParser,
  parseXmltvDate,
  formatProgramTime,
  findProgramsInRange
} from '../services/xmltv';
import { Category, LiveChannel, ParsedProgram } from '../types/iptv';
import { Tv, PlaySquare, FileVideo, LayoutList, Search, Settings, Clock, Heart, Play } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { isTV, isMobile, adaptiveValue, gridColumns } from '../utils/platform';
import { getEpgKey, getCurrentProgram } from '../utils/epg';
import { ChannelLogo } from '../components/ChannelLogo';
import { ChannelListSkeleton, GridSkeleton, HorizontalRowSkeleton } from '../components/SkeletonLoader';
import { showToast } from '../components/Toast';

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
    setLastEpgUpdate,
    isDiskDataLoaded,
    favorites,
    addFavorite,
    removeFavorite,
    recentlyWatched,
    addRecentlyWatched,
  } = useAppStore();
  const navigation = useNavigation<NavigationProp>();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'live' | 'vod' | 'series'>('live');
  const [lastFetchedTab, setLastFetchedTab] = useState<'live' | 'vod' | 'series' | null>(null);
  const [numColumns, setNumColumns] = useState(gridColumns());
  const [refreshing, setRefreshing] = useState(false);

  // Listen for dimension changes (rotation)
  useEffect(() => {
    const sub = Dimensions.addEventListener('change', () => {
      setNumColumns(gridColumns());
    });
    return () => sub?.remove();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!config || !isDiskDataLoaded) return;

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
  }, [config, setCategories, setChannels, activeTab, lastFetchedTab, isDiskDataLoaded, categories.length, lastProviderUpdate, setLastProviderUpdate, updateIntervalHours]);

  const visibleCategories = useMemo(() => {
    return categories.filter(c => showAdult || (String(c.adult) !== '1' && String(c.is_adult) !== '1'));
  }, [categories, showAdult]);

  useEffect(() => {
    const fetchFullEpg = async () => {
      if (!config || !isDiskDataLoaded) return;

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
  }, [config, epgData, setEpgData, updateIntervalHours, lastEpgUpdate, setLastEpgUpdate, isDiskDataLoaded]);

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

  const handleChannelPress = useCallback((channel: LiveChannel) => {
    if (activeTab === 'live' && channel.stream_type === 'live') {
      // HLS (m3u8) for ALL platforms – enables Adaptive Bitrate Streaming
      const liveExtension = 'm3u8';
      navigation.navigate('LivePlayer', {
        channelId: channel.stream_id,
        channelName: channel.title || channel.name,
        extension: liveExtension,
        directSource: channel.direct_source,
        type: activeTab
      });
    } else if (activeTab === 'vod' || activeTab === 'series') {
      let extension = channel.container_extension || 'mp4';
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
  }, [activeTab, config, navigation]);

  const handleChannelLongPress = useCallback((channel: LiveChannel) => {
    navigation.navigate('Epg', {
      channelId: getEpgKey(channel, config?.type)
    });
  }, [config, navigation]);

  // ── Favorites toggle ──
  const toggleFavorite = useCallback((channel: LiveChannel) => {
    const itemId = activeTab === 'series' ? (channel.series_id || channel.stream_id) : channel.stream_id;
    const isFav = favorites.some(f => f.id === itemId);
    if (isFav) {
      removeFavorite(itemId);
      showToast('Removed from favorites', 'info');
    } else {
      addFavorite({
        id: itemId,
        type: activeTab,
        name: channel.title || channel.name,
        icon: channel.cover || channel.stream_icon,
        categoryId: channel.category_id,
        addedAt: Date.now(),
      });
      showToast('Added to favorites', 'success');
    }
  }, [activeTab, favorites, addFavorite, removeFavorite]);

  // ── Track recently watched when pressing a channel ──
  const handleChannelPressWithTracking = useCallback((channel: LiveChannel) => {
    const itemId = activeTab === 'series' ? (channel.series_id || channel.stream_id) : channel.stream_id;
    addRecentlyWatched({
      id: itemId,
      type: activeTab === 'live' ? 'live' : activeTab,
      name: channel.title || channel.name,
      icon: channel.cover || channel.stream_icon,
      extension: activeTab === 'live' ? 'm3u8' : (channel.container_extension || 'mp4'),
      directSource: channel.direct_source,
      lastWatchedAt: Date.now(),
    });
    handleChannelPress(channel);
  }, [activeTab, addRecentlyWatched, handleChannelPress]);

  // ── Navigate from recently watched item ──
  const handleRecentPress = useCallback((item: RecentlyWatchedItem) => {
    if (item.type === 'live') {
      navigation.navigate('LivePlayer', {
        channelId: item.id as number,
        channelName: item.name,
        extension: item.extension || 'm3u8',
        directSource: item.directSource,
        type: 'live',
      });
    } else {
      navigation.navigate('MediaInfo', {
        id: item.id as number,
        type: item.type,
        title: item.name,
        cover: item.icon,
        extension: item.extension,
      });
    }
  }, [navigation]);

  // ── Navigate from favorite item ──
  const handleFavoritePress = useCallback((item: FavoriteItem) => {
    if (item.type === 'live') {
      navigation.navigate('LivePlayer', {
        channelId: item.id as number,
        channelName: item.name,
        extension: 'm3u8',
        type: 'live',
      });
    } else {
      navigation.navigate('MediaInfo', {
        id: item.id as number,
        type: item.type,
        title: item.name,
        cover: item.icon,
      });
    }
  }, [navigation]);

  // ── Pull-to-refresh handler ──
  const onRefresh = useCallback(async () => {
    if (!config) return;
    setRefreshing(true);
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
        setLastProviderUpdate(Date.now());
      } else if (config.type === 'm3u') {
        const m3uService = new M3UService(config);
        const m3uData = await m3uService.parsePlaylist();
        setCategories(m3uData.categories);
        setChannels(m3uData.channels);
      }
      showToast('Content refreshed', 'success');
    } catch (error) {
      showToast('Refresh failed', 'error');
      console.error('Refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  }, [config, activeTab, setCategories, setChannels, setLastProviderUpdate]);

  const displayedChannels = useMemo(() => {
    if (!selectedCategoryId) return [];
    return config?.type === 'm3u'
      ? channels.filter(c => c.category_id === selectedCategoryId)
      : channels;
  }, [config?.type, channels, selectedCategoryId]);

  // ─── TV-specific state ──────────────────────────────────────────
  const [focusedCategoryId, setFocusedCategoryId] = useState<string | null>(null);
  const [focusedChannelId, setFocusedChannelId] = useState<string | number | null>(null);
  const [focusedTab, setFocusedTab] = useState<string | null>(null);

  // ─── Timeline state (TV live view) ─────────────────────────────
  const timelineStart = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes() < 30 ? 0 : 30, 0, 0);
    start.setMinutes(start.getMinutes() - 30);
    return start.getTime();
  }, []);

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
    const interval = setInterval(() => {
      setNowTime(Date.now());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const currentProgressPercent = ((nowTime - timelineStart) / TIMELINE_DURATION) * 100;

  // ─── Renderers ──────────────────────────────────────────────────

  const renderCategory = ({ item }: ListRenderItemInfo<Category>) => {
    const isSelected = item.category_id === selectedCategoryId;
    const isFocused = item.category_id === focusedCategoryId;

    if (isMobile) {
      return (
        <TouchableOpacity
          style={[mobileStyles.categoryChip, isSelected && mobileStyles.categoryChipSelected]}
          onPress={() => setSelectedCategoryId(item.category_id)}
          activeOpacity={0.7}
        >
          <Text style={[mobileStyles.categoryChipText, isSelected && mobileStyles.categoryChipTextSelected]} numberOfLines={1}>
            {item.category_name}
          </Text>
        </TouchableOpacity>
      );
    }

    // TV layout
    return (
      <TouchableOpacity
        style={[
          tvStyles.categoryItem,
          isSelected && tvStyles.categoryItemSelected,
          isFocused && tvStyles.categoryItemFocused
        ]}
        onFocus={() => {
          setFocusedCategoryId(item.category_id);
          setSelectedCategoryId(item.category_id);
        }}
        onBlur={() => setFocusedCategoryId(null)}
        onPress={() => setSelectedCategoryId(item.category_id)}
      >
        <Text style={[
          tvStyles.categoryText,
          (isSelected || isFocused) && tvStyles.categoryTextSelected
        ]} numberOfLines={1}>
          {item.category_name}
        </Text>
      </TouchableOpacity>
    );
  };

  // ─── Mobile channel card ────────────────────────────────────────
  const renderMobileChannelCard = ({ item }: ListRenderItemInfo<LiveChannel>) => {
    const epgKey = getEpgKey(item, config?.type);
    const epg = epgData[epgKey] as ParsedProgram[] | undefined;
    const nowProg: ParsedProgram | null = getCurrentProgram(epg, nowTime);

    if (activeTab === 'live') {
      // List item for live
      return (
        <TouchableOpacity
          style={mobileStyles.liveChannelItem}
          onPress={() => handleChannelPressWithTracking(item)}
          onLongPress={() => handleChannelLongPress(item)}
          activeOpacity={0.7}
        >
          <View style={mobileStyles.liveChannelIcon}>
            <ChannelLogo
              uri={item.stream_icon || item.cover}
              name={item.title || item.name || 'CH'}
              size={44}
              borderRadius={22}
            />
          </View>
          <View style={mobileStyles.liveChannelInfo}>
            <Text style={mobileStyles.liveChannelName} numberOfLines={1}>
              {item.title || item.name}
            </Text>
            {nowProg && (
              <View style={mobileStyles.epgRow}>
                <View style={mobileStyles.epgProgressBarBg}>
                  <View style={[mobileStyles.epgProgressBarFill, {
                    width: `${Math.min(100, Math.max(0, ((nowTime - nowProg.start) / (nowProg.end - nowProg.start)) * 100))}%`
                  }]} />
                </View>
                <Text style={mobileStyles.liveChannelNow} numberOfLines={1}>
                  {formatProgramTime(nowProg.start)} – {nowProg.title_raw}
                </Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            style={mobileStyles.favButton}
            onPress={() => toggleFavorite(item)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Heart size={20} color={isFav ? '#FF453A' : '#555'} fill={isFav ? '#FF453A' : 'none'} />
          </TouchableOpacity>
        </TouchableOpacity>
      );
    }

    // Grid card for VOD / Series
    return (
      <TouchableOpacity
        style={mobileStyles.gridCard}
        onPress={() => handleChannelPressWithTracking(item)}
        activeOpacity={0.7}
      >
        <View style={mobileStyles.gridCardImage}>
          {(item.stream_icon || item.cover) ? (
            <Image
              source={{ uri: item.stream_icon || item.cover }}
              style={mobileStyles.gridCardImg}
              resizeMode="cover"
            />
          ) : (
            <Tv size={32} color="#444" />
          )}
          <TouchableOpacity
            style={mobileStyles.gridFavButton}
            onPress={() => toggleFavorite(item)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Heart size={16} color={isFav ? '#FF453A' : '#FFF'} fill={isFav ? '#FF453A' : 'none'} />
          </TouchableOpacity>
        </View>
        <Text style={mobileStyles.gridCardTitle} numberOfLines={2}>
          {item.title || item.name}
        </Text>
      </TouchableOpacity>
    );
  };

  // ─── TV channel card (grid for VOD/series) ─────────────────────
  const renderTVChannelCard = ({ item }: ListRenderItemInfo<LiveChannel>) => {
    const isFocused = (item.stream_id || item.series_id) === focusedChannelId;

    return (
      <TouchableOpacity
        style={[tvStyles.channelCard, isFocused && tvStyles.channelCardFocused]}
        onFocus={() => setFocusedChannelId(item.stream_id || item.series_id || null)}
        onBlur={() => setFocusedChannelId(null)}
        onPress={() => handleChannelPress(item)}
        onLongPress={() => handleChannelLongPress(item)}
      >
        <View style={tvStyles.channelImageContainer}>
          {(item.stream_icon || item.cover) ? (
            <Image
              source={{ uri: item.stream_icon || item.cover }}
              style={tvStyles.channelIcon}
              resizeMode="contain"
              defaultSource={require('../../assets/images/placeholder.png')}
            />
          ) : (
            <Tv size={48} color="#444" />
          )}
        </View>
        <Text style={tvStyles.channelName} numberOfLines={2}>
          {item.title || item.name}
        </Text>
      </TouchableOpacity>
    );
  };

  // ─── TV live channel list item with timeline ────────────────────
  const renderTVChannelListItem = ({ item }: ListRenderItemInfo<LiveChannel>) => {
    const isFocused = (item.stream_id || item.series_id) === focusedChannelId;
    const epgKey = getEpgKey(item, config?.type);
    const epg = epgData[epgKey] as ParsedProgram[] | undefined;

    let visibleEpg: ParsedProgram[] = [];
    const nowProg = getCurrentProgram(epg, nowTime);

    if (epg && epg.length > 0) {
      visibleEpg = findProgramsInRange(epg, timelineStart, timelineEnd);
    }

    return (
      <TouchableOpacity
        style={[tvStyles.channelListItem, isFocused && tvStyles.channelListItemFocused]}
        onFocus={() => setFocusedChannelId(item.stream_id || item.series_id || null)}
        onBlur={() => setFocusedChannelId(null)}
        onPress={() => handleChannelPress(item)}
        onLongPress={() => handleChannelLongPress(item)}
      >
        <View style={tvStyles.channelListLeftPane}>
          <View style={tvStyles.channelListImageContainer}>
            {(item.stream_icon || item.cover) ? (
              <Image
                source={{ uri: item.stream_icon || item.cover }}
                style={tvStyles.channelListIcon}
                resizeMode="contain"
                defaultSource={require('../../assets/images/placeholder.png')}
              />
            ) : (
              <Tv size={24} color="#444" />
            )}
          </View>
          <View style={tvStyles.channelListInfo}>
            <Text style={tvStyles.channelListName} numberOfLines={1}>
              {item.title || item.name}
            </Text>
            {nowProg && (
              <Text style={tvStyles.channelListNowProgram} numberOfLines={1}>
                {nowProg.title_raw}
              </Text>
            )}
          </View>
        </View>

        <View style={tvStyles.timelineRow}>
            {visibleEpg.map((prog, index) => {
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
                    tvStyles.programBlockTimeline,
                    { left: `${leftPercent}%`, width: `${widthPercent}%` },
                    isNow && tvStyles.programBlockTimelineNow
                  ]}
                >
                  <Text style={[tvStyles.programTitleTimeline, isNow && tvStyles.programTitleTimelineNow]} numberOfLines={1}>
                    <Text style={[tvStyles.programTimeTimeline, isNow && tvStyles.programTimeTimelineNow]}>
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

  // ─── Loading state ──────────────────────────────────────────────
  if (loading && categories.length === 0) {
    return (
      <View style={sharedStyles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  //  MOBILE LAYOUT
  // ═══════════════════════════════════════════════════════════════
  if (isMobile) {
    return (
      <View style={mobileStyles.container}>
        {/* Content type tabs */}
        <View style={mobileStyles.tabBar}>
          {(['live', 'vod', 'series'] as const).map(tab => (
            <TouchableOpacity
              key={tab}
              style={[mobileStyles.tab, activeTab === tab && mobileStyles.tabActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.7}
            >
              {tab === 'live' && <Tv color={activeTab === tab ? '#FFF' : '#888'} size={18} />}
              {tab === 'vod' && <FileVideo color={activeTab === tab ? '#FFF' : '#888'} size={18} />}
              {tab === 'series' && <LayoutList color={activeTab === tab ? '#FFF' : '#888'} size={18} />}
              <Text style={[mobileStyles.tabText, activeTab === tab && mobileStyles.tabTextActive]}>
                {tab === 'live' ? t('sidebar.live') : tab === 'vod' ? t('sidebar.movies') : t('sidebar.series')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Horizontal category chips */}
        <FlatList
          data={visibleCategories}
          keyExtractor={(item) => item.category_id}
          renderItem={renderCategory}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={mobileStyles.categoryList}
          style={mobileStyles.categoryListContainer}
        />

        {/* Channel list / grid */}
        {!selectedCategoryId ? (
          <ScrollView
            style={mobileStyles.homeScrollContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#007AFF"
                colors={['#007AFF']}
              />
            }
          >
            {/* Favorites Row */}
            {favorites.length > 0 && (
              <View style={mobileStyles.homeSection}>
                <View style={mobileStyles.homeSectionHeader}>
                  <Heart size={18} color="#FF453A" fill="#FF453A" />
                  <Text style={mobileStyles.homeSectionTitle}>Favorites</Text>
                </View>
                <FlatList
                  data={favorites}
                  keyExtractor={(item) => `fav-${item.id}`}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={mobileStyles.horizontalListContent}
                  renderItem={({ item: fav }) => (
                    <TouchableOpacity
                      style={mobileStyles.homeCard}
                      onPress={() => handleFavoritePress(fav)}
                      activeOpacity={0.7}
                    >
                      <View style={mobileStyles.homeCardImage}>
                        {fav.icon ? (
                          <Image source={{ uri: fav.icon }} style={mobileStyles.homeCardImg} resizeMode="cover" />
                        ) : (
                          <View style={mobileStyles.homeCardPlaceholder}>
                            <Text style={mobileStyles.homeCardInitial}>{fav.name.charAt(0).toUpperCase()}</Text>
                          </View>
                        )}
                        {fav.type === 'live' && (
                          <View style={mobileStyles.liveBadge}>
                            <Text style={mobileStyles.liveBadgeText}>LIVE</Text>
                          </View>
                        )}
                      </View>
                      <Text style={mobileStyles.homeCardTitle} numberOfLines={2}>{fav.name}</Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            )}

            {/* Recently Watched / Continue Watching Row */}
            {recentlyWatched.length > 0 && (
              <View style={mobileStyles.homeSection}>
                <View style={mobileStyles.homeSectionHeader}>
                  <Clock size={18} color="#007AFF" />
                  <Text style={mobileStyles.homeSectionTitle}>{t('home.recentlyWatched')}</Text>
                </View>
                <FlatList
                  data={recentlyWatched.slice(0, 20)}
                  keyExtractor={(item) => `recent-${item.id}-${item.lastWatchedAt}`}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={mobileStyles.horizontalListContent}
                  renderItem={({ item: recent }) => (
                    <TouchableOpacity
                      style={mobileStyles.homeCard}
                      onPress={() => handleRecentPress(recent)}
                      activeOpacity={0.7}
                    >
                      <View style={mobileStyles.homeCardImage}>
                        {recent.icon ? (
                          <Image source={{ uri: recent.icon }} style={mobileStyles.homeCardImg} resizeMode="cover" />
                        ) : (
                          <View style={mobileStyles.homeCardPlaceholder}>
                            <Text style={mobileStyles.homeCardInitial}>{recent.name.charAt(0).toUpperCase()}</Text>
                          </View>
                        )}
                        {recent.position && recent.duration && recent.duration > 0 && (
                          <View style={mobileStyles.progressOverlay}>
                            <View style={[mobileStyles.progressBar, { width: `${Math.min(100, (recent.position / recent.duration) * 100)}%` }]} />
                          </View>
                        )}
                        <View style={mobileStyles.playOverlay}>
                          <Play size={24} color="#FFF" fill="#FFF" />
                        </View>
                      </View>
                      <Text style={mobileStyles.homeCardTitle} numberOfLines={2}>{recent.name}</Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            )}

            {/* Empty state when no favorites and no recent */}
            {favorites.length === 0 && recentlyWatched.length === 0 && (
              <View style={[sharedStyles.centerContainer, { paddingTop: 80 }]}>
                <Clock size={48} color="#444" />
                <Text style={mobileStyles.emptyTitle}>{t('home.recentlyWatched')}</Text>
                <Text style={mobileStyles.emptyText}>{t('home.nothingToSeeHere')}</Text>
              </View>
            )}
          </ScrollView>
        ) : displayedChannels.length === 0 ? (
          <View style={sharedStyles.centerContainer}>
            {loading ? (
              activeTab === 'live' ? <ChannelListSkeleton count={8} /> : <GridSkeleton count={6} />
            ) : (
              <>
                <Tv size={48} color="#444" />
                <Text style={mobileStyles.emptyText}>{t('home.noChannels')}</Text>
              </>
            )}
          </View>
        ) : activeTab === 'live' ? (
          <FlatList
            data={displayedChannels}
            keyExtractor={(item) => (item.stream_id || item.series_id || Math.random()).toString()}
            renderItem={renderMobileChannelCard}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={mobileStyles.channelListContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#007AFF"
                colors={['#007AFF']}
              />
            }
          />
        ) : (
          <FlatList
            key={`mobile-grid-${activeTab}-${numColumns}`}
            data={displayedChannels}
            keyExtractor={(item) => (item.stream_id || item.series_id || Math.random()).toString()}
            renderItem={renderMobileChannelCard}
            numColumns={numColumns}
            showsVerticalScrollIndicator={false}
            columnWrapperStyle={mobileStyles.gridRow}
            contentContainerStyle={mobileStyles.gridContent}
          />
        )}
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  //  TV LAYOUT (original – completely preserved)
  // ═══════════════════════════════════════════════════════════════
  return (
    <View style={tvStyles.container}>
      {/* 1. Sidebar */}
      <View style={tvStyles.sidebar}>
        <View style={tvStyles.sidebarTop}>
            <PlaySquare color="#007AFF" size={32} style={tvStyles.sidebarLogo} />

            <TouchableOpacity
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={t('sidebar.live')}
              accessibilityState={{ selected: activeTab === 'live' }}
              style={[
                tvStyles.sidebarItem,
                activeTab === 'live' && tvStyles.sidebarItemSelected,
                focusedTab === 'live' && tvStyles.sidebarItemFocused
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
                tvStyles.sidebarItem,
                activeTab === 'vod' && tvStyles.sidebarItemSelected,
                focusedTab === 'vod' && tvStyles.sidebarItemFocused
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
                tvStyles.sidebarItem,
                activeTab === 'series' && tvStyles.sidebarItemSelected,
                focusedTab === 'series' && tvStyles.sidebarItemFocused
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
                tvStyles.sidebarItem,
                focusedTab === 'search' && tvStyles.sidebarItemFocused
              ]}
              onFocus={() => setFocusedTab('search')}
              onBlur={() => setFocusedTab(null)}
              onPress={() => navigation.navigate('Search')}
            >
              <Search color={focusedTab === 'search' ? "#FFF" : "#888"} size={24} />
            </TouchableOpacity>
        </View>

        <View style={tvStyles.sidebarBottom}>
            <TouchableOpacity
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Settings"
              style={[
                tvStyles.sidebarItem,
                focusedTab === 'settings' && tvStyles.sidebarItemFocused
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
      <View style={tvStyles.categoriesContainer}>
        <FlatList
          data={visibleCategories}
          keyExtractor={(item) => item.category_id}
          renderItem={renderCategory}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={tvStyles.categoriesList}
        />
      </View>

      {/* 3. Main Content */}
      <View style={tvStyles.mainContent}>
        {!selectedCategoryId ? (
          <View style={sharedStyles.centerContainer}>
            <Clock size={64} color="#444" style={tvStyles.recentlyWatchedIcon} />
            <Text style={tvStyles.recentlyWatchedTitle}>{t('home.recentlyWatched')}</Text>
            <Text style={tvStyles.emptyText}>{t('home.nothingToSeeHere')}</Text>
          </View>
        ) : (
          <View style={tvStyles.channelsContainer}>
            {displayedChannels.length === 0 ? (
              <View style={sharedStyles.centerContainer}>
                <ActivityIndicator size="large" color="#444" />
                <Text style={tvStyles.emptyText}>{t('home.noChannels')}</Text>
              </View>
            ) : (
              activeTab === 'live' ? (
                <View style={tvStyles.liveTvContainer}>
                    <View style={tvStyles.timelineHeader}>
                        <View style={tvStyles.channelListLeftPaneHeader} />
                        <View style={tvStyles.timelineHeaderMarkers}>
                          {timeMarkers.map((marker, idx) => (
                            <View key={idx} style={[tvStyles.timeMarker, { left: `${((marker.time - timelineStart) / TIMELINE_DURATION) * 100}%` }]}>
                              <Text style={tvStyles.timelineHeaderText}>{marker.label}</Text>
                            </View>
                          ))}
                        </View>
                    </View>
                    <View style={tvStyles.timelineContainer}>
                      {currentProgressPercent >= 0 && currentProgressPercent <= 100 && (
                        <View style={[tvStyles.currentTimeIndicator, { left: `${currentProgressPercent}%`, marginLeft: 250 }]} />
                      )}
                      <FlatList
                          data={displayedChannels}
                          keyExtractor={(item) => (item.stream_id || item.series_id || Math.random()).toString()}
                          renderItem={renderTVChannelListItem}
                          showsVerticalScrollIndicator={false}
                          contentContainerStyle={tvStyles.channelListContent}
                      />
                    </View>
                </View>
              ) : (
                <FlatList
                  key={`grid-${activeTab}`}
                  data={displayedChannels}
                  keyExtractor={(item) => (item.stream_id || item.series_id || Math.random()).toString()}
                  renderItem={renderTVChannelCard}
                  numColumns={3}
                  showsVerticalScrollIndicator={false}
                  columnWrapperStyle={tvStyles.channelsRow}
                  contentContainerStyle={tvStyles.channelsGridList}
                />
              )
            )}
          </View>
        )}
      </View>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════
//  SHARED STYLES
// ═══════════════════════════════════════════════════════════════════
const sharedStyles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F0F0F',
  },
});

// ═══════════════════════════════════════════════════════════════════
//  MOBILE STYLES
// ═══════════════════════════════════════════════════════════════════
const mobileStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },
  // ── Tab bar ──
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  tabActive: {
    backgroundColor: '#007AFF',
  },
  tabText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#FFF',
  },
  // ── Category chips ──
  categoryListContainer: {
    maxHeight: 52,
    backgroundColor: '#151515',
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  categoryList: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#2C2C2E',
    marginRight: 0,
  },
  categoryChipSelected: {
    backgroundColor: '#007AFF',
  },
  categoryChipText: {
    color: '#888',
    fontSize: 13,
    fontWeight: '600',
  },
  categoryChipTextSelected: {
    color: '#FFF',
  },
  // ── Empty state ──
  emptyTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyText: {
    color: '#888',
    fontSize: 14,
  },
  // ── Live channel list ──
  channelListContent: {
    paddingBottom: 20,
  },
  liveChannelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1C1C1E',
  },
  liveChannelIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginRight: 12,
  },
  liveChannelImage: {
    width: '100%',
    height: '100%',
  },
  liveChannelInfo: {
    flex: 1,
  },
  liveChannelName: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  liveChannelNow: {
    color: '#888',
    fontSize: 12,
  },
  // ── Grid (VOD / Series) ──
  gridContent: {
    padding: 12,
  },
  gridRow: {
    justifyContent: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  gridCard: {
    flex: 1,
    maxWidth: '48%',
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    overflow: 'hidden',
  },
  gridCardImage: {
    width: '100%',
    aspectRatio: 2 / 3,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridCardImg: {
    width: '100%',
    height: '100%',
  },
  gridCardTitle: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '500',
    padding: 8,
    textAlign: 'center',
  },
  // ── Favorites & Recently Watched ──
  homeScrollContainer: {
    flex: 1,
  },
  homeSection: {
    marginTop: 20,
    marginBottom: 8,
  },
  homeSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  homeSectionTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  horizontalListContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  homeCard: {
    width: 130,
  },
  homeCardImage: {
    width: 130,
    height: 180,
    borderRadius: 10,
    backgroundColor: '#2C2C2E',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  homeCardImg: {
    width: '100%',
    height: '100%',
  },
  homeCardPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
  },
  homeCardInitial: {
    color: '#555',
    fontSize: 36,
    fontWeight: 'bold',
  },
  homeCardTitle: {
    color: '#CCC',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 6,
  },
  liveBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#FF453A',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  liveBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  progressOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
  playOverlay: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  // ── EPG Progress Bar on Live Items ──
  epgRow: {
    marginTop: 2,
  },
  epgProgressBarBg: {
    height: 2,
    backgroundColor: '#2C2C2E',
    borderRadius: 1,
    marginBottom: 3,
    overflow: 'hidden',
  },
  epgProgressBarFill: {
    height: '100%',
    backgroundColor: '#FF453A',
    borderRadius: 1,
  },
  // ── Favorite Buttons ──
  favButton: {
    padding: 8,
    marginLeft: 4,
  },
  gridFavButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 14,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

// ═══════════════════════════════════════════════════════════════════
//  TV STYLES (original – 100% preserved)
// ═══════════════════════════════════════════════════════════════════
const tvStyles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
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
    backgroundColor: '#1E3A8A',
    borderColor: '#3B82F6',
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
});