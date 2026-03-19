import React from 'react';
import { View, StyleSheet, Text, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useIPTV } from '../context/IPTVContext';
import { Picker } from '@react-native-picker/picker';
import { useTranslation } from 'react-i18next';
import { IPTVProfile } from '../types';
import { useSettings } from '../context/SettingsContext';

import WelcomeScreen from './WelcomeScreen';
import ChannelList from '../components/ChannelList';
import MovieList from '../components/MovieList';
import SeriesList from '../components/SeriesList';
import FavoritesList from '../components/FavoritesList';
import RecentlyWatchedList from '../components/RecentlyWatchedList';
import HeroBanner from '../components/HeroBanner';
import SettingsScreen from './SettingsScreen';

const Drawer = createDrawerNavigator();

const MediaTabs = () => {
  const { t } = useTranslation();
  const { colors } = useSettings();
  const { channels, movies, series, favorites, recentlyWatched, isLoading, isAdultUnlocked, pin } = useIPTV();

  const filterAdult = (items: any[]) => items.filter(item => !item.isAdult || (pin && isAdultUnlocked));

  const safeChannels = filterAdult(channels);
  const safeMovies = filterAdult(movies);
  const safeSeries = filterAdult(series);

  if (isLoading) {
    return (
      <View style={[styles.centeredContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const totalCount = channels.length + movies.length + series.length;

  if (totalCount === 0) {
    return (
      <View style={[styles.centeredContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('emptyProfile')}</Text>
      </View>
    );
  }

  const dimensions = useWindowDimensions();
  const isTV = dimensions.width >= 768;

  return (
    <Drawer.Navigator
      screenOptions={{
        drawerStyle: {
          backgroundColor: colors.card,
          width: isTV ? 240 : 200,
          borderRightWidth: 1,
          borderRightColor: colors.divider,
        },
        drawerType: isTV ? 'permanent' : 'front',
        headerShown: !isTV,
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        drawerActiveTintColor: colors.primary,
        drawerInactiveTintColor: colors.textSecondary,
        sceneContainerStyle: { backgroundColor: colors.background },
      }}
    >
      {safeChannels.length > 0 && (
        <Drawer.Screen
          name="Channels"
          component={ChannelList}
          options={{ title: `${t('channels')} (${safeChannels.length})` }}
        />
      )}
      {safeMovies.length > 0 && (
        <Drawer.Screen
          name="Movies"
          component={MovieList}
          options={{ title: `${t('movies')} (${safeMovies.length})` }}
        />
      )}
      {safeSeries.length > 0 && (
        <Drawer.Screen
          name="Series"
          component={SeriesList}
          options={{ title: `${t('series')} (${safeSeries.length})` }}
        />
      )}
      {favorites.length > 0 && (
        <Drawer.Screen
          name="Favorites"
          component={FavoritesList}
          options={{ title: `${t('favorites')} (${favorites.length})` }}
        />
      )}
      {recentlyWatched.length > 0 && (
        <Drawer.Screen
          name="Recent"
          component={RecentlyWatchedList}
          options={{ title: `${t('recent')} (${recentlyWatched.length})` }}
        />
      )}
      <Drawer.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
    </Drawer.Navigator>
  );
};

const HomeScreen = () => {
  const { t } = useTranslation();
  const { colors } = useSettings();
  const { currentProfile, unloadProfile, profiles, loadProfile, channels, movies, series, pin } = useIPTV();
  const navigation = useNavigation<any>();

  React.useEffect(() => {
    if (currentProfile && !pin) {
      const hasAdultContent = channels.some(c => c.isAdult) || movies.some(m => m.isAdult) || series.some(s => s.isAdult);
      if (hasAdultContent) {
        navigation.navigate('PinSetup');
      }
    }
  }, [currentProfile, channels, movies, series, pin, navigation]);

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
      console.log(t('changingProfile'), selectedProfile.name);
      loadProfile(selectedProfile);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {currentProfile ? (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.divider }]}>
            <Picker
              selectedValue={currentProfile.id}
              onValueChange={(itemValue) => onProfileChange(itemValue)}
              style={[styles.picker, { backgroundColor: colors.card, color: colors.text }]}
              dropdownIconColor={colors.text}
            >
              {profiles.map((profile: IPTVProfile) => (
                <Picker.Item
                  key={profile.id}
                  label={profile.name}
                  value={profile.id}
                  color={Platform.OS === 'ios' ? colors.text : undefined} // picker item color handling depends on OS
                />
              ))}
              <Picker.Item
                key="pin"
                label={t('pinControl')}
                value="pin_setup"
                color={colors.error}
              />
              <Picker.Item
                key="logout"
                label={t('manageProfiles')}
                value={null}
                color={colors.textSecondary}
              />
            </Picker>
          </View>
          <MediaTabs />
        </View>
      ) : (
        <WelcomeScreen />
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
    backgroundColor: '#222',
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