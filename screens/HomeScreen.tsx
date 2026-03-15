import React from 'react';
import { View, StyleSheet, Text, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useIPTV } from '../context/IPTVContext';
import { Picker } from '@react-native-picker/picker';
import { IPTVProfile } from '../types';

import PlaylistManager from '../components/PlaylistManager';
import ChannelList from '../components/ChannelList';
import MovieList from '../components/MovieList';
import SeriesList from '../components/SeriesList';
import FavoritesList from '../components/FavoritesList';
import RecentlyWatchedList from '../components/RecentlyWatchedList';
import HeroBanner from '../components/HeroBanner';

const Drawer = createDrawerNavigator();

const MediaTabs = () => {
  const { channels, movies, series, favorites, recentlyWatched, isLoading, isAdultUnlocked, pin } = useIPTV();

  const filterAdult = (items: any[]) => items.filter(item => !item.isAdult || isAdultUnlocked || !pin);

  const safeChannels = filterAdult(channels);
  const safeMovies = filterAdult(movies);
  const safeSeries = filterAdult(series);

  if (isLoading) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#FFF" />
      </View>
    );
  }

  const totalCount = channels.length + movies.length + series.length;

  if (totalCount === 0) {
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.emptyText}>Ce profil est vide ou n'a pas pu être analysé.</Text>
      </View>
    );
  }

  const dimensions = useWindowDimensions();
  const isTV = dimensions.width >= 768;

  return (
    <Drawer.Navigator
      screenOptions={{
        drawerStyle: {
          backgroundColor: '#1A1A1A',
          width: isTV ? 240 : 200,
        },
        drawerType: isTV ? 'permanent' : 'front',
        headerShown: !isTV,
        headerStyle: { backgroundColor: '#1A1A1A' },
        headerTintColor: '#FFF',
        drawerActiveTintColor: '#FFF',
        drawerInactiveTintColor: '#888',
        sceneContainerStyle: { backgroundColor: '#121212' },
      }}
    >
      {safeChannels.length > 0 && (
        <Drawer.Screen
          name="Chaînes"
          component={ChannelList}
          options={{ title: `Chaînes (${safeChannels.length})` }}
        />
      )}
      {safeMovies.length > 0 && (
        <Drawer.Screen
          name="Films"
          component={MovieList}
          options={{ title: `Films (${safeMovies.length})` }}
        />
      )}
      {safeSeries.length > 0 && (
        <Drawer.Screen
          name="Séries"
          component={SeriesList}
          options={{ title: `Séries (${safeSeries.length})` }}
        />
      )}
      {favorites.length > 0 && (
        <Drawer.Screen
          name="Favoris"
          component={FavoritesList}
          options={{ title: `Favoris (${favorites.length})` }}
        />
      )}
      {recentlyWatched.length > 0 && (
        <Drawer.Screen
          name="Récents"
          component={RecentlyWatchedList}
          options={{ title: `Récents (${recentlyWatched.length})` }}
        />
      )}
    </Drawer.Navigator>
  );
};

const HomeScreen = () => {
  const { currentProfile, unloadProfile, profiles, loadProfile } = useIPTV();
  const navigation = useNavigation<any>();

  const onProfileChange = (profileId: string | null) => {
    if (!profileId) {
      unloadProfile();
      return;
    }
    if (profileId === 'pin_setup') {
       navigation.navigate('PinSetup');
       return;
    }
    const selectedProfile = profiles.find(p => p.id === profileId);
    if (selectedProfile && selectedProfile.id !== currentProfile?.id) {
      console.log("Changement de profil via le menu...", selectedProfile.name);
      loadProfile(selectedProfile);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {currentProfile ? (
        <View style={styles.container}>
          <View style={styles.header}>
            <Picker
              selectedValue={currentProfile.id}
              onValueChange={(itemValue) => onProfileChange(itemValue)}
              style={styles.picker}
              dropdownIconColor="#FFF"
            >
              {profiles.map((profile: IPTVProfile) => (
                <Picker.Item
                  key={profile.id}
                  label={profile.name}
                  value={profile.id}
                  color={Platform.OS === 'android' ? '#000' : '#FFF'}
                />
              ))}
              <Picker.Item
                key="pin"
                label="Contrôle Parental (PIN)"
                value="pin_setup"
                color={Platform.OS === 'android' ? '#F00' : '#F55'}
              />
              <Picker.Item
                key="logout"
                label="Gérer les profils (Déconnexion)"
                value={null}
                color={Platform.OS === 'android' ? '#555' : '#AAA'}
              />
            </Picker>
          </View>
          <HeroBanner />
          <MediaTabs />
        </View>
      ) : (
        <PlaylistManager />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    backgroundColor: '#1A1A1A',
    paddingHorizontal: Platform.OS === 'ios' ? 0 : 10,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  picker: {
    height: 50,
    width: '100%',
    color: '#FFF',
    backgroundColor: '#1A1A1A',
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
  }
});

export default HomeScreen;