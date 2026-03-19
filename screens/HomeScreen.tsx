import React from 'react';
import { View, StyleSheet, Text, Platform, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useIPTV } from '../context/IPTVContext';
import { Picker } from '@react-native-picker/picker';
import { useTranslation } from 'react-i18next';
import { IPTVProfile } from '../types';
import { useSettings } from '../context/SettingsContext';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { ScrollView } from 'react-native-gesture-handler';

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
  const { channels, movies, series, favorites, recentlyWatched, isLoading, isAdultUnlocked, pin, profiles, currentProfile, loadProfile } = useIPTV();
  const dimensions = useWindowDimensions();
  const navigation = useNavigation<any>();

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

  const isTV = dimensions.width >= 768;

  return (
    <Drawer.Navigator
      screenOptions={{
        drawerStyle: {
          backgroundColor: '#1C1C1E',
          width: isTV ? 240 : 200,
          borderRightWidth: 1,
          borderRightColor: '#2C2C2E',
        },
        drawerType: isTV ? 'permanent' : 'front',
        headerShown: !isTV,
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        drawerActiveTintColor: colors.primary,
        drawerInactiveTintColor: colors.textSecondary,
      }}
      drawerContent={(props) => {
        const { state, descriptors, navigation } = props;
        return (
          <View style={{ flex: 1, backgroundColor: '#1C1C1E' }}>
            <ScrollView style={{ flex: 1 }}>
              <View style={{ padding: 16, paddingTop: Platform.OS === 'ios' ? 40 : 16 }}>
                <Text style={{ color: '#888', fontSize: 12, marginBottom: 8, textTransform: 'uppercase', fontWeight: 'bold' }}>MENU</Text>
                {state.routes.map((route, index) => {
                  const { options } = descriptors[route.key];
                  const label = options.title !== undefined ? options.title : route.name;
                  const isFocused = state.index === index;

                  const onPress = () => {
                    if (!isFocused) {
                      navigation.navigate(route.name);
                    }
                  };

                  let icon: any = 'dns';
                  if (route.name === 'Channels') icon = 'tv';
                  if (route.name === 'Movies') icon = 'movie';
                  if (route.name === 'Series') icon = 'list';
                  if (route.name === 'Favorites') icon = 'favorite';
                  if (route.name === 'Recent') icon = 'history';
                  if (route.name === 'Settings') icon = 'settings';

                  return (
                    <TouchableOpacity
                      key={route.key}
                      onPress={onPress}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 12,
                        paddingHorizontal: 12,
                        backgroundColor: isFocused ? 'rgba(0, 122, 255, 0.3)' : 'transparent',
                        borderRadius: 8,
                        marginBottom: 4,
                      }}
                    >
                      <Icon name={icon as any} size={24} color={isFocused ? '#FFF' : '#888'} />
                      <Text style={{ color: isFocused ? '#FFF' : '#888', marginLeft: 16, fontWeight: isFocused ? 'bold' : 'normal' }}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}

                <View style={{ height: 1, backgroundColor: '#2C2C2E', marginVertical: 16 }} />
                <Text style={{ color: '#888', fontSize: 12, marginBottom: 8, textTransform: 'uppercase', fontWeight: 'bold' }}>PROVIDERS</Text>

                {profiles.map(p => {
                  const isCurrent = currentProfile?.id === p.id;

                  // Map flutter icon names to valid MaterialIcons
                  let iconName = p.icon || 'dns';
                  const validIcons = ['tv', 'movie', 'star', 'public', 'dns', 'live-tv', 'sports-soccer', 'music-note', 'child-care', 'business'];
                  if (!validIcons.includes(iconName.replace('_', '-'))) {
                      iconName = 'dns';
                  }

                  return (
                    <TouchableOpacity
                      key={p.id}
                      onPress={() => loadProfile(p)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 12,
                        paddingHorizontal: 12,
                        backgroundColor: isCurrent ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                        borderRadius: 8,
                        marginBottom: 4,
                      }}
                    >
                      <Icon name={iconName.replace('_', '-') as any} size={24} color={isCurrent ? '#FFF' : '#888'} />
                      <Text style={{ color: isCurrent ? '#FFF' : '#888', marginLeft: 16, fontWeight: isCurrent ? 'bold' : 'normal' }}>
                        {p.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        );
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
          <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.divider, flexDirection: 'row', alignItems: 'center' }]}>
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
            <TouchableOpacity onPress={() => navigation.navigate('Search')} style={{ paddingRight: 16 }}>
              <Text style={{ fontSize: 24 }}>🔍</Text>
            </TouchableOpacity>
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
    flex: 1,
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