import React, { forwardRef, useImperativeHandle } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Text, Image, useWindowDimensions } from 'react-native';
import { useIPTV } from '../context/IPTVContext';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App';
import { RecentlyWatchedItem } from '../types';
import { useSettings } from '../context/SettingsContext';
import { MaterialIcons as Icon } from '@expo/vector-icons';
export type ContentRef = { focusFirstItem: () => void };

type RecentlyWatchedScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

const RecentlyWatchedList = forwardRef<ContentRef, { onReturnToSidebar?: () => void }>((props, ref) => {
  const { recentlyWatched, removeRecentlyWatched, playStream, addRecentlyWatched } = useIPTV();
  const { colors } = useSettings();
  const navigation = useNavigation<RecentlyWatchedScreenNavigationProp>();
  const dimensions = useWindowDimensions();
  const isTvMode = dimensions.width >= 1200;

  // Expose focusFirstItem method to parent
  useImperativeHandle(ref, () => ({
    focusFirstItem: () => {
      // Focus the first item when entering from sidebar
    }
  }));

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
        accessible={true}
        isTVSelectable={true}
        accessibilityRole="button"
        accessibilityLabel={`${getTypeLabel(item.type)}: ${item.name}`}
        accessibilityHint={`Plays the ${item.type}`}
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
            accessible={true}
            isTVSelectable={true}
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
        keyExtractor={(item, index) => `${item.id || index}-${item.type || 'unknown'}`}
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
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 20,
    marginTop: 20,
    textAlign: 'center',
    fontWeight: '600',
  },
  emptyHint: {
    fontSize: 14,
    marginTop: 10,
    textAlign: 'center',
    opacity: 0.7,
    lineHeight: 22,
  },
  listContainer: {
    padding: 16,
  },
  card: {
    flex: 1,
    margin: 8,
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
    padding: 12,
    // Shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: 14,
    marginBottom: 10,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#18181B',
  },
  typeBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 26,
    height: 26,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#7C4DFF',
    borderBottomLeftRadius: 14,
  },
  continueBadge: {
    position: 'absolute',
    bottom: 14,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 26,
    height: 26,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 4,
    fontWeight: '500',
  },
  episodeInfo: {
    fontSize: 11,
    marginBottom: 3,
    fontWeight: '500',
  },
  metaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 6,
  },
  typeLabel: {
    fontSize: 11,
    flex: 1,
    fontWeight: '500',
  },
  timeAgo: {
    fontSize: 11,
    textAlign: 'right',
    flex: 1,
  }
});

export default RecentlyWatchedList;
