import React from 'react';
import {
  View, Text, SectionList, TouchableOpacity, StyleSheet,
  Image, ActivityIndicator
} from 'react-native';
import { useIPTV } from '../context/IPTVContext';
import { useNavigation } from '@react-navigation/native';
import { Channel } from '../types';
import { findCurrentProgram } from '../utils/epgUtils';
import { useSettings } from '../context/SettingsContext';

const defaultLogo = require('../assets/icon.png');

const ChannelList = () => {
  const { channels, playStream, isLoading, error, pin, isAdultUnlocked, epg, loadEPG } = useIPTV();
  const { colors } = useSettings();
  const navigation = useNavigation();

  React.useEffect(() => {
    loadEPG();
  }, []);

  const handleChannelPress = (channel: Channel) => {
    console.log('CLIC SUR CHAÎNE:', channel.name);
    playStream({ url: channel.url, id: channel.id });
    navigation.navigate('Player');
  };

  const groupedData = React.useMemo(() => {
    if (channels.length === 0) return [];

    const safeChannels = channels.filter(c => !c.isAdult || isAdultUnlocked || !pin);

    // 1. On crée un objet pour regrouper (ex: { "France HD": [...], "Films": [...] })
    const groups = safeChannels.reduce((acc, channel) => {
      const groupTitle = channel.group || 'Inconnu'; // Utilise 'Inconnu' si pas de groupe
      if (!acc[groupTitle]) {
        acc[groupTitle] = [];
      }
      acc[groupTitle].push(channel);
      return acc;
    }, {} as Record<string, Channel[]>);


    return Object.keys(groups).sort().map(title => ({
      title: title,
      data: groups[title]
    }));
  }, [channels, isAdultUnlocked, pin]);

  // Rendu d'un item (une chaîne)
  const renderItem = ({ item }: { item: Channel }) => {
    const channelEpg = item.tvgId ? epg[item.tvgId] : [];
    const now = new Date();
    // ⚡ Bolt Optimization: Replaced O(N) linear search (channelEpg?.find)
    // with an O(log N) binary search for the current program since the EPG
    // array is sorted chronologically. This significantly speeds up rendering
    // for channels with extensive programming guides.
    const currentProgram = channelEpg ? findCurrentProgram(channelEpg, now) : undefined;

    return (
      <TouchableOpacity
        style={[styles.channelItem, { borderBottomColor: colors.divider }]}
        onPress={() => handleChannelPress(item)}
      >
        <View style={[styles.logoContainer, { backgroundColor: colors.card }]}>
          <Image
            style={styles.logo}
            source={item.logo ? { uri: item.logo } : defaultLogo}
            defaultSource={defaultLogo}
            resizeMode="contain"
          />
        </View>
        <View style={styles.channelInfo}>
          <Text style={[styles.channelName, { color: colors.text }]} numberOfLines={2}>
            {item.name}
          </Text>
        </View>
        <View style={[styles.epgContainer, { borderBottomColor: colors.divider }]}>
            {currentProgram ? (
              <View style={[styles.epgBlock, { backgroundColor: colors.primary + '4D', borderColor: colors.primary }]}>
                <Text style={[styles.epgTitle, { color: '#FFF' }]} numberOfLines={1}>
                  {currentProgram.title}
                </Text>
                <Text style={[styles.epgTime, { color: colors.textSecondary }]}>
                  {currentProgram.start.getHours().toString().padStart(2, '0')}:{currentProgram.start.getMinutes().toString().padStart(2, '0')} - {currentProgram.end.getHours().toString().padStart(2, '0')}:{currentProgram.end.getMinutes().toString().padStart(2, '0')}
                </Text>
              </View>
            ) : (
              <Text style={{ color: colors.textSecondary, marginLeft: 16 }}>No EPG Data</Text>
            )}
        </View>
      </TouchableOpacity>
    );
  };

  // Rendu de l'en-tête de section (ex: "France HD")
  const renderSectionHeader = ({ section: { title } }: { section: { title: string } }) => (
    <Text style={[styles.header, { backgroundColor: colors.surface, color: colors.text }]}>{title}</Text>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.error }]}>Error: {error}</Text>
      </View>
    );
  }

  if (channels.length === 0) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Aucune chaîne trouvée dans ce profil.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* On remplace FlatList par SectionList */}
      <SectionList
        sections={groupedData}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={(item) => item.id + item.url}
        stickySectionHeadersEnabled={true} // En-têtes collants
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  // Style pour l'en-tête (ex: "France HD")
  header: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    backgroundColor: '#222',
    padding: 10,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#FF3B30',
  },
  emptyText: {
    color: '#888',
    textAlign: 'center',
  },
  channelItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  logoContainer: {
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  channelInfo: {
    flex: 1,
    marginLeft: 12,
    maxWidth: 200,
  },
  channelName: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  epgContainer: {
    flex: 2,
    height: 60,
    justifyContent: 'center',
    borderLeftWidth: 1,
    paddingLeft: 16,
    marginLeft: 16,
  },
  epgBlock: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  epgTitle: {
    fontWeight: 'bold',
    fontSize: 12,
  },
  epgTime: {
    fontSize: 10,
    marginTop: 2,
  },
});

export default ChannelList;