import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle, useMemo } from 'react';
import { View, StyleSheet, Text, Platform, ActivityIndicator, TouchableOpacity, useWindowDimensions, Animated, Image, BackHandler, Alert, FlatList, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useIsFocused, useRoute } from '@react-navigation/native';
import { useIPTV } from '../context/IPTVContext';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../context/SettingsContext';
import { MaterialIcons as Icon } from '@expo/vector-icons';

import WelcomeScreen from './WelcomeScreen';
import ChannelList from '../components/ChannelList';
import MovieList from '../components/MovieList';
import SeriesList from '../components/SeriesList';
import FavoritesList from '../components/FavoritesList';
import RecentlyWatchedList from '../components/RecentlyWatchedList';
import SettingsScreen from './SettingsScreen';
import SearchScreen from './SearchScreen';
import { RecentlyWatchedItem } from '../types';

// Export type for content component ref
export type ContentRef = {
  focusFirstItem: () => void;
};

type TabId = 'channels' | 'movies' | 'series' | 'favorites' | 'recent' | 'settings' | 'search';

interface TabDef {
  id: TabId;
  icon: string;
  label: string;
}

// TiviMate-style top tab bar
const TopTabBar = ({ tabs, activeTab, onTabPress, colors, currentProfileName }: {
  tabs: TabDef[];
  activeTab: TabId;
  onTabPress: (tab: TabId) => void;
  colors: any;
  currentProfileName?: string;
}) => {
  const [focusedTab, setFocusedTab] = useState<TabId | null>(null);

  return (
    <View style={[topTabStyles.container, { backgroundColor: colors.card, borderBottomColor: colors.divider }]}>
      {/* App branding - left side */}
      <View style={topTabStyles.brandContainer}>
        <Image source={require('../assets/icon.png')} style={topTabStyles.brandLogo} resizeMode="contain" />
        {currentProfileName && (
          <Text style={[topTabStyles.profileName, { color: colors.textSecondary }]} numberOfLines={1}>
            {currentProfileName}
          </Text>
        )}
      </View>

      {/* Tabs - center */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={topTabStyles.tabsContainer}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const isFocused = focusedTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              onPress={() => onTabPress(tab.id)}
              onFocus={() => setFocusedTab(tab.id)}
              onBlur={() => setFocusedTab(null)}
              style={[
                topTabStyles.tab,
                isActive && { borderBottomColor: colors.primary, borderBottomWidth: 3 },
                isFocused && { backgroundColor: colors.primaryLight },
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={tab.label}
            >
              <Icon
                name={tab.icon as any}
                size={Platform.isTV ? 22 : 18}
                color={isActive ? colors.primary : (isFocused ? colors.text : colors.textMuted)}
              />
              <Text
                style={[
                  topTabStyles.tabLabel,
                  {
                    color: isActive ? colors.primary : (isFocused ? colors.text : colors.textMuted),
                    fontWeight: isActive ? '700' : '500',
                  }
                ]}
                numberOfLines={1}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const topTabStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingHorizontal: Platform.isTV ? 16 : 8,
    height: Platform.isTV ? 64 : 52,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: Platform.isTV ? 20 : 12,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.08)',
    marginRight: Platform.isTV ? 12 : 6,
    height: '100%',
  },
  brandLogo: {
    width: Platform.isTV ? 32 : 24,
    height: Platform.isTV ? 32 : 24,
    borderRadius: 6,
    marginRight: 8,
  },
  profileName: {
    fontSize: Platform.isTV ? 13 : 11,
    maxWidth: Platform.isTV ? 120 : 80,
  },
  tabsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: '100%',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Platform.isTV ? 18 : 12,
    paddingVertical: Platform.isTV ? 12 : 8,
    marginHorizontal: 2,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
    borderRadius: 4,
    height: '100%',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: Platform.isTV ? 14 : 12,
    marginLeft: 6,
    letterSpacing: 0.3,
  },
});

