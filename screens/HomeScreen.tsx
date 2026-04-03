import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle, useMemo } from 'react';
import { View, StyleSheet, Text, Platform, ActivityIndicator, TouchableOpacity, useWindowDimensions, Animated, Image, BackHandler, Alert, FlatList, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useIsFocused, useRoute } from '@react-navigation/native';
import { useIPTV } from '../context/IPTVContext';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../context/SettingsContext';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { Star, Play, Settings, Search, Clock, Heart, MonitorPlay, Film } from 'lucide-react-native';

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

// Component for the "Last Watched Channels" bar
const LastWatchedBar = ({ channels, onChannelPress }: { channels: RecentlyWatchedItem[], onChannelPress: (item: RecentlyWatchedItem) => void }) => {
  const { colors } = useSettings();
  
  // Filter only live TV channels and limit to 10
  const liveChannels = useMemo(() => 
    channels.filter(item => item.type === 'live').slice(0, 10),
    [channels]
  );
  
  if (liveChannels.length === 0) return null;
  
  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    
    if (minutes < 60) return `${minutes} Min.`;
    if (hours < 24) return `${hours} Std.`;
    return '';
  };

  const renderItem = ({ item, index }: { item: RecentlyWatchedItem, index: number }) => (
    <TouchableOpacity
      style={styles.lastWatchedItem}
      onPress={() => onChannelPress(item)}
      accessibilityRole="button"
      accessibilityLabel={`Play ${item.name}`}
    >
      <View style={styles.lastWatchedNumber}>
        <Text style={styles.lastWatchedNumberText}>{index + 1}</Text>
      </View>
      {item.icon ? (
        <Image source={{ uri: item.icon }} style={styles.lastWatchedLogo} resizeMode="contain" />
      ) : (
        <View style={styles.lastWatchedLogoPlaceholder}>
          <Icon name="tv" size={20} color="#71717A" />
        </View>
      )}
      <View style={styles.lastWatchedInfo}>
        <Text style={styles.lastWatchedName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.lastWatchedTime}>{formatTimeAgo(item.lastWatchedAt)}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.lastWatchedContainer}>
      <Text style={styles.lastWatchedTitle}>ZULETZT GESEHEN</Text>
      <FlatList
        horizontal
        data={liveChannels}
        keyExtractor={(item, index) => `last-${item.id}-${index}`}
        renderItem={renderItem}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.lastWatchedList}
      />
    </View>
  );
};

