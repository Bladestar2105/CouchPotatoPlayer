import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, Series } from '../types';
import { useIPTV } from '../context/IPTVContext';
import { useSettings } from '../context/SettingsContext';

type MediaInfoRouteProp = RouteProp<RootStackParamList, 'MediaInfo'>;

const defaultLogo = require('../assets/icon.png');

const MediaInfoScreen = () => {
  const route = useRoute<MediaInfoRouteProp>();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { id, type, title, cover, streamUrl } = route.params;
  const { getVodInfo, getSeriesInfo, playStream, series } = useIPTV();
  const { colors } = useSettings();

  const [info, setInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set dynamic title
    navigation.setOptions({ title: title });

    const fetchInfo = async () => {
      setLoading(true);
      let data = null;
      if (type === 'vod') {
        data = await getVodInfo(id);
      } else if (type === 'series') {
        data = await getSeriesInfo(id);
      }
      if (data && data.info) {
        setInfo(data.info);
      }
      setLoading(false);
    };

    fetchInfo();
  }, [id, type, title, navigation]);

  const handlePlay = () => {
    if (type === 'vod' && streamUrl) {
      playStream({ url: streamUrl, id });
      navigation.navigate('Player');
    } else if (type === 'series') {
      const seriesObj = series.find(s => s.id === id);
      if (seriesObj) {
        navigation.navigate('Season', { series: seriesObj });
      }
    }
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Image
          source={cover ? { uri: cover } : defaultLogo}
          style={styles.cover}
          resizeMode="cover"
        />
        <View style={styles.overlay}>
          <TouchableOpacity
            style={[styles.playButton, { backgroundColor: colors.primary }]}
            onPress={handlePlay}
          >
            <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 16 }}>
              {type === 'series' ? 'Episodes' : 'Play'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.detailsContainer}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>

        {info ? (
          <>
            <View style={styles.metaRow}>
              {info.year && <Text style={[styles.metaText, { color: colors.textSecondary }]}>{info.year}</Text>}
              {info.rating && info.rating !== "0" && <Text style={[styles.metaText, { color: colors.textSecondary }]}> ⭐ {info.rating}</Text>}
              {info.duration && <Text style={[styles.metaText, { color: colors.textSecondary }]}> ⏱ {info.duration}</Text>}
              {info.genre && <Text style={[styles.metaText, { color: colors.textSecondary }]}> 🎭 {info.genre}</Text>}
            </View>

            {info.plot && (
              <Text style={[styles.plot, { color: colors.textSecondary }]}>{info.plot}</Text>
            )}

            {info.cast && (
              <View style={styles.infoRow}>
                <Text style={[styles.label, { color: colors.text }]}>Cast: </Text>
                <Text style={[styles.value, { color: colors.textSecondary }]}>{info.cast}</Text>
              </View>
            )}

            {info.director && (
              <View style={styles.infoRow}>
                <Text style={[styles.label, { color: colors.text }]}>Director: </Text>
                <Text style={[styles.value, { color: colors.textSecondary }]}>{info.director}</Text>
              </View>
            )}
          </>
        ) : (
          <Text style={{ color: colors.textSecondary, marginTop: 10 }}>No additional details available.</Text>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    width: '100%',
    height: 300,
    position: 'relative',
  },
  cover: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 20,
    // Add a simple gradient equivalent using a dark semi-transparent view
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  playButton: {
    paddingHorizontal: 40,
    paddingVertical: 12,
    borderRadius: 24,
    elevation: 3,
  },
  detailsContainer: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
    gap: 10,
  },
  metaText: {
    fontSize: 14,
  },
  plot: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  label: {
    fontWeight: 'bold',
    marginRight: 4,
  },
  value: {
    flex: 1,
  },
});

export default MediaInfoScreen;
