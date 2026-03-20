import React from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Text, Image, useWindowDimensions } from 'react-native';
import { useIPTV } from '../context/IPTVContext';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App';
import { RecentlyWatchedItem } from '../types';
import { useSettings } from '../context/SettingsContext';
import { MaterialIcons as Icon } from '@expo/vector-icons';

type RecentlyWatchedScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

const RecentlyWatchedList = () => {
  const { recentlyWatched, removeRecentlyWatched, playStream, addRecentlyWatched } = useIPTV();
  const { colors } = useSettings();
  const navigation = useNavigation<RecentlyWatchedScreenNavigationProp>();
  const dimensions = useWindowDimensions();
  const isTvMode = dimensions.width >= 1200;

  const handlePress = (item: RecentlyWatchedItem) => {
    // Update last watched time
    addRecentlyWatched({
      ...item,
      lastWatchedAt: Date.now(),
    });

    if (item.type === 'live') {
      playStream({ url: '', id: item.id });
      navigation.navigate('Player');
    } else if (item.type === 'vod') {
      navigation.navigate('MediaInfo', { 
        id: item.id, 
        type: 'vod',
        title: item.name,
        cover: item.icon 
      });
    } else if (item.type === 'series') {
      navigation.navigate('MediaInfo', { 
        id: item.id, 
        type: 'series',
        title: item.name,
        cover: item.icon 
      });
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'live': return 'tv';
      case 'vod': return 'movie';
      case 'series': return 'list';
      default: return 'play-circle';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'live': return 'Live TV';
      case 'vod': return 'Film';
      case 'series': return 'Serie';
      default: return '';
    }
  };

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `vor ${minutes} Min.`;
    if (hours < 24) return `vor ${hours} Std.`;
    return `vor ${days} Tag${days > 1 ? 'en' : ''}`;
  };

  const renderItem = ({ item }: { item: RecentlyWatchedItem }) => {
    // Calculate progress percentage
    const progressPercent = (item.position && item.duration && item.duration > 0)
      ? (item.position / item.duration) * 100
      : 0;

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.card }]}
        onPress={() => handlePress(item)}
      >
        <View style={[styles.imageContainer, { backgroundColor: colors.surface }]}>
          {item.icon ? (
            <Image
              source={{ uri: item.icon }}
              style={styles.image}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.placeholderImage}>
              <Icon name={getTypeIcon(item.type)} size={32} color={colors.textSecondary} />
            </View>
          )}
          
          {/* Type Badge */}
          <View style={[styles.typeBadge, { backgroundColor: item.type === 'live' ? '#4CAF50' : item.type === 'vod' ? '#2196F3' : '#FF9800' }]}>
            <Icon name={getTypeIcon(item.type)} size={12} color="#FFF" />
          </View>
          
          {/* Progress Bar (for VOD and Series) */}
          {progressPercent > 0 && item.type !== 'live' && (
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, { width: `${progressPercent}%` }]} />
            </View>
          )}
          
          {/* Continue Watching Badge */}
          {progressPercent > 5 && progressPercent < 95 && item.type !== 'live' && (
            <View style={styles.continueBadge}>
              <Icon name="play-arrow" size={14} color="#FFF" />
            </View>
          )}
          
          {/* Remove Button */}
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => removeRecentlyWatched(item.id)}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${item.name} from recently watched`}
          >
            <Icon name="close" size={16} color="#FFF" />
          </TouchableOpacity>
        </View>
        
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>{item.name}</Text>
        
        {/* Episode Info for Series */}
        {item.type === 'series' && item.seasonNumber && item.episodeNumber && (
          <Text style={[styles.episodeInfo, { color: colors.textSecondary }]}>
            S{item.seasonNumber} E{item.episodeNumber}
          </Text>
        )}
        
        <View style={styles.metaContainer}>
          <Text style={[styles.typeLabel, { color: colors.textSecondary }]}>{getTypeLabel(item.type)}</Text>
          <Text style={[styles.timeAgo, { color: colors.textSecondary }]}>
            {formatTimeAgo(item.lastWatchedAt)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (recentlyWatched.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.background }]}>
        <Icon name="history" size={64} color={colors.textSecondary} />
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Kein Verlauf vorhanden.</Text>
        <Text style={[styles.emptyHint, { color: colors.textSecondary }]}>Schaue Kanäle, Filme oder Serien, um sie hier zu sehen.</Text>
      </View>
    );
  }

  const numColumns = isTvMode ? 6 : 3;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={recentlyWatched}
        keyExtractor={(item) => `${item.id}-${item.type}`}
        renderItem={renderItem}
        numColumns={numColumns}
        key={numColumns}
        contentContainerStyle={styles.listContainer}
        initialNumToRender={12}
        maxToRenderPerBatch={12}
        windowSize={5}
        removeClippedSubviews={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    marginTop: 16,
    textAlign: 'center',
  },
  emptyHint: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    opacity: 0.7,
  },
  listContainer: {
    padding: 10,
  },
  card: {
    flex: 1,
    margin: 5,
    borderRadius: 8,
    overflow: 'hidden',
    alignItems: 'center',
    padding: 10,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: 8,
    marginBottom: 8,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#2196F3',
  },
  continueBadge: {
    position: 'absolute',
    bottom: 12,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(33, 150, 243, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 2,
  },
  episodeInfo: {
    fontSize: 10,
    marginBottom: 2,
  },
  metaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 4,
  },
  typeLabel: {
    fontSize: 10,
    flex: 1,
  },
  timeAgo: {
    fontSize: 10,
    textAlign: 'right',
    flex: 1,
  }
});

export default RecentlyWatchedList;