const MainLayout = () => {
  const { t } = useTranslation();
  const { colors } = useSettings();
  const { channels, movies, series, isLoading, profiles, currentProfile, loadProfile, recentlyWatched, playStream, addRecentlyWatched } = useIPTV();
  const dimensions = useWindowDimensions();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const isSmallScreen = dimensions.width < 768;
  const [activeTab, setActiveTab] = useState<'channels' | 'movies' | 'series' | 'favorites' | 'recent' | 'settings' | 'search'>('channels');
  
  // Handle return parameters from Player
  useEffect(() => {
    if (route.params?.returnTab) {
      setActiveTab(route.params.returnTab);
    }
  }, [route.params?.returnTab]);

  // Animation values for the sidebar expansion
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [isSidebarFocused, setIsSidebarFocused] = useState(true);
  const collapsedWidth = Platform.isTV ? 70 : 50;
  const expandedWidth = Platform.isTV ? 160 : 130;
  const sidebarWidth = React.useRef(new Animated.Value(expandedWidth)).current;

  // Ref for content component to focus first item
  const contentRef = useRef<ContentRef>(null);

  // Track previous sidebar focused state to detect transitions
  const prevSidebarFocusedRef = useRef(true);

  // Fix menu bouncing issue by tracking focused items
  const sidebarFocusCountRef = useRef(0);

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
    setIsSidebarExpanded(false);
    setIsSidebarFocused(false);
    sidebarFocusCountRef.current = 0;
    
    setTimeout(() => {
      contentRef.current?.focusFirstItem();
    }, 100);
  };

  const handleSidebarFocus = () => {
    sidebarFocusCountRef.current += 1;
    if (sidebarTimeoutRef.current) {
      clearTimeout(sidebarTimeoutRef.current);
      sidebarTimeoutRef.current = null;
    }
    setIsSidebarExpanded(true);
    setIsSidebarFocused(true);
  };

  const handleSidebarBlur = () => {
    sidebarFocusCountRef.current = Math.max(0, sidebarFocusCountRef.current - 1);
    if (sidebarTimeoutRef.current) {
      clearTimeout(sidebarTimeoutRef.current);
    }
    sidebarTimeoutRef.current = setTimeout(() => {
      if (sidebarFocusCountRef.current === 0) {
        setIsSidebarExpanded(false);
        setIsSidebarFocused(false);
      }
    }, 150);
  };

  const handleSidebarReturn = () => {
    setIsSidebarExpanded(true);
    setIsSidebarFocused(true);
    sidebarFocusCountRef.current = 1;
  };

  const handleLastWatchedPress = (item: RecentlyWatchedItem) => {
    addRecentlyWatched({
      ...item,
      lastWatchedAt: Date.now(),
    });
    playStream({ url: '', id: item.id });
    navigation.navigate('Player');
  };

  const renderContent = () => {
    return (
      <View style={{ flex: 1 }}>
        {/* Last Watched Channels Bar - replaces static Trending Today */}
        <LastWatchedBar channels={recentlyWatched} onChannelPress={handleLastWatchedPress} />

        <View style={{ flex: 1 }}>
          {activeTab === 'channels' && <ChannelList ref={contentRef} onReturnToSidebar={handleSidebarReturn} />}
          {activeTab === 'movies' && <MovieList ref={contentRef} onReturnToSidebar={handleSidebarReturn} />}
          {activeTab === 'series' && <SeriesList ref={contentRef} onReturnToSidebar={handleSidebarReturn} />}
          {activeTab === 'favorites' && <FavoritesList ref={contentRef} onReturnToSidebar={handleSidebarReturn} />}
          {activeTab === 'recent' && <RecentlyWatchedList ref={contentRef} onReturnToSidebar={handleSidebarReturn} />}
          {activeTab === 'settings' && <SettingsScreen />}
          {activeTab === 'search' && <SearchScreen />}
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0D0D0F', flexDirection: 'row' }}>
      {/* Sidebar */}
      <Animated.View style={[styles.sidebar, { width: sidebarWidth, backgroundColor: 'rgba(24,24,27,0.95)', borderRightColor: '#27272A' }]}>
        <SafeAreaView edges={Platform.isTV ? [] : ['top', 'bottom']} style={{ flex: 1 }}>
              <ScrollView
                contentContainerStyle={{ paddingVertical: 8 }}
              >
                {/* Hamburger menu toggle */}
                <TouchableOpacity
                  onPress={() => setIsSidebarExpanded(!isSidebarExpanded)}
                  onFocus={handleSidebarFocus}
                  onBlur={handleSidebarBlur}
                  style={[styles.menuItem, { justifyContent: 'center', paddingVertical: Platform.isTV ? 8 : 6 }]}
                  accessibilityRole="button"
                  accessibilityLabel="Toggle Sidebar"
                >
                  <Icon name="menu" size={Platform.isTV ? 22 : 18} color="#FFF" style={isSidebarExpanded ? styles.menuIcon : {}} />
                </TouchableOpacity>

                {isSidebarExpanded && <Text style={styles.sidebarSectionTitle}>MENU</Text>}

                <SidebarItem 
                  onFocus={handleSidebarFocus} 
                  onBlur={handleSidebarBlur} 
                  icon="search" 
                  label={t('search')} 
                  isActive={activeTab === 'search'} 
                  onPress={() => handleTabPress('search')} 
                  showLabel={isSidebarExpanded} 
                />
                <SidebarItem 
                  onFocus={handleSidebarFocus} 
                  onBlur={handleSidebarBlur} 
                  icon="tv" 
                  label={t('channels')} 
                  isActive={activeTab === 'channels'} 
                  onPress={() => handleTabPress('channels')} 
                  showLabel={isSidebarExpanded} 
                />
                <SidebarItem 
                  onFocus={handleSidebarFocus} 
                  onBlur={handleSidebarBlur} 
                  icon="movie" 
                  label={t('movies')} 
                  isActive={activeTab === 'movies'} 
                  onPress={() => handleTabPress('movies')} 
                  showLabel={isSidebarExpanded} 
                />
                <SidebarItem 
                  onFocus={handleSidebarFocus} 
                  onBlur={handleSidebarBlur} 
                  icon="list" 
                  label={t('series')} 
                  isActive={activeTab === 'series'} 
                  onPress={() => handleTabPress('series')} 
                  showLabel={isSidebarExpanded} 
                />
                <SidebarItem 
                  onFocus={handleSidebarFocus} 
                  onBlur={handleSidebarBlur} 
                  icon="favorite" 
                  label={t('favorites')} 
                  isActive={activeTab === 'favorites'} 
                  onPress={() => handleTabPress('favorites')} 
                  showLabel={isSidebarExpanded} 
                />
                <SidebarItem 
                  onFocus={handleSidebarFocus} 
                  onBlur={handleSidebarBlur} 
                  icon="history" 
                  label={t('recent')} 
                  isActive={activeTab === 'recent'} 
                  onPress={() => handleTabPress('recent')} 
                  showLabel={isSidebarExpanded} 
                />
                <SidebarItem 
                  onFocus={handleSidebarFocus} 
                  onBlur={handleSidebarBlur} 
                  icon="settings" 
                  label={t('settings')} 
                  isActive={activeTab === 'settings'} 
                  onPress={() => handleTabPress('settings')} 
                  showLabel={isSidebarExpanded} 
                />

                <View style={{ height: 1, backgroundColor: '#27272A', marginVertical: 12, marginHorizontal: 12, borderRadius: 1 }} />
                {isSidebarExpanded && <Text style={[styles.sidebarSectionTitle, { fontSize: Platform.isTV ? 12 : 10 }]}>PROVIDERS</Text>}

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
                  onFocus={handleSidebarFocus}
                  onBlur={handleSidebarBlur}
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
        <SafeAreaView edges={Platform.isTV ? [] : ['top', 'bottom', 'right']} style={{ flex: 1 }}>
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
          backgroundColor: isFocused 
            ? 'rgba(59, 130, 246, 0.25)' 
            : (isActive ? 'rgba(59, 130, 246, 0.15)' : 'transparent'),
          justifyContent: showLabel ? 'flex-start' : 'center',
          alignItems: 'center',
          borderWidth: isFocused ? 1.5 : 0,
          borderColor: isFocused ? 'rgba(59, 130, 246, 0.5)' : 'transparent',
        }
      ]}
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={label}
    >
      <Icon 
        name={icon} 
        size={Platform.isTV ? 20 : 16} 
        color={isActive ? '#3B82F6' : (isFocused ? '#FAFAFA' : '#71717A')} 
        style={[showLabel ? styles.menuIcon : {}, { textAlign: 'center' }]} 
      />
      {showLabel && (
        <Text 
          style={{ 
            color: isActive ? '#3B82F6' : (isFocused ? '#FAFAFA' : '#A1A1AA'), 
            fontWeight: isActive || isFocused ? '600' : '400', 
            fontSize: Platform.isTV ? 13 : 11,
            letterSpacing: 0.2,
          }} 
          numberOfLines={1}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
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
    color: '#71717A',
    fontSize: 10,
    marginBottom: 8,
    paddingHorizontal: 12,
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Platform.isTV ? 7 : 5,
    paddingHorizontal: Platform.isTV ? 10 : 8,
    borderRadius: 8,
    marginHorizontal: 4,
    marginBottom: 2,
  },
  menuIcon: {
    marginRight: 10,
  },
  // Last Watched Bar Styles
  lastWatchedContainer: {
    paddingVertical: 12,
    paddingLeft: 16,
    backgroundColor: 'rgba(24,24,27,0.5)',
  },
  lastWatchedTitle: {
    color: '#71717A',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  lastWatchedList: {
    paddingRight: 16,
  },
  lastWatchedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(39,39,42,0.8)',
    borderRadius: 10,
    padding: 8,
    marginRight: 10,
    width: Platform.isTV ? 320 : 220,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  lastWatchedNumber: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  lastWatchedNumberText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '700',
  },
  lastWatchedLogo: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  lastWatchedLogoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lastWatchedInfo: {
    flex: 1,
    marginLeft: 12,
  },
  lastWatchedName: {
    color: '#FAFAFA',
    fontSize: Platform.isTV ? 16 : 14,
    fontWeight: '600',
  },
  lastWatchedTime: {
    color: '#71717A',
    fontSize: Platform.isTV ? 13 : 11,
    marginTop: 4,
  },
});

export default HomeScreen;