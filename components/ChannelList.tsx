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
  const navigation = useNavigation<any>();

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
    return (
      <View style={styles.itemContainer}>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <TouchableOpacity
            style={styles.logoContainer}
            onPress={() => handleChannelPress(item)}
          >
            <Image
              style={styles.logo}
              source={item.logo ? { uri: item.logo } : defaultLogo}
              defaultSource={defaultLogo}
              resizeMode="contain"
            />
          </TouchableOpacity>
          <View style={styles.infoRow}>
            <TouchableOpacity style={styles.infoTextContainer} onPress={() => handleChannelPress(item)}>
              <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
                {item.name}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.epgButton, { backgroundColor: colors.primary + '33' }]}
              onPress={() => navigation.navigate('EPG', { channelId: item.tvgId || item.id, channelName: item.name })}
            >
              <Text style={{ fontSize: 16 }}>📅</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  // Group items into rows of 3
  const formatData = (data: Channel[], numColumns: number) => {
    const formattedData = [];
    for (let i = 0; i < data.length; i += numColumns) {
      formattedData.push(data.slice(i, i + numColumns));
    }
    return formattedData;
  };

  const sectionsWithRows = groupedData.map(section => ({
    ...section,
    data: formatData(section.data, 3)
  }));

  const renderRow = ({ item }: { item: Channel[] }) => (
    <View style={styles.row}>
      {item.map(channelItem => (
        <React.Fragment key={channelItem.id + channelItem.url}>
          {renderItem({ item: channelItem })}
        </React.Fragment>
      ))}
      {/* Fill empty spaces in the last row to maintain grid alignment */}
      {Array.from({ length: 3 - item.length }).map((_, i) => (
        <View key={`empty-${i}`} style={styles.itemContainer} />
      ))}
    </View>
  );

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
      <SectionList
        sections={sectionsWithRows}
        renderItem={renderRow}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={(item, index) => index.toString()}
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
    flex: 1,
  },
  errorText: {
    color: '#FF3B30',
  },
  emptyText: {
    color: '#888',
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  itemContainer: {
    flex: 1,
    marginHorizontal: 5,
  },
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 8,
    overflow: 'hidden',
    alignItems: 'center',
    padding: 10,
    aspectRatio: 1,
  },
  logoContainer: {
    width: '100%',
    flex: 1,
    backgroundColor: 'transparent',
    borderRadius: 8,
    marginBottom: 8,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  infoRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoTextContainer: {
    flex: 1,
    paddingRight: 8,
  },
  name: {
    fontWeight: 'bold',
    fontSize: 12,
    textAlign: 'left',
  },
  epgButton: {
    padding: 6,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ChannelList;