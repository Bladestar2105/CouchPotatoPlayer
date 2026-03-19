import React from 'react';
import {
  View, Text, SectionList, TouchableOpacity, StyleSheet,
  Image, ActivityIndicator
} from 'react-native';
import { useIPTV } from '../context/IPTVContext';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App';
import { Series } from '../types';

const defaultLogo = require('../assets/icon.png');

type SeriesListNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

const SeriesList = () => {
  const { series, isLoading, pin, isAdultUnlocked } = useIPTV();
  const navigation = useNavigation<SeriesListNavigationProp>();

  const handleSeriesPress = (series: Series) => {
    // @ts-ignore
    navigation.navigate('MediaInfo', { id: series.id, type: 'series', title: series.name, cover: series.cover });
  };

  const groupedData = React.useMemo(() => {
    if (series.length === 0) return [];

    const safeSeries = series.filter(s => !s.isAdult || isAdultUnlocked || !pin);

    const groups = safeSeries.reduce((acc, series) => {
      const groupTitle = series.group || 'Inconnu';
      if (!acc[groupTitle]) {
        acc[groupTitle] = [];
      }
      acc[groupTitle].push(series);
      return acc;
    }, {} as Record<string, Series[]>);

    return Object.keys(groups).sort().map(title => ({
      title: title,
      data: groups[title]
    }));
  }, [series, pin, isAdultUnlocked]);

  const renderItem = ({ item }: { item: Series }) => (
    <View style={styles.itemContainer}>
      <TouchableOpacity
        style={styles.card}
        onPress={() => handleSeriesPress(item)}
      >
        <Image
          style={styles.logo}
          source={item.cover ? { uri: item.cover } : defaultLogo}
          defaultSource={defaultLogo}
          resizeMode="cover"
        />
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
          <Text style={styles.count}>{item.seasons.length} Saison(s)</Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  // Group items into rows of 3
  const formatData = (data: Series[], numColumns: number) => {
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

  const renderRow = ({ item }: { item: Series[] }) => (
    <View style={styles.row}>
      {item.map(seriesItem => (
        <React.Fragment key={seriesItem.id}>
          {renderItem({ item: seriesItem })}
        </React.Fragment>
      ))}
      {/* Fill empty spaces in the last row to maintain grid alignment */}
      {Array.from({ length: 3 - item.length }).map((_, i) => (
        <View key={`empty-${i}`} style={styles.itemContainer} />
      ))}
    </View>
  );

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
  if (series.length === 0) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.emptyText}>Aucune série trouvée.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SectionList
        sections={sectionsWithRows}
        renderItem={renderRow}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={(item, index) => index.toString()}
        stickySectionHeadersEnabled={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  header: { fontSize: 16, fontWeight: 'bold', color: '#FFF', backgroundColor: '#222', padding: 10 },
  centered: { justifyContent: 'center', alignItems: 'center', flex: 1 },
  emptyText: { color: '#888', textAlign: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 5 },
  itemContainer: { flex: 1, marginHorizontal: 5 },
  card: { backgroundColor: '#1C1C1E', borderRadius: 8, overflow: 'hidden', aspectRatio: 2/3 },
  logo: { width: '100%', height: '100%', backgroundColor: '#333' },
  info: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.7)', padding: 8 },
  name: { color: '#FFF', fontSize: 12, fontWeight: 'bold', textAlign: 'center' },
  count: { color: '#AAA', fontSize: 10, marginTop: 4, textAlign: 'center' },
});

export default SeriesList;