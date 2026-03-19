import React from 'react';
import {
  View, Text, SectionList, TouchableOpacity, StyleSheet,
  Image, ActivityIndicator
} from 'react-native';
import { useIPTV } from '../context/IPTVContext';
import { useNavigation } from '@react-navigation/native';
import { Channel } from '../types';
import { findCurrentProgram } from '../utils/epgUtils';

const defaultLogo = require('../assets/icon.png');

const ChannelList = () => {
  const { channels, playStream, isLoading, error, pin, isAdultUnlocked, epg, loadEPG } = useIPTV();
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
        style={styles.channelItem}
        onPress={() => handleChannelPress(item)}
      >
        <Image
          style={styles.logo}
          source={item.logo ? { uri: item.logo } : defaultLogo}
          defaultSource={defaultLogo}
          resizeMode="contain"
        />
        <View style={styles.channelInfo}>
          <Text style={styles.channelName}>{item.name}</Text>
          {currentProgram && (
            <Text style={styles.epgText} numberOfLines={1}>
              {currentProgram.start.getHours().toString().padStart(2, '0')}:{currentProgram.start.getMinutes().toString().padStart(2, '0')} - {currentProgram.title}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Rendu de l'en-tête de section (ex: "France HD")
  const renderSectionHeader = ({ section: { title } }: { section: { title: string } }) => (
    <Text style={styles.header}>{title}</Text>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#FFF" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  if (channels.length === 0) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.emptyText}>Aucune chaîne trouvée dans ce profil.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* On remplace FlatList par SectionList */}
      <SectionList
        sections={groupedData}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={(item) => item.id + item.url}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
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
    padding: 10,
    alignItems: 'center',
  },
  logo: {
    width: 50,
    height: 50,
    marginRight: 15,
    backgroundColor: '#333',
    borderRadius: 8,
  },
  channelInfo: {
    flex: 1,
  },
  channelName: {
    color: '#FFF',
    fontSize: 16,
  },
  epgText: {
    color: '#AAA',
    fontSize: 12,
    marginTop: 4,
  },
  separator: {
    height: 1,
    backgroundColor: '#333',
    marginLeft: 75,
  },
});

export default ChannelList;