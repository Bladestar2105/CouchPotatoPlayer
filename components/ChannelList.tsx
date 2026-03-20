import React, { useMemo, useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, FlatList, ScrollView, Platform, Animated } from 'react-native';
import { useIPTV } from '../context/IPTVContext';
import { useNavigation } from '@react-navigation/native';
import { Channel, FavoriteItem, RecentlyWatchedItem } from '../types';
import { useSettings } from '../context/SettingsContext';
import { MaterialIcons as Icon, Ionicons } from '@expo/vector-icons';

const defaultLogo = require('../assets/icon.png');
const TIMELINE_HOUR_WIDTH = 200; // pixels per hour

const LiveTVFlow = () => {
  const { channels, playStream, isLoading, pin, isAdultUnlocked, epg, loadEPG, lockChannel, unlockChannel, isChannelLocked, addFavorite, removeFavorite, isFavorite, addRecentlyWatched, hasCatchup, getCatchupUrl } = useIPTV();
  const { colors } = useSettings();
  const navigation = useNavigation<any>();

  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  useEffect(() => {
    loadEPG();
  }, []);

  const groups = useMemo(() => {
    if (channels.length === 0) return [];
    const safeChannels = channels.filter(c => !c.isAdult || isAdultUnlocked || !pin);
    const groupMap = safeChannels.reduce((acc, channel) => {
      const g = channel.group || 'Unknown';
      if (!acc[g]) acc[g] = [];
      acc[g].push(channel);
      return acc;
    }, {} as Record<string, Channel[]>);

    return Object.keys(groupMap).sort().map(title => ({ title, data: groupMap[title] }));
  }, [channels, isAdultUnlocked, pin]);

  useEffect(() => {
    if (groups.length > 0 && !selectedGroup) {
      setSelectedGroup(groups[0].title);
    }
  }, [groups, selectedGroup]);

  if (isLoading) {
    return (
      <View style={[styles.centeredContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const selectedChannels = useMemo(() => {
    return groups.find(g => g.title === selectedGroup)?.data || [];
  }, [groups, selectedGroup]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Categories / Groups Sidebar */}
      <View style={[styles.categoriesSidebar, { backgroundColor: colors.surface, borderRightColor: colors.divider }]}>
        <FlatList
          data={groups}
          keyExtractor={(item) => item.title}
          initialNumToRender={15}
          maxToRenderPerBatch={10}
          windowSize={5}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.categoryItem,
                selectedGroup === item.title ? { backgroundColor: colors.primary + '33', borderLeftColor: colors.primary, borderLeftWidth: 4 } : { borderLeftColor: 'transparent', borderLeftWidth: 4 }
              ]}
              onPress={() => setSelectedGroup(item.title)}
              accessibilityRole="button"
              accessibilityLabel={`Select category ${item.title}`}
            >
              <Text style={{ color: selectedGroup === item.title ? colors.primary : colors.textSecondary, fontWeight: selectedGroup === item.title ? 'bold' : 'normal' }}>
                {item.title} ({item.data.length})
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Main Content - Channel List & EPG Timeline */}
      <View style={styles.mainContent}>
        {selectedChannels.length > 0 ? (
           <EPGTimeline 
             channels={selectedChannels} 
             playStream={playStream} 
             epg={epg} 
             colors={colors} 
             navigation={navigation}
             lockChannel={lockChannel}
             unlockChannel={unlockChannel}
             isChannelLocked={isChannelLocked}
             addFavorite={addFavorite}
             removeFavorite={removeFavorite}
             isFavorite={isFavorite}
             addRecentlyWatched={addRecentlyWatched}
             pin={pin}
             hasCatchup={hasCatchup}
             getCatchupUrl={getCatchupUrl}
           />
        ) : (
          <View style={styles.centeredContainer}>
            <Text style={{ color: colors.textSecondary }}>No channels available</Text>
          </View>
        )}
      </View>
    </View>
  );
};

