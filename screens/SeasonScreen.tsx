import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, Season, Episode } from '../types';
import { useIPTV } from '../context/IPTVContext';
import { useSettings } from '../context/SettingsContext';

type SeasonScreenRouteProp = RouteProp<RootStackParamList, 'Season'>;
type SeasonScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Season'>;

const SeasonScreen = () => {
  const route = useRoute<SeasonScreenRouteProp>();
  const navigation = useNavigation<SeasonScreenNavigationProp>();
  const { getSeriesInfo, currentProfile } = useIPTV();
  const { colors } = useSettings();

  const { series } = route.params;
  const [seasons, setSeasons] = useState<Season[]>(series.seasons || []);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const fetchSeriesData = async () => {
      if (!currentProfile || currentProfile.type !== 'xtream') return;
      if (seasons.length > 0) return; // Already have data

      setLoading(true);
      const data = await getSeriesInfo(series.id);
      if (data && data.episodes) {
        const loadedSeasons: Record<string, Season> = {};

        // The Xtream API typically returns episodes mapped by season number
        // e.g. { "1": [episodes...], "2": [episodes...] }
        Object.keys(data.episodes).forEach(seasonNum => {
          const episodesArr = data.episodes[seasonNum];
          const parsedEpisodes: Episode[] = episodesArr.map((ep: any) => ({
            id: ep.id,
            name: ep.title || `Episode ${ep.episode_num}`,
            streamUrl: `${currentProfile.url.trim().replace(/\/+$/, '')}/series/${encodeURIComponent(currentProfile.username || '')}/${encodeURIComponent(currentProfile.password || '')}/${ep.id}.${ep.container_extension || 'mp4'}`,
            episodeNumber: ep.episode_num
          }));

          loadedSeasons[seasonNum] = {
            id: `${series.id}_s${seasonNum}`,
            name: `Season ${seasonNum}`,
            seasonNumber: parseInt(seasonNum, 10),
            episodes: parsedEpisodes
          };
        });

        setSeasons(Object.values(loadedSeasons));
      }
      setLoading(false);
    };

    fetchSeriesData();
  }, [series.id]);

  const handleSeasonPress = (season: Season) => {
    navigation.navigate('Episode', { season: season });
  };

  const renderItem = ({ item }: { item: Season }) => (
    <TouchableOpacity
      style={[styles.item, { borderBottomColor: colors.divider }]}
      onPress={() => handleSeasonPress(item)}
    >
      <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
      <Text style={[styles.count, { color: colors.textSecondary }]}>{item.episodes.length} Episodes</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={seasons}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  item: { padding: 15, borderBottomWidth: 1 },
  name: { fontSize: 16, fontWeight: 'bold' },
  count: { fontSize: 12, marginTop: 4 },
});

export default SeasonScreen;