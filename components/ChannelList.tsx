import React, { useMemo, useState, useEffect, forwardRef, useImperativeHandle, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList, Dimensions, Platform, findNodeHandle } from 'react-native';
import { useIPTV } from '../context/IPTVContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Channel } from '../types';
import { useSettings } from '../context/SettingsContext';
import { isProgramCatchupAvailable } from '../utils/catchupUtils';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { findCurrentProgramIndex } from '../utils/epgUtils';
import { ChannelLogo } from './ChannelLogo';
import EpgTimeline from './EpgTimeline';
export type ContentRef = { focusFirstItem: () => void; handleBack?: () => boolean };

const defaultLogo = require('../assets/icon.png');
const { height } = Dimensions.get('window');

// Cache time formatter
const timeFormatter = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' });

// TiviMate-style category item with count badge
const CategoryItem = React.memo(React.forwardRef(({ title, count, isSelected, onPress, colors, hasTVPreferredFocus }: { title: string, count?: number, isSelected: boolean, onPress: () => void, colors: any, hasTVPreferredFocus?: boolean }, ref: React.Ref<any>) => {
    const [isFocused, setIsFocused] = useState(false);
    return (
        <TouchableOpacity
            ref={ref}
            style={[
                tiviStyles.categoryItem,
                { borderBottomColor: colors.divider },
                isSelected && { backgroundColor: colors.primaryLight, borderLeftColor: colors.primary, borderLeftWidth: 3 },
                isFocused && { backgroundColor: 'rgba(124,77,255,0.25)', borderLeftColor: colors.primary, borderLeftWidth: 3 }
            ]}
            onPress={onPress}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            accessible={true}
            isTVSelectable={true}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={`Select category ${title}`}
            hasTVPreferredFocus={hasTVPreferredFocus}
        >
            <Text style={[tiviStyles.categoryText, { color: isSelected || isFocused ? colors.text : colors.textSecondary }]} numberOfLines={1}>
                {title}
            </Text>
            {count !== undefined && (
                <View style={[tiviStyles.countBadge, { backgroundColor: isSelected ? colors.primary : colors.divider }]}>
                    <Text style={[tiviStyles.countText, { color: isSelected ? '#FFF' : colors.textMuted }]}>{count}</Text>
                </View>
            )}
        </TouchableOpacity>
    );
}), (prevProps: any, nextProps: any) => {
    return prevProps.title === nextProps.title && prevProps.isSelected === nextProps.isSelected && prevProps.count === nextProps.count && prevProps.hasTVPreferredFocus === nextProps.hasTVPreferredFocus;
});

