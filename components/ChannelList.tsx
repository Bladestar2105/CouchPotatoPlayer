import React, { useMemo, useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, FlatList, ScrollView, Platform } from 'react-native';
import { useIPTV } from '../context/IPTVContext';
import { useNavigation } from '@react-navigation/native';
import { Channel } from '../types';
import { useSettings } from '../context/SettingsContext';

const defaultLogo = require('../assets/icon.png');
const TIMELINE_HOUR_WIDTH = 200; // pixels per hour
const EPG_START_HOUR = 0;
const EPG_END_HOUR = 24;

const LiveTVFlow = () => {
  const { channels, playStream, isLoading, pin, isAdultUnlocked, epg, loadEPG } = useIPTV();
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

  // Default select first group
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

  const selectedChannels = groups.find(g => g.title === selectedGroup)?.data || [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Categories / Groups Sidebar */}
      <View style={[styles.categoriesSidebar, { backgroundColor: colors.surface, borderRightColor: colors.divider }]}>
        <FlatList
          data={groups}
          keyExtractor={(item) => item.title}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.categoryItem,
                selectedGroup === item.title ? { backgroundColor: colors.primary + '33', borderLeftColor: colors.primary, borderLeftWidth: 4 } : { borderLeftColor: 'transparent', borderLeftWidth: 4 }
              ]}
              onPress={() => setSelectedGroup(item.title)}
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
           <EPGTimeline channels={selectedChannels} playStream={playStream} epg={epg} colors={colors} navigation={navigation} />
        ) : (
          <View style={styles.centeredContainer}>
            <Text style={{ color: colors.textSecondary }}>No channels available</Text>
          </View>
        )}
      </View>
    </View>
  );
};

// Two-dimensional EPG timeline grid
const EPGTimeline = ({ channels, playStream, epg, colors, navigation }: any) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  const handleChannelPress = (channel: Channel) => {
    playStream({ url: channel.url, id: channel.id });
    navigation.navigate('Player');
  };

  // Generate hour headers (00:00 to 23:00)
  const hours = Array.from({ length: 24 }).map((_, i) => {
    const d = new Date();
    d.setHours(i, 0, 0, 0);
    return d;
  });

  const getEpgBlockStyle = (start: Date, end: Date) => {
    const startHourOffset = start.getHours() + (start.getMinutes() / 60);
    const endHourOffset = end.getHours() + (end.getMinutes() / 60);
    const width = (endHourOffset - startHourOffset) * TIMELINE_HOUR_WIDTH;
    const left = startHourOffset * TIMELINE_HOUR_WIDTH;
    return { left, width };
  };

  // Calculate current time line position
  const currentHourOffset = currentTime.getHours() + (currentTime.getMinutes() / 60);
  const currentTimeLineLeft = currentHourOffset * TIMELINE_HOUR_WIDTH;

  return (
    <View style={styles.timelineContainer}>
      {/* Header with Hours */}
      <View style={{ flexDirection: 'row' }}>
         <View style={[styles.channelColumnHeader, { backgroundColor: colors.surface, borderRightColor: colors.divider }]} />
         <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1, backgroundColor: colors.surface }}>
            <View style={{ flexDirection: 'row', height: 40, alignItems: 'center' }}>
              {hours.map((h, i) => (
                <View key={i} style={{ width: TIMELINE_HOUR_WIDTH, paddingLeft: 8 }}>
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                    {h.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              ))}
            </View>
         </ScrollView>
      </View>

      {/* Main Grid */}
      <ScrollView style={{ flex: 1 }}>
        {channels.map((channel: Channel) => {
          const channelEpg = epg[channel.tvgId || channel.id] || [];

          return (
            <View key={channel.id} style={[styles.timelineRow, { borderBottomColor: colors.divider }]}>
              {/* Left Column: Channel Info */}
              <TouchableOpacity
                style={[styles.channelColumn, { backgroundColor: colors.card, borderRightColor: colors.divider }]}
                onPress={() => handleChannelPress(channel)}
              >
                <Image source={channel.logo ? { uri: channel.logo } : defaultLogo} style={styles.channelLogo} resizeMode="contain" />
                <Text style={{ color: colors.text, fontSize: 12, marginLeft: 8, flex: 1 }} numberOfLines={2}>
                  {channel.name}
                </Text>
              </TouchableOpacity>

              {/* Right Column: EPG Scrollable Row */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1, backgroundColor: colors.background }}>
                <View style={{ width: 24 * TIMELINE_HOUR_WIDTH, height: 60, position: 'relative' }}>
                  {channelEpg.map((prog: any, idx: number) => {
                    const { left, width } = getEpgBlockStyle(prog.start, prog.end);
                    const isNow = currentTime >= prog.start && currentTime < prog.end;

                    return (
                      <TouchableOpacity
                        key={idx}
                        style={[
                          styles.epgBlock,
                          {
                            left,
                            width: width - 2, // 2px gap
                            backgroundColor: isNow ? colors.primary : colors.surface,
                            borderColor: colors.divider
                          }
                        ]}
                        onPress={() => {}}
                      >
                        <Text style={{ color: isNow ? '#FFF' : colors.text, fontSize: 12, fontWeight: 'bold' }} numberOfLines={1}>{prog.title}</Text>
                        <Text style={{ color: isNow ? 'rgba(255,255,255,0.7)' : colors.textSecondary, fontSize: 10 }} numberOfLines={1}>
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
    borderWidth: 1,
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
