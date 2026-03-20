import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, Platform, ActivityIndicator, TouchableOpacity, useWindowDimensions, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useIPTV } from '../context/IPTVContext';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../context/SettingsContext';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { ScrollView } from 'react-native-gesture-handler';

import WelcomeScreen from './WelcomeScreen';
import ChannelList from '../components/ChannelList';
import MovieList from '../components/MovieList';
import SeriesList from '../components/SeriesList';
import FavoritesList from '../components/FavoritesList';
import RecentlyWatchedList from '../components/RecentlyWatchedList';
import SettingsScreen from './SettingsScreen';

const MainLayout = () => {
  const { t } = useTranslation();
  const { colors } = useSettings();
  const { channels, movies, series, isLoading, profiles, currentProfile, loadProfile } = useIPTV();
  const dimensions = useWindowDimensions();
  const navigation = useNavigation<any>();

  const isSmallScreen = dimensions.width < 768;
  const [activeTab, setActiveTab] = useState<'channels' | 'movies' | 'series' | 'favorites' | 'recent' | 'settings'>('channels');

  // Animation values for the sidebar expansion
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(!isSmallScreen);
  const sidebarWidth = React.useRef(new Animated.Value(isSmallScreen ? 60 : 200)).current;

  useEffect(() => {
    Animated.timing(sidebarWidth, {
      toValue: isSidebarExpanded ? 200 : 60,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [isSidebarExpanded, isSmallScreen]);

  useEffect(() => {
    if (isSmallScreen) {
      setIsSidebarExpanded(false);
    } else {
      setIsSidebarExpanded(true);
    }
  }, [isSmallScreen]);

  if (isLoading) {
    return (
      <View style={[styles.centeredContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const handleTabPress = (tab: any) => {
    setActiveTab(tab);
    if (isSmallScreen && isSidebarExpanded) {
      setIsSidebarExpanded(false);
    } else if (isSmallScreen && !isSidebarExpanded) {
      // If clicking while collapsed, we just change tab. We don't auto-expand unless they click a hamburger menu
      // Or we can say: clicking a tab ALWAYS collapses the menu on mobile.
      setIsSidebarExpanded(false);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'channels': return <ChannelList />;
      case 'movies': return <MovieList />;
      case 'series': return <SeriesList />;
      case 'favorites': return <FavoritesList />;
      case 'recent': return <RecentlyWatchedList />;
      case 'settings': return <SettingsScreen />;
      default: return <ChannelList />;
    }
  };

  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: colors.background }}>
      {/* Sidebar */}
      <Animated.View style={[styles.sidebar, { width: sidebarWidth, backgroundColor: '#1C1C1E', borderRightColor: '#2C2C2E' }]}>
        <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ paddingVertical: 16 }}>
            {isSmallScreen && (
              <TouchableOpacity
                onPress={() => setIsSidebarExpanded(!isSidebarExpanded)}
                style={styles.menuItem}
                accessibilityRole="button"
                accessibilityLabel="Toggle Sidebar"
              >
                <Icon name="menu" size={24} color="#FFF" style={styles.menuIcon} />
              </TouchableOpacity>
            )}

            {(isSidebarExpanded || !isSmallScreen) && <Text style={styles.sidebarSectionTitle}>MENU</Text>}

            <SidebarItem icon="tv" label={t('channels')} isActive={activeTab === 'channels'} onPress={() => handleTabPress('channels')} showLabel={isSidebarExpanded} />
            <SidebarItem icon="movie" label={t('movies')} isActive={activeTab === 'movies'} onPress={() => handleTabPress('movies')} showLabel={isSidebarExpanded} />
            <SidebarItem icon="list" label={t('series')} isActive={activeTab === 'series'} onPress={() => handleTabPress('series')} showLabel={isSidebarExpanded} />
            <SidebarItem icon="favorite" label={t('favorites')} isActive={activeTab === 'favorites'} onPress={() => handleTabPress('favorites')} showLabel={isSidebarExpanded} />
            <SidebarItem icon="history" label={t('recent')} isActive={activeTab === 'recent'} onPress={() => handleTabPress('recent')} showLabel={isSidebarExpanded} />
            <SidebarItem icon="settings" label={t('settings')} isActive={activeTab === 'settings'} onPress={() => handleTabPress('settings')} showLabel={isSidebarExpanded} />

            <View style={{ height: 1, backgroundColor: '#2C2C2E', marginVertical: 16 }} />
            {(isSidebarExpanded || !isSmallScreen) && <Text style={styles.sidebarSectionTitle}>PROVIDERS</Text>}

            {profiles.map(p => {
              const isCurrent = currentProfile?.id === p.id;
              let iconName = p.icon || 'dns';
              const validIcons = ['tv', 'movie', 'star', 'public', 'dns', 'live-tv', 'sports-soccer', 'music-note', 'child-care', 'business'];
              if (!validIcons.includes(iconName.replace('_', '-'))) {
                  iconName = 'dns';
              }

              return (
                <SidebarItem
                  key={p.id}
                  icon={iconName.replace('_', '-')}
                  label={p.name}
                  isActive={isCurrent}
                  onPress={() => loadProfile(p)}
                  showLabel={isSidebarExpanded}
                />
              );
            })}
          </ScrollView>
        </SafeAreaView>
      </Animated.View>

      {/* Main Content Area */}
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <SafeAreaView edges={['top', 'bottom', 'right']} style={{ flex: 1 }}>
           <View style={{ flex: 1 }}>
             {renderContent()}
           </View>
        </SafeAreaView>
      </View>

    </View>
  );
};

const SidebarItem = ({ icon, label, isActive, onPress, showLabel }: any) => (
  <TouchableOpacity
    onPress={onPress}
    style={[
      styles.menuItem,
      { backgroundColor: isActive ? 'rgba(0, 122, 255, 0.3)' : 'transparent', justifyContent: showLabel ? 'flex-start' : 'center' }
    ]}
    accessibilityRole="button"
    accessibilityLabel={label}
  >
    <Icon name={icon} size={24} color={isActive ? '#FFF' : '#888'} style={styles.menuIcon} />
    {showLabel && (
      <Text style={{ color: isActive ? '#FFF' : '#888', fontWeight: isActive ? 'bold' : 'normal' }} numberOfLines={1}>
        {label}
      </Text>
    )}
  </TouchableOpacity>
);

const HomeScreen = () => {
  const { currentProfile, profiles, pin, channels, movies, series } = useIPTV();
  const navigation = useNavigation<any>();

  React.useEffect(() => {
    if (currentProfile && !pin) {
      const hasAdultContent = channels.some(c => c.isAdult) || movies.some(m => m.isAdult) || series.some(s => s.isAdult);
      if (hasAdultContent) {
        navigation.navigate('PinSetup');
      }
    }
  }, [currentProfile, channels, movies, series, pin, navigation]);

  if (!currentProfile) {
    return <WelcomeScreen />;
  }

  return <MainLayout />;
};

const styles = StyleSheet.create({
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sidebar: {
    borderRightWidth: 1,
    overflow: 'hidden',
  },
  sidebarSectionTitle: {
    color: '#888',
    fontSize: 12,
    marginBottom: 8,
    paddingHorizontal: 16,
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 8,
    marginBottom: 4,
  },
  menuIcon: {
    marginRight: 16,
  },
});

export default HomeScreen;