// TiviMate-style channel row with inline EPG
const ChannelRow = React.memo(({ channel, channelNumber, isPlaying, isFocused, isFav, currentProgram, progressPercent, hasCatchupSupport, onPress, onLongPress, onFocus, colors }: {
    channel: Channel;
    channelNumber: number;
    isPlaying: boolean;
    isFocused: boolean;
    isFav: boolean;
    currentProgram: any;
    progressPercent: number;
    hasCatchupSupport: boolean;
    onPress: () => void;
    onLongPress: () => void;
    onFocus: () => void;
    colors: any;
}) => {
    const [localFocused, setLocalFocused] = useState(false);
    const focused = isFocused || localFocused;

    return (
        <TouchableOpacity
            style={[
                tiviStyles.channelRow,
                { borderBottomColor: colors.divider },
                isPlaying && { backgroundColor: 'rgba(124,77,255,0.12)', borderLeftColor: colors.primary, borderLeftWidth: 3 },
                focused && { backgroundColor: 'rgba(124,77,255,0.18)' },
            ]}
            onPress={onPress}
            onLongPress={onLongPress}
            onFocus={() => { setLocalFocused(true); onFocus(); }}
            onBlur={() => setLocalFocused(false)}
            accessible={true}
            isTVSelectable={true}
            activeOpacity={0.7}
        >
            {/* Channel Number */}
            <Text style={[tiviStyles.channelNumber, { color: focused ? colors.primary : colors.textMuted }]}>
                {channelNumber}
            </Text>

            {/* Channel Logo */}
            <View style={tiviStyles.logoContainer}>
                {channel.logo && channel.logo.startsWith('http') ? (
                    <ChannelLogo url={channel.logo} name={channel.name} style={tiviStyles.channelLogo} />
                ) : (
                    <View style={[tiviStyles.channelLogo, tiviStyles.logoPlaceholder, { backgroundColor: colors.surfaceSecondary }]}>
                        <Icon name="tv" size={18} color={colors.textMuted} />
                    </View>
                )}
                {hasCatchupSupport && (
                    <View style={[tiviStyles.catchupDot, { backgroundColor: colors.primary }]} />
                )}
            </View>

            {/* Channel Info + EPG */}
            <View style={tiviStyles.channelInfo}>
                <View style={tiviStyles.channelNameRow}>
                    <Text style={[tiviStyles.channelName, { color: focused ? colors.text : colors.textSecondary }]} numberOfLines={1}>
                        {channel.name}
                    </Text>
                    {isFav && <Icon name="favorite" size={14} color={colors.primary} style={{ marginLeft: 4 }} />}
                    {isPlaying && <Icon name="play-arrow" size={16} color={colors.primary} style={{ marginLeft: 4 }} />}
                </View>

                {currentProgram ? (
                    <View style={tiviStyles.epgInline}>
                        <Text style={[tiviStyles.programName, { color: colors.textMuted }]} numberOfLines={1}>
                            {timeFormatter.format(currentProgram.start)} {currentProgram.title}
                        </Text>
                        <View style={[tiviStyles.progressBar, { backgroundColor: colors.divider }]}>
                            <View style={[tiviStyles.progressFill, { width: `${progressPercent}%`, backgroundColor: colors.primary }]} />
                        </View>
                    </View>
                ) : (
                    <Text style={[tiviStyles.noProgramText, { color: colors.textMuted }]}>No EPG data</Text>
                )}
            </View>
        </TouchableOpacity>
    );
}, (prevProps, nextProps) => {
    return prevProps.isPlaying === nextProps.isPlaying &&
           prevProps.isFocused === nextProps.isFocused &&
           prevProps.isFav === nextProps.isFav &&
           prevProps.currentProgram === nextProps.currentProgram &&
           prevProps.progressPercent === nextProps.progressPercent &&
           prevProps.channel === nextProps.channel;
});

// View mode toggle: list vs EPG grid
type ViewMode = 'list' | 'epg';

