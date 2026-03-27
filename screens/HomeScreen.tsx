import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, Platform, ActivityIndicator, TouchableOpacity, useWindowDimensions, Animated, Image, BackHandler } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useIsFocused } from '@react-navigation/native';
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
import SearchScreen from './SearchScreen';

const MainLayout = () => {
  const { t } = useTranslation();
  const { colors } = useSettings();
  const { channels, movies, series, isLoading, profiles, currentProfile, loadProfile } = useIPTV();
  const dimensions = useWindowDimensions();
  const navigation = useNavigation<any>();

  const isSmallScreen = dimensions.width < 768;
  const [activeTab, setActiveTab] = useState<'channels' | 'movies' | 'series' | 'favorites' | 'recent' | 'settings' | 'search'>('channels');

  // Animation values for the sidebar expansion
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false); // Default to collapsed for TV
  const collapsedWidth = Platform.isTV ? 100 : 80;
  const expandedWidth = Platform.isTV ? 350 : 250;
  const sidebarWidth = React.useRef(new Animated.Value(collapsedWidth)).current;

  useEffect(() => {
    Animated.timing(sidebarWidth, {
      toValue: isSidebarExpanded ? expandedWidth : collapsedWidth,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isSidebarExpanded]);

  const sidebarTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  if (isLoading) {
    return (
      <View style={[styles.centeredContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const handleTabPress = (tab: any) => {
    setActiveTab(tab);

    // Force collapse the menu when a tab is explicitly pressed (selected)
    setIsSidebarExpanded(false);
  };

  const handleSidebarFocus = () => {
    if (sidebarTimeoutRef.current) {
      clearTimeout(sidebarTimeoutRef.current);
    }
    if (!isSidebarExpanded) {
       setIsSidebarExpanded(true);
    }
  };

  const handleSidebarBlur = () => {
    if (sidebarTimeoutRef.current) {
      clearTimeout(sidebarTimeoutRef.current);
    }
    // We increase the timeout significantly for Apple TV so spatial
    // navigation up/down doesn't trigger collapse. It will only collapse
    // if the user moves focus entirely to the main content pane and stays there.
    sidebarTimeoutRef.current = setTimeout(() => {
      setIsSidebarExpanded(false);
    }, 1000);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'channels': return <ChannelList />;
      case 'movies': return <MovieList />;
      case 'series': return <SeriesList />;
      case 'favorites': return <FavoritesList />;
      case 'recent': return <RecentlyWatchedList />;
      case 'settings': return <SettingsScreen />;
      case 'search': return <SearchScreen />;
      default: return <ChannelList />;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000', flexDirection: 'row' }}>
      {/* Sidebar */}
      <Animated.View style={[styles.sidebar, { width: sidebarWidth, backgroundColor: 'rgba(0,0,0,0.5)', borderRightColor: '#2C2C2E' }]}>
        <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
              <ScrollView
                contentContainerStyle={{ paddingVertical: 16 }}
                // TV focus interactions
              >
                {/* On a TV, the sidebar auto-expands on focus, so the hamburger menu isn't strictly necessary, but helpful for mouse/touch */}
                <TouchableOpacity
                  onPress={() => setIsSidebarExpanded(!isSidebarExpanded)}
                  style={[styles.menuItem, { justifyContent: 'center' }]}
                  accessibilityRole="button"
                  accessibilityLabel="Toggle Sidebar"
                >
                  <Icon name="menu" size={24} color="#FFF" style={isSidebarExpanded ? styles.menuIcon : {}} />
                </TouchableOpacity>

                {isSidebarExpanded && <Text style={styles.sidebarSectionTitle}>MENU</Text>}

                <SidebarItem icon="search" label={t('search')} isActive={activeTab === 'search'} onPress={() => handleTabPress('search')} showLabel={isSidebarExpanded} />
                <SidebarItem icon="tv" label={t('channels')} isActive={activeTab === 'channels'} onPress={() => handleTabPress('channels')} showLabel={isSidebarExpanded} />
                <SidebarItem icon="movie" label={t('movies')} isActive={activeTab === 'movies'} onPress={() => handleTabPress('movies')} showLabel={isSidebarExpanded} />
                <SidebarItem icon="list" label={t('series')} isActive={activeTab === 'series'} onPress={() => handleTabPress('series')} showLabel={isSidebarExpanded} />
                <SidebarItem icon="favorite" label={t('favorites')} isActive={activeTab === 'favorites'} onPress={() => handleTabPress('favorites')} showLabel={isSidebarExpanded} />
                <SidebarItem icon="history" label={t('recent')} isActive={activeTab === 'recent'} onPress={() => handleTabPress('recent')} showLabel={isSidebarExpanded} />
                <SidebarItem icon="settings" label={t('settings')} isActive={activeTab === 'settings'} onPress={() => handleTabPress('settings')} showLabel={isSidebarExpanded} />

                <View style={{ height: 1, backgroundColor: '#2C2C2E', marginVertical: 16 }} />
                {isSidebarExpanded && <Text style={[styles.sidebarSectionTitle, { fontSize: Platform.isTV ? 16 : 12 }]}>PROVIDERS</Text>}

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
      <View style={{ flex: 1 }}>
        <SafeAreaView edges={['top', 'bottom', 'right']} style={{ flex: 1 }}>
           <View style={{ flex: 1 }}>
             {renderContent()}
           </View>
        </SafeAreaView>
      </View>

    </View>
  );
};

const SidebarItem = ({ icon, label, isActive, onPress, showLabel, onFocus, onBlur }: any) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <TouchableOpacity
      onPress={onPress}
      onFocus={(e) => { setIsFocused(true); if (onFocus) onFocus(e); }}
      onBlur={(e) => { setIsFocused(false); if (onBlur) onBlur(e); }}
      style={[
        styles.menuItem,
        {
          backgroundColor: isFocused ? 'rgba(255, 255, 255, 0.2)' : (isActive ? 'rgba(0, 122, 255, 0.3)' : 'transparent'),
          justifyContent: showLabel ? 'flex-start' : 'center',
          alignItems: 'center',
        }
      ]}
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={label}
    >
      <Icon name={icon} size={Platform.isTV ? 40 : 24} color={isActive || isFocused ? '#FFF' : '#888'} style={[showLabel ? styles.menuIcon : {}, { textAlign: 'center' }]} />
      {showLabel && (
        <Text style={{ color: isActive || isFocused ? '#FFF' : '#888', fontWeight: isActive ? 'bold' : 'normal', fontSize: Platform.isTV ? 24 : 14 }} numberOfLines={1}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const HomeScreen = () => {
  const { isInitializing, currentProfile, pin, channels, movies, series, isLoading, isUpdating, loadProfile } = useIPTV();
  const { colors } = useSettings();
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const [hasPromptedUpdate, setHasPromptedUpdate] = useState(false);

  // Prevent app from exiting when pressing back on the Home screen on Apple TV
  useEffect(() => {
    let backHandler: any;
    if (isFocused && Platform.isTV) {
      backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
         // Return true to prevent default exit.
         // Optional: if you want back button to open sidebar when closed
         // if (!isSidebarExpanded) setIsSidebarExpanded(true);
         return true;
      });
    }
    return () => {
      if (backHandler) backHandler.remove();
    };
  }, [isFocused]);

  const hasAdultContent = React.useMemo(() => {
    return channels.some(c => c.isAdult) || movies.some(m => m.isAdult) || series.some(s => s.isAdult);
  }, [channels, movies, series]);

  React.useEffect(() => {
    if (!isInitializing && !isLoading && currentProfile && !pin && hasAdultContent) {
        navigation.navigate('PinSetup');
    }
  }, [isInitializing, isLoading, currentProfile, hasAdultContent, pin, navigation]);

  // Prevent MainLayout from rendering momentarily if we're about to redirect to PinSetup
  useEffect(() => {
    // Prompt to update when a profile is successfully loaded and we haven't asked yet
    if (currentProfile && !isInitializing && !isLoading && !hasPromptedUpdate) {
      setHasPromptedUpdate(true);
      // Wait a tick so the UI renders first
      setTimeout(() => {
         // Using standard Alert for simple yes/no
         import('react-native').then(({ Alert }) => {
            Alert.alert(
               "Playlist aktualisieren?",
               "Möchten Sie die Playlist und das EPG jetzt aktualisieren?",
               [
                 { text: "Nein", style: "cancel" },
                 { text: "Ja", onPress: () => loadProfile(currentProfile, true) }
               ],
               { cancelable: true }
            );
         });
      }, 500);
    }
  }, [currentProfile, isInitializing, isLoading, hasPromptedUpdate, loadProfile]);

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
      <View style={[styles.centeredContainer, { backgroundColor: '#000' }]}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
       <MainLayout />
       {isUpdating && (
          <View style={[StyleSheet.absoluteFill, styles.centeredContainer, { backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 999 }]}>
             <ActivityIndicator size="large" color={colors.primary} />
             <Text style={{ color: '#FFF', marginTop: 16, fontSize: 18 }}>Aktualisiere Playlist...</Text>
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