const MainLayout = () => {
  const { t } = useTranslation();
  const { colors } = useSettings();
  const { channels, movies, series, isLoading, profiles, currentProfile, loadProfile, recentlyWatched, playStream, addRecentlyWatched } = useIPTV();
  const dimensions = useWindowDimensions();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const [activeTab, setActiveTab] = useState<TabId>('channels');

  // Handle return parameters from Player
  useEffect(() => {
    if (route.params?.returnTab) {
      setActiveTab(route.params.returnTab);
    }
  }, [route.params?.returnTab]);

  // Ref for content component to focus first item
  const contentRef = useRef<ContentRef>(null);

  const tabs: TabDef[] = useMemo(() => [
    { id: 'channels', icon: 'live-tv', label: t('channels') },
    { id: 'movies', icon: 'movie', label: t('movies') },
    { id: 'series', icon: 'tv', label: t('series') },
    { id: 'favorites', icon: 'favorite', label: t('favorites') },
    { id: 'recent', icon: 'history', label: t('recent') },
    { id: 'search', icon: 'search', label: t('search') },
    { id: 'settings', icon: 'settings', label: t('settings') },
  ], [t]);

  if (isLoading) {
    return (
      <View style={[styles.centeredContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const handleTabPress = (tab: TabId) => {
    setActiveTab(tab);
    setTimeout(() => {
      contentRef.current?.focusFirstItem();
    }, 100);
  };

  const handleSidebarReturn = () => {
    // No-op: sidebar is gone, top tabs are always visible
  };

  const renderContent = () => {
    return (
      <View style={{ flex: 1 }}>
        {activeTab === 'channels' && <ChannelList ref={contentRef} onReturnToSidebar={handleSidebarReturn} />}
        {activeTab === 'movies' && <MovieList ref={contentRef} onReturnToSidebar={handleSidebarReturn} />}
        {activeTab === 'series' && <SeriesList ref={contentRef} onReturnToSidebar={handleSidebarReturn} />}
        {activeTab === 'favorites' && <FavoritesList ref={contentRef} onReturnToSidebar={handleSidebarReturn} />}
        {activeTab === 'recent' && <RecentlyWatchedList ref={contentRef} onReturnToSidebar={handleSidebarReturn} />}
        {activeTab === 'settings' && <SettingsScreen />}
        {activeTab === 'search' && <SearchScreen />}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* TiviMate-style top tab bar */}
      <SafeAreaView edges={Platform.isTV ? [] : ['top']} style={{ backgroundColor: colors.card }}>
        <TopTabBar
          tabs={tabs}
          activeTab={activeTab}
          onTabPress={handleTabPress}
          colors={colors}
          currentProfileName={currentProfile?.name}
        />
      </SafeAreaView>

      {/* Main Content Area */}
      <View style={{ flex: 1 }}>
        {renderContent()}
      </View>
    </View>
  );
};

const HomeScreen = () => {
  const { isInitializing, currentProfile, pin, channels, movies, series, isLoading, isUpdating, loadProfile, hasCheckedOnStartup, setHasCheckedOnStartup } = useIPTV();
  const { colors } = useSettings();
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();

  // Prevent app from exiting when pressing back on the Home screen on Apple TV
  useEffect(() => {
    let backHandler: any;
    if (isFocused && Platform.isTV) {
      backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
         return true;
      });
    }
    return () => {
      if (backHandler) backHandler.remove();
    };
  }, [isFocused]);

  const hasAdultContentRef = React.useRef(false);

  const prevProfileIdRef = React.useRef(currentProfile?.id);

  const hasAdultContent = React.useMemo(() => {
    if (prevProfileIdRef.current !== currentProfile?.id) {
      hasAdultContentRef.current = false;
      prevProfileIdRef.current = currentProfile?.id;
    }

    if (hasAdultContentRef.current) return true;
    let result = false;
    for (let i = 0; i < channels.length; i++) {
      if (channels[i].isAdult) {
        result = true;
        break;
      }
    }
    if (!result) {
      for (let i = 0; i < movies.length; i++) {
        if (movies[i].isAdult) {
          result = true;
          break;
        }
      }
    }
    if (!result) {
      for (let i = 0; i < series.length; i++) {
        if (series[i].isAdult) {
          result = true;
          break;
        }
      }
    }
    hasAdultContentRef.current = result;
    return result;
  }, [channels, movies, series]);

  React.useEffect(() => {
    if (!isInitializing && !isLoading && currentProfile && !pin && hasAdultContent) {
        navigation.navigate('PinSetup');
    }
  }, [isInitializing, isLoading, currentProfile, hasAdultContent, pin, navigation]);

  useEffect(() => {
    if (currentProfile && !isInitializing && !isLoading && !hasCheckedOnStartup) {
      setHasCheckedOnStartup(true);
      setTimeout(() => {
         Alert.alert(
            "Playlist aktualisieren?",
            "Möchten Sie die Playlist und das EPG jetzt aktualisieren?",
            [
              { text: "Nein", style: "cancel" },
              { text: "Ja", onPress: () => loadProfile(currentProfile, true) }
            ],
            { cancelable: true }
         );
      }, 500);
    }
  }, [currentProfile, isInitializing, isLoading, hasCheckedOnStartup, setHasCheckedOnStartup, loadProfile]);

  if (isInitializing || (isLoading && !currentProfile)) {
    return (
      <View style={[styles.centeredContainer, { backgroundColor: colors.background }]}>
         <Image source={require('../assets/icon.png')} style={{ width: 150, height: 150, marginBottom: 20 }} resizeMode="contain" />
         <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!currentProfile) {
    return <WelcomeScreen />;
  }

  if (!pin && hasAdultContent) {
    return (
      <View style={[styles.centeredContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
       <MainLayout />
       {isUpdating && (
          <View style={[StyleSheet.absoluteFill, styles.centeredContainer, { backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 999 }]}>
             <ActivityIndicator size="large" color={colors.primary} />
             <Text style={{ color: colors.text, marginTop: 16, fontSize: 18, fontWeight: '600' }}>Aktualisiere Playlist...</Text>
          </View>
       )}
    </View>
  );
};

const styles = StyleSheet.create({
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default HomeScreen;