const LiveTVFlow = forwardRef<ContentRef, { onReturnToSidebar?: () => void; initialViewMode?: ViewMode }>((props, ref) => {
  const { channels, playStream, isLoading, pin, isAdultUnlocked, epg, loadEPG, lockChannel, unlockChannel, isChannelLocked, addFavorite, removeFavorite, isFavorite, addRecentlyWatched, currentStream, hasCatchup, getCatchupUrl } = useIPTV();
  const { colors } = useSettings();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [focusedChannelId, setFocusedChannelId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(props.initialViewMode || 'list');

  useEffect(() => {
    if (route.params?.returnGroupId) {
      setSelectedGroup(route.params.returnGroupId);
    }
    if (route.params?.focusChannelId) {
      setFocusedChannelId(route.params.focusChannelId);
    }
  }, [route.params?.returnGroupId, route.params?.focusChannelId]);
  const [shouldFocusFirstItem, setShouldFocusFirstItem] = useState(false);

  const isTV = Platform.isTV || (Platform.OS as any) === 'tvos';
  const isMobile = !isTV && Dimensions.get('window').width < 768;
  const [showCategories, setShowCategories] = useState<boolean>(true);

  const firstCategoryRef = useRef<any>(null);
  const flatListRef = useRef<FlatList>(null);
  const [unlockMode, setUnlockMode] = useState<string | null>(null);

  useEffect(() => {
    loadEPG();
  }, []);

  useImperativeHandle(ref, () => ({
    focusFirstItem: () => {
      if (firstCategoryRef.current) {
        firstCategoryRef.current.focus?.();
        firstCategoryRef.current.setNativeProps?.({ hasTVPreferredFocus: true });
      }
    },
    handleBack: () => {
      // If PIN unlock dialog is open, close it
      if (unlockMode) {
        setUnlockMode(null);
        return true;
      }
      // If viewing channel list on mobile, go back to categories
      if (isMobile && !showCategories) {
        setShowCategories(true);
        return true;
      }
      return false;
    },
  }));

  const { groups, groupMap, channelMap } = useMemo(() => {
    const len = channels.length;
    if (len === 0) return { groups: [], groupMap: {}, channelMap: {} };

    const map: Record<string, Channel[]> = {};
    const cMap: Record<string, Channel> = {};
    const hasPin = !!pin;

    for (let i = 0; i < len; i++) {
      const channel = channels[i];
      cMap[channel.id] = channel;
      if (channel.isAdult && !isAdultUnlocked && hasPin) {
        continue;
      }

      const g = channel.group || 'Unknown';
      if (map[g] === undefined) {
        map[g] = [channel];
      } else {
        map[g].push(channel);
      }
    }

    const titles = Object.keys(map);
    const titlesLen = titles.length;
    const result = new Array(titlesLen);
    for (let i = 0; i < titlesLen; i++) {
      const title = titles[i];
      result[i] = { title, data: map[title] };
    }
    return { groups: result, groupMap: map, channelMap: cMap };
  }, [channels, isAdultUnlocked, pin]);

  useEffect(() => {
    if (groups.length > 0 && !selectedGroup) {
      setSelectedGroup(groups[0].title);
    }
  }, [groups, selectedGroup]);

  useEffect(() => {
     if (selectedGroup) {
         const currentChannels = groupMap[selectedGroup] || [];
         if (currentChannels.length > 0) {
            const playingInGroup = currentChannels.find((c: any) => c.id === currentStream?.id);
            if (playingInGroup) {
                 setFocusedChannelId(playingInGroup.id);
            } else {
                 setFocusedChannelId(currentChannels[0].id);
            }
         }
     }
  }, [selectedGroup, groupMap, currentStream?.id]);

  const handleGroupSelect = (title: string) => {
    setSelectedGroup(title);
    setShouldFocusFirstItem(true);
    if (isMobile) {
      setShowCategories(false);
    }
  };

  useEffect(() => {
    if (shouldFocusFirstItem) {
      const timer = setTimeout(() => setShouldFocusFirstItem(false), 100);
      return () => clearTimeout(timer);
    }
  }, [shouldFocusFirstItem]);

  if (isLoading) {
    return (
      <View style={[styles.centeredContainer, { backgroundColor: 'transparent' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const selectedChannels = useMemo(() => {
    return selectedGroup ? (groupMap[selectedGroup] || []) : [];
  }, [groupMap, selectedGroup]);

  const getEpgKey = (channel: Channel): string => {
    if (channel.epgChannelId && channel.epgChannelId.length > 0) {
      return channel.epgChannelId;
    }
    return channel.tvgId || channel.id;
  };

  const handleChannelPress = (channel: Channel) => {
    if (isChannelLocked(channel.id)) {
       setUnlockMode(channel.id);
       return;
    }

    playStream({ url: channel.url, id: channel.id });

    addRecentlyWatched({
      id: channel.id,
      type: 'live',
      name: channel.name,
      icon: channel.logo,
      extension: 'm3u8',
      lastWatchedAt: Date.now(),
    });

    navigation.navigate('Player', {
      focusChannelId: channel.id,
      returnGroupId: selectedGroup,
      returnScreen: 'Home',
      returnTab: 'channels',
    });
  };

  const handleEpgPress = (channel: Channel, prog: any) => {
    const now = new Date();
    const nowTime = now.getTime();
    const isNow = nowTime >= prog.start && nowTime < prog.end;
    const isPast = nowTime >= prog.end;

    if (isNow) {
      handleChannelPress(channel);
    } else if (isPast) {
      const startDate = new Date(prog.start);
      const endDate = new Date(prog.end);
      if (isProgramCatchupAvailable(channel, startDate, endDate)) {
        const catchupUrl = getCatchupUrl(channel, startDate, endDate);
        if (catchupUrl) {
          playStream({ url: catchupUrl, id: `${channel.id}_catchup_${prog.start}` });
          addRecentlyWatched({
            id: `${channel.id}_catchup`,
            type: 'live',
            name: `${channel.name}${prog.title ? ` – ${prog.title}` : ''}`,
            icon: channel.logo,
            lastWatchedAt: Date.now(),
          });
          navigation.navigate('Player', {
            focusChannelId: channel.id,
            returnGroupId: selectedGroup,
          });
        }
      }
    }
  };

  const handleToggleFavorite = (channel: Channel) => {
    if (isFavorite(channel.id)) {
      removeFavorite(channel.id);
    } else {
      addFavorite({ id: channel.id, type: 'live', name: channel.name, icon: channel.logo, categoryId: channel.categoryId, addedAt: Date.now() });
    }
  };

  // Compute EPG data for the TiviMate-style list view
  const now = useMemo(() => Date.now(), []);

  const getChannelEpgInfo = (channel: Channel) => {
    const key = getEpgKey(channel);
    const programs = epg[key] || [];
    if (programs.length === 0) return { currentProgram: null, progressPercent: 0 };

    const idx = findCurrentProgramIndex(programs, new Date(now));
    if (idx === -1) return { currentProgram: null, progressPercent: 0 };

    const prog = programs[idx];
    const totalDuration = prog.end - prog.start;
    const elapsed = now - prog.start;
    const progressPercent = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));

    return { currentProgram: prog, progressPercent };
  };

  // Global channel index for numbering
  const channelIndexOffset = useMemo(() => {
    if (!selectedGroup) return 0;
    let offset = 0;
    for (const g of groups) {
      if (g.title === selectedGroup) break;
      offset += g.data.length;
    }
    return offset;
  }, [groups, selectedGroup]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      {/* View mode toggle - hidden on TV where sidebar handles navigation */}
      {!isMobile && !isTV && (
        <View style={[tiviStyles.viewModeBar, { backgroundColor: colors.card, borderBottomColor: colors.divider }]}>
          <TouchableOpacity
            style={[tiviStyles.viewModeBtn, viewMode === 'list' && { backgroundColor: colors.primary }]}
            onPress={() => setViewMode('list')}
            isTVSelectable={true}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="List view"
          >
            <Icon name="list" size={18} color={viewMode === 'list' ? '#FFF' : colors.textMuted} />
            <Text style={{ color: viewMode === 'list' ? '#FFF' : colors.textMuted, fontSize: 12, marginLeft: 4, fontWeight: '600' }}>List</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[tiviStyles.viewModeBtn, viewMode === 'epg' && { backgroundColor: colors.primary }]}
            onPress={() => setViewMode('epg')}
            isTVSelectable={true}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="EPG grid view"
          >
            <Icon name="grid-on" size={18} color={viewMode === 'epg' ? '#FFF' : colors.textMuted} />
            <Text style={{ color: viewMode === 'epg' ? '#FFF' : colors.textMuted, fontSize: 12, marginLeft: 4, fontWeight: '600' }}>EPG</Text>
          </TouchableOpacity>
          {selectedGroup && (
            <Text style={[tiviStyles.groupTitle, { color: colors.textSecondary }]}>{selectedGroup}</Text>
          )}
        </View>
      )}

      <View style={{ flex: 1, flexDirection: 'row' }}>
        {/* LEFT: Category Groups */}
        {showCategories && (
          <View style={[tiviStyles.categorySidebar, isMobile ? { width: '100%', flex: 1, borderRightWidth: 0 } : { backgroundColor: colors.card, borderRightColor: colors.divider }]}>
            {isMobile && (
              <View style={{ padding: 14, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.divider }}>
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>Categories</Text>
              </View>
            )}
            <FlatList
              data={groups}
              keyExtractor={(item) => item.title}
              initialNumToRender={15}
              maxToRenderPerBatch={10}
              windowSize={5}
              removeClippedSubviews={true}
              renderItem={({ item, index }) => {
                const isSelected = selectedGroup === item.title;
                const isFirstItem = index === 0;
                return (
                    <CategoryItem
                        ref={isFirstItem ? firstCategoryRef : undefined}
                        title={item.title}
                        count={item.data.length}
                        isSelected={isSelected}
                        onPress={() => handleGroupSelect(item.title)}
                        colors={colors}
                        hasTVPreferredFocus={isFirstItem}
                    />
                );
              }}
            />
          </View>
        )}

        {/* RIGHT: Channel List or EPG Grid */}
        {(!isMobile || !showCategories) && (
          <View style={[tiviStyles.contentPane, { backgroundColor: colors.background }]}>
            {isMobile && (
              <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.divider }}>
                <TouchableOpacity onPress={() => setShowCategories(true)} style={{ flexDirection: 'row', alignItems: 'center' }} accessible={true} isTVSelectable={true}>
                  <Icon name="arrow-back" size={22} color={colors.text} />
                  <Text style={{ color: colors.text, marginLeft: 8, fontSize: 16, fontWeight: '600' }}>{selectedGroup}</Text>
                </TouchableOpacity>
              </View>
            )}

            {viewMode === 'list' || isMobile ? (
              // TiviMate-style channel list
              selectedChannels.length > 0 ? (
                <FlatList
                  ref={flatListRef}
                  data={selectedChannels}
                  keyExtractor={(item) => item.id}
                  initialNumToRender={15}
                  maxToRenderPerBatch={10}
                  windowSize={7}
                  removeClippedSubviews={true}
                  getItemLayout={(data, index) => ({
                    length: Platform.isTV ? 72 : 64,
                    offset: (Platform.isTV ? 72 : 64) * index,
                    index,
                  })}
                  renderItem={({ item: channel, index }) => {
                    const epgInfo = getChannelEpgInfo(channel);
                    const isPlaying = currentStream?.id === channel.id;
                    const isFocusedChannel = focusedChannelId === channel.id;
                    const isFav = isFavorite(channel.id);
                    const hasCatchupSupport = hasCatchup ? hasCatchup(channel) : false;

                    return (
                      <ChannelRow
                        channel={channel}
                        channelNumber={channelIndexOffset + index + 1}
                        isPlaying={isPlaying}
                        isFocused={isFocusedChannel}
                        isFav={isFav}
                        currentProgram={epgInfo.currentProgram}
                        progressPercent={epgInfo.progressPercent}
                        hasCatchupSupport={hasCatchupSupport}
                        onPress={() => handleChannelPress(channel)}
                        onLongPress={() => handleToggleFavorite(channel)}
                        onFocus={() => setFocusedChannelId(channel.id)}
                        colors={colors}
                      />
                    );
                  }}
                />
              ) : (
                <View style={styles.centeredContainer}>
                  <Icon name="tv-off" size={48} color={colors.textMuted} />
                  <Text style={{ color: colors.textSecondary, marginTop: 12 }}>No channels available</Text>
                </View>
              )
            ) : (
              // EPG Grid view
              selectedChannels.length > 0 ? (
                <EpgTimeline
                  channels={selectedChannels}
                  onChannelPress={handleChannelPress}
                  onProgramPress={handleEpgPress}
                  focusedChannelId={focusedChannelId}
                  setFocusedChannelId={(id) => {
                    setFocusedChannelId(id);
                    setShouldFocusFirstItem(false);
                  }}
                  currentStreamId={currentStream?.id}
                  shouldFocusFirstItem={shouldFocusFirstItem}
                />
              ) : (
                <View style={styles.centeredContainer}>
                  <Text style={{ color: colors.textSecondary }}>No channels available in this category</Text>
                </View>
              )
            )}
          </View>
        )}
      </View>

      {/* Unlock PIN Dialog Overlay */}
      {unlockMode && (
          <View style={StyleSheet.absoluteFill}>
              <View style={[styles.centeredContainer, { backgroundColor: 'rgba(0,0,0,0.85)' }]}>
                  <View style={{ backgroundColor: colors.card, padding: 24, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: colors.divider }}>
                      <Icon name="lock" size={32} color={colors.primary} style={{ marginBottom: 12 }} />
                      <Text style={{ color: colors.text, fontSize: 18, marginBottom: 16, fontWeight: '600' }}>Enter PIN to Unlock</Text>
                      <View style={{ flexDirection: 'row', gap: 16 }}>
                          <TouchableOpacity onPress={() => setUnlockMode(null)} style={{ padding: 12, paddingHorizontal: 20, backgroundColor: colors.surfaceSecondary, borderRadius: 10 }} accessible={true} isTVSelectable={true}>
                             <Text style={{ color: colors.textSecondary }}>Cancel</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                              onPress={() => {
                                  if (pin) {
                                      unlockChannel(unlockMode);
                                      setUnlockMode(null);
                                  }
                              }}
                              style={{ padding: 12, paddingHorizontal: 20, backgroundColor: colors.primary, borderRadius: 10 }}
                              accessible={true}
                              isTVSelectable={true}
                              hasTVPreferredFocus={true}
                          >
                             <Text style={{ color: '#FFF', fontWeight: '600' }}>Unlock</Text>
                          </TouchableOpacity>
                      </View>
                  </View>
              </View>
          </View>
      )}

    </View>
  );
});

LiveTVFlow.displayName = 'LiveTVFlow';

const tiviStyles = StyleSheet.create({
  // View mode bar
  viewModeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  viewModeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
  },
  groupTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 12,
    flex: 1,
  },
  // Category sidebar
  categorySidebar: {
    width: Platform.isTV ? 280 : 220,
    borderRightWidth: 1,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Platform.isTV ? 14 : 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  categoryText: {
    fontSize: Platform.isTV ? 15 : 14,
    fontWeight: '500',
    flex: 1,
  },
  countBadge: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 28,
    alignItems: 'center',
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
  },
  // Content pane
  contentPane: {
    flex: 1,
  },
  // TiviMate channel row
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Platform.isTV ? 10 : 8,
    paddingHorizontal: Platform.isTV ? 16 : 12,
    borderBottomWidth: 1,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
    height: Platform.isTV ? 72 : 64,
  },
  channelNumber: {
    width: Platform.isTV ? 36 : 28,
    fontSize: Platform.isTV ? 14 : 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  logoContainer: {
    position: 'relative',
    marginHorizontal: Platform.isTV ? 12 : 8,
  },
  channelLogo: {
    width: Platform.isTV ? 44 : 36,
    height: Platform.isTV ? 32 : 26,
    borderRadius: 4,
  },
  logoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  catchupDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#121212',
  },
  channelInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  channelNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  channelName: {
    fontSize: Platform.isTV ? 15 : 14,
    fontWeight: '600',
    flex: 1,
  },
  epgInline: {
    marginTop: 3,
  },
  programName: {
    fontSize: Platform.isTV ? 13 : 11,
    marginBottom: 3,
  },
  progressBar: {
    height: 3,
    borderRadius: 1.5,
    overflow: 'hidden',
    maxWidth: 200,
  },
  progressFill: {
    height: '100%',
    borderRadius: 1.5,
  },
  noProgramText: {
    fontSize: Platform.isTV ? 12 : 10,
    marginTop: 2,
    fontStyle: 'italic',
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default LiveTVFlow;
