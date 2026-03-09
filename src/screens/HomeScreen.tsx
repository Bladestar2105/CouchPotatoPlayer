import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, ListRenderItemInfo } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { useAppStore } from '../store';
import { XtreamService } from '../services/xtream';
import { M3UService } from '../services/m3u';
import { Category, LiveChannel } from '../types/iptv';
import { Tv, PlaySquare, FileVideo, LayoutList } from 'lucide-react-native';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

export const HomeScreen = () => {
  const { config, categories, channels, setCategories, setChannels } = useAppStore();
  const navigation = useNavigation<NavigationProp>();
  const [loading, setLoading] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!config) return;
      setLoading(true);

      try {
        if (config.type === 'xtream') {
          const xtream = new XtreamService(config);
          const catData = await xtream.getLiveCategories();
          setCategories(catData);
          if (catData.length > 0) {
            setSelectedCategoryId(catData[0].category_id);
          }
        } else if (config.type === 'm3u') {
          const m3uService = new M3UService(config);
          const { categories, channels } = await m3uService.parsePlaylist();
          setCategories(categories);
          setChannels(channels);
          if (categories.length > 0) {
            setSelectedCategoryId(categories[0].category_id);
          }
        }
      } catch (error) {
        console.error('Failed to load data', error);
      } finally {
        setLoading(false);
      }
    };

    if (config) {
      fetchData();
    }
  }, [config, setCategories, setChannels]);

  useEffect(() => {
    const fetchChannels = async () => {
      if (!config || !selectedCategoryId) return;
      if (config.type === 'm3u') return; // M3U channels are pre-loaded

      try {
        const xtream = new XtreamService(config);
        const channelData = await xtream.getLiveStreams(selectedCategoryId);
        setChannels(channelData);
      } catch (error) {
        console.error('Failed to load channels', error);
      }
    };

    if (selectedCategoryId && config?.type === 'xtream') {
      fetchChannels();
    }
  }, [selectedCategoryId, config, setChannels]);

  const handleChannelPress = (channel: LiveChannel) => {
    navigation.navigate('LivePlayer', {
      channelId: channel.stream_id,
      channelName: channel.name,
      extension: channel.stream_type === 'live' ? 'ts' : 'm3u8',
      directSource: channel.direct_source
    });
  };

  const handleChannelLongPress = (channel: LiveChannel) => {
    navigation.navigate('Epg', {
      channelId: config?.type === 'm3u' ? (channel.epg_channel_id as any) : channel.stream_id
    });
  };

  const displayedChannels = config?.type === 'm3u'
    ? channels.filter(c => c.category_id === selectedCategoryId)
    : channels;

  const renderCategory = ({ item }: ListRenderItemInfo<Category>) => {
    const isSelected = item.category_id === selectedCategoryId;

    return (
      <TouchableOpacity
        style={[styles.categoryItem, isSelected && styles.categoryItemSelected]}
        onFocus={() => setSelectedCategoryId(item.category_id)}
        onPress={() => setSelectedCategoryId(item.category_id)}
      >
        <Text style={[styles.categoryText, isSelected && styles.categoryTextSelected]} numberOfLines={1}>
          {item.category_name}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderChannel = ({ item }: ListRenderItemInfo<LiveChannel>) => {
    return (
      <TouchableOpacity
        style={styles.channelCard}
        onPress={() => handleChannelPress(item)}
        onLongPress={() => handleChannelLongPress(item)}
      >
        <View style={styles.channelImageContainer}>
          {item.stream_icon ? (
            <Image
              source={{ uri: item.stream_icon }}
              style={styles.channelIcon}
              resizeMode="contain"
              defaultSource={require('../../assets/images/placeholder.png')}
            />
          ) : (
            <Tv size={48} color="#444" />
          )}
        </View>
        <Text style={styles.channelName} numberOfLines={2}>
          {item.name}
        </Text>
      </TouchableOpacity>
    );
  };

  if (loading && categories.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Sidebar Navigation */}
      <View style={styles.sidebar}>
        <View style={styles.logoContainer}>
          <PlaySquare color="#007AFF" size={40} />
          <Text style={styles.logoText}>CPP</Text>
        </View>

        <View style={styles.navItems}>
          <TouchableOpacity style={[styles.navItem, styles.navItemSelected]}>
            <Tv color="#FFF" size={24} />
            <Text style={styles.navItemText}>Live TV</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <FileVideo color="#888" size={24} />
            <Text style={styles.navItemTextInactive}>Movies</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <LayoutList color="#888" size={24} />
            <Text style={styles.navItemTextInactive}>Series</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content Area */}
      <View style={styles.mainContent}>
        {/* Categories Header */}
        <View style={styles.categoriesContainer}>
          <FlatList
            horizontal
            data={categories}
            keyExtractor={(item) => item.category_id}
            renderItem={renderCategory}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesList}
          />
        </View>

        {/* Channels Grid */}
        <View style={styles.channelsContainer}>
          {displayedChannels.length === 0 ? (
            <View style={styles.emptyContainer}>
              <ActivityIndicator size="large" color="#444" />
              <Text style={styles.emptyText}>No channels found...</Text>
            </View>
          ) : (
            <FlatList
              data={displayedChannels}
              keyExtractor={(item) => item.stream_id.toString()}
              renderItem={renderChannel}
              numColumns={4}
              showsVerticalScrollIndicator={false}
              columnWrapperStyle={styles.channelsRow}
              contentContainerStyle={styles.channelsList}
            />
          )}
        </View>
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
    width: 250,
    backgroundColor: '#1C1C1E',
    paddingTop: 40,
    paddingHorizontal: 20,
    borderRightWidth: 1,
    borderRightColor: '#2C2C2E',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 60,
  },
  logoText: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: 'bold',
    marginLeft: 15,
  },
  navItems: {
    flex: 1,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  navItemSelected: {
    backgroundColor: '#2C2C2E',
  },
  navItemText: {
    color: '#FFF',
    fontSize: 20,
    marginLeft: 15,
    fontWeight: '600',
  },
  navItemTextInactive: {
    color: '#888',
    fontSize: 20,
    marginLeft: 15,
  },
  mainContent: {
    flex: 1,
    flexDirection: 'column',
  },
  categoriesContainer: {
    height: 100,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
    justifyContent: 'center',
  },
  categoriesList: {
    paddingHorizontal: 30,
    alignItems: 'center',
  },
  categoryItem: {
    paddingHorizontal: 25,
    paddingVertical: 12,
    marginRight: 15,
    borderRadius: 25,
    backgroundColor: '#1C1C1E',
  },
  categoryItemSelected: {
    backgroundColor: '#007AFF',
  },
  categoryText: {
    color: '#AAA',
    fontSize: 18,
    fontWeight: '500',
  },
  categoryTextSelected: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  channelsContainer: {
    flex: 1,
  },
  channelsList: {
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#888',
    fontSize: 18,
    marginTop: 20,
  }
});