// Two-dimensional EPG timeline grid with synchronized scrolling
const EPGTimeline = ({ channels, playStream, epg, colors, navigation, lockChannel, unlockChannel, isChannelLocked, addFavorite, removeFavorite, isFavorite, addRecentlyWatched, pin, hasCatchup, getCatchupUrl }: any) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const headerScrollRef = useRef<ScrollView>(null);
  const rowScrollRefs = useRef<{ [key: string]: ScrollView }>({});
  const isScrollingHeader = useRef(false);
  const isScrollingRow = useRef(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Synchronized scrolling
  const handleHeaderScroll = (event: any) => {
    if (isScrollingRow.current) return;
    isScrollingHeader.current = true;
    const scrollX = event.nativeEvent.contentOffset.x;
    Object.values(rowScrollRefs.current).forEach(ref => {
      if (ref) {
        ref.scrollTo({ x: scrollX, animated: false });
      }
    });
    setTimeout(() => { isScrollingHeader.current = false; }, 50);
  };

  const handleRowScroll = (event: any) => {
    if (isScrollingHeader.current) return;
    isScrollingRow.current = true;
    const scrollX = event.nativeEvent.contentOffset.x;
    if (headerScrollRef.current) {
      headerScrollRef.current.scrollTo({ x: scrollX, animated: false });
    }
    setTimeout(() => { isScrollingRow.current = false; }, 50);
  };

  const handleChannelPress = (channel: Channel) => {
    // Check if channel is locked
    if (isChannelLocked(channel.id)) {
      // TODO: Show PIN dialog
      alert('This channel is locked. Please unlock it first.');
      return;
    }
    
    playStream({ url: channel.url, id: channel.id });
    
    // Add to recently watched
    addRecentlyWatched({
      id: channel.id,
      type: 'live',
      name: channel.name,
      icon: channel.logo,
      extension: 'm3u8',
      lastWatchedAt: Date.now(),
    });
    
    navigation.navigate('Player');
  };

  const handleLockToggle = (channel: Channel) => {
    if (!pin) {
      alert('Please set up a PIN in Settings first.');
      return;
    }
    if (isChannelLocked(channel.id)) {
      // TODO: Show PIN dialog to unlock
      unlockChannel(channel.id);
    } else {
      lockChannel(channel.id);
    }
  };

  const handleFavoriteToggle = (channel: Channel) => {
    if (isFavorite(channel.id)) {
      removeFavorite(channel.id);
    } else {
      addFavorite({
        id: channel.id,
        type: 'live',
        name: channel.name,
        icon: channel.logo,
        categoryId: channel.categoryId,
        addedAt: Date.now(),
      });
    }
  };

  // Generate hour headers based on current time
  const baseTime = new Date();
  baseTime.setHours(0, 0, 0, 0);
  
  const hours = Array.from({ length: 24 }).map((_, i) => {
    const d = new Date(baseTime);
    d.setHours(i, 0, 0, 0);
    return d;
  });

  const getEpgBlockStyle = (start: Date, end: Date) => {
    const startHourOffset = start.getHours() + (start.getMinutes() / 60);
    const endHourOffset = end.getHours() + (end.getMinutes() / 60);
    const width = (endHourOffset - startHourOffset) * TIMELINE_HOUR_WIDTH;
    const left = startHourOffset * TIMELINE_HOUR_WIDTH;
    return { left, width: Math.max(width, 50) };
  };

  // Calculate current time line position
  const currentHourOffset = currentTime.getHours() + (currentTime.getMinutes() / 60);
  const currentTimeLineLeft = currentHourOffset * TIMELINE_HOUR_WIDTH;

  // Get EPG key for channel (Flutter migration)
  const getEpgKey = (channel: Channel): string => {
    if (channel.epgChannelId && channel.epgChannelId.length > 0) {
      return channel.epgChannelId;
    }
    return channel.tvgId || channel.id;
  };

  return (
    <View style={styles.timelineContainer}>
      {/* Header with Hours */}
      <View style={{ flexDirection: 'row' }}>
         <View style={[styles.channelColumnHeader, { backgroundColor: colors.surface, borderRightColor: colors.divider }]}>
           <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: 'bold' }}>CHANNELS</Text>
         </View>
         <ScrollView 
           horizontal 
           showsHorizontalScrollIndicator={false} 
           style={{ flex: 1, backgroundColor: colors.surface }}
           ref={headerScrollRef}
           onScroll={handleHeaderScroll}
           scrollEventThrottle={16}
         >
            <View style={{ flexDirection: 'row', height: 40, alignItems: 'center' }}>
              {hours.map((h, i) => (
                <View key={i} style={{ width: TIMELINE_HOUR_WIDTH, paddingLeft: 8, borderLeftWidth: 1, borderLeftColor: colors.divider }}>
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                    {h.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              ))}
            </View>
         </ScrollView>
      </View>

      {/* Main Grid */}
      <ScrollView
        style={{ flex: 1 }}
        removeClippedSubviews={true}
      >
        {channels.map((channel: Channel) => {
          const epgKey = getEpgKey(channel);
          const channelEpg = epg[epgKey] || [];
          const isLocked = isChannelLocked(channel.id);
          const isFav = isFavorite(channel.id);

          return (
            <View key={channel.id} style={[styles.timelineRow, { borderBottomColor: colors.divider }]}>
              {/* Left Column: Channel Info */}
              <View style={[styles.channelColumn, { backgroundColor: isLocked ? colors.surface : colors.card, borderRightColor: colors.divider }]}>
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
                  onPress={() => handleChannelPress(channel)}
                  disabled={isLocked}
                >
                  {isLocked ? (
                    <Icon name="lock" size={24} color={colors.textSecondary} style={{ width: 40, height: 30 }} />
                  ) : (
                    <Image source={channel.logo ? { uri: channel.logo } : defaultLogo} style={styles.channelLogo} resizeMode="contain" />
                  )}
                  <Text style={{ color: isLocked ? colors.textSecondary : colors.text, fontSize: 12, marginLeft: 8, flex: 1 }} numberOfLines={2}>
                    {channel.name}
                  </Text>
                </TouchableOpacity>
                
                {/* Action Buttons */}
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TouchableOpacity
                    onPress={() => handleFavoriteToggle(channel)}
                    style={{ padding: 4 }}
                    accessibilityRole="button"
                    accessibilityLabel={isFav ? `Remove ${channel.name} from favorites` : `Add ${channel.name} to favorites`}
                  >
                    <Icon 
                      name={isFav ? 'favorite' : 'favorite-border'} 
                      size={18} 
                      color={isFav ? '#FF4444' : colors.textSecondary} 
                    />
                  </TouchableOpacity>
                  {pin && (
                    <TouchableOpacity
                      onPress={() => handleLockToggle(channel)}
                      style={{ padding: 4 }}
                      accessibilityRole="button"
                      accessibilityLabel={isLocked ? `Unlock ${channel.name}` : `Lock ${channel.name}`}
                    >
                      <Icon 
                        name={isLocked ? 'lock' : 'lock-open'} 
                        size={18} 
                        color={isLocked ? '#FF4444' : colors.textSecondary} 
                      />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Right Column: EPG Scrollable Row */}
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                style={{ flex: 1, backgroundColor: colors.background }}
                ref={(ref) => { if (ref) rowScrollRefs.current[channel.id] = ref; }}
                onScroll={handleRowScroll}
                scrollEventThrottle={16}
              >
                <View style={{ width: 24 * TIMELINE_HOUR_WIDTH, height: 60, position: 'relative' }}>
                  {channelEpg.map((prog: any, idx: number) => {
                    const { left, width } = getEpgBlockStyle(prog.start, prog.end);
                    const isNow = currentTime >= prog.start && currentTime < prog.end;
                    const isPast = currentTime >= prog.end;
                    
                    // Check if catchup is available
                    const canCatchup = isPast && hasCatchup(channel) && 
                      prog.end.getTime() > Date.now() - (channel.catchupDays || 0) * 24 * 60 * 60 * 1000;

                    return (
                      <TouchableOpacity
                        key={idx}
                        style={[
                          styles.epgBlock,
                          {
                            left,
                            width: width - 2,
                            backgroundColor: isNow ? colors.primary + '40' : canCatchup ? colors.primary + '20' : colors.surface,
                            borderColor: isNow ? colors.primary : canCatchup ? colors.primary + '60' : colors.divider,
                            borderWidth: isNow ? 2 : canCatchup ? 1 : 1,
                          }
                        ]}
                        onPress={() => {
                          if (isNow) {
                            // Play live
                            handleChannelPress(channel);
                          } else if (canCatchup) {
                            // Play catchup
                            const catchupUrl = getCatchupUrl(channel, prog.start, prog.end);
                            if (catchupUrl) {
                              playStream({ url: catchupUrl, id: `${channel.id}_${prog.start.getTime()}` });
                              navigation.navigate('Player');
                            }
                          }
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={{ color: isNow ? '#FFF' : colors.text, fontSize: 11, fontWeight: isNow ? 'bold' : 'normal' }} numberOfLines={1}>
                            {prog.title}
                          </Text>
                          {canCatchup && !isNow && (
                            <Ionicons name="play-back" size={10} color={colors.primary} style={{ marginLeft: 4 }} />
                          )}
                        </View>
                        <Text style={{ color: isNow ? 'rgba(255,255,255,0.7)' : colors.textSecondary, fontSize: 9 }} numberOfLines={1}>
                          {prog.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {prog.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                  {/* Current Time Indicator Line */}
                  <View style={[styles.currentTimeLine, { left: currentTimeLineLeft, backgroundColor: colors.error }]} />
                </View>
              </ScrollView>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoriesSidebar: {
    width: 200,
    borderRightWidth: 1,
  },
  categoryItem: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  mainContent: {
    flex: 1,
  },
  timelineContainer: {
    flex: 1,
  },
  channelColumnHeader: {
    width: 220,
    height: 40,
    borderRightWidth: 1,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  timelineRow: {
    flexDirection: 'row',
    height: 60,
    borderBottomWidth: 1,
  },
  channelColumn: {
    width: 220,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    borderRightWidth: 1,
  },
  channelLogo: {
    width: 40,
    height: 30,
  },
  epgBlock: {
    position: 'absolute',
    top: 4,
    height: 52,
    borderRadius: 4,
    padding: 6,
    justifyContent: 'center',
  },
  currentTimeLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    zIndex: 10,
  }
});

export default LiveTVFlow;