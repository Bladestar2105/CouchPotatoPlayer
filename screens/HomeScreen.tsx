import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { View, StyleSheet, Text, Platform, ActivityIndicator, TouchableOpacity, useWindowDimensions, Animated, Image, BackHandler, Alert, ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useIsFocused, useRoute } from '@react-navigation/native';
import { useIPTV } from '../context/IPTVContext';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../context/SettingsContext';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { ScrollView } from 'react-native-gesture-handler';
import { Star, Play, Settings, Search, Clock, Heart, MonitorPlay, Film } from 'lucide-react-native';

import WelcomeScreen from './WelcomeScreen';
import ChannelList from '../components/ChannelList';
import MovieList from '../components/MovieList';
import SeriesList from '../components/SeriesList';
import FavoritesList from '../components/FavoritesList';
import RecentlyWatchedList from '../components/RecentlyWatchedList';
import SettingsScreen from './SettingsScreen';
import SearchScreen from './SearchScreen';
import { TMDBService } from '../services/tmdb';

// Export type for content component ref
export type ContentRef = {
  focusFirstItem: () => void;
};

const MainLayout = () => {
  const { t } = useTranslation();
  const { colors } = useSettings();
  const { channels, movies, series, isLoading, profiles, currentProfile, loadProfile } = useIPTV();
  const dimensions = useWindowDimensions();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const isSmallScreen = dimensions.width < 768;
  const [activeTab, setActiveTab] = useState<'channels' | 'movies' | 'series' | 'favorites' | 'recent' | 'settings' | 'search'>('channels');
  const [heroContent, setHeroContent] = useState<any>(null);
  
  // Handle return parameters from Player
  useEffect(() => {
    if (route.params?.returnTab) {
      setActiveTab(route.params.returnTab);
    }
  }, [route.params?.returnTab]);

  useEffect(() => {
    const fetchHero = async () => {
      const tmdb = new TMDBService({ apiKey: 'YOUR_API_KEY_HERE' });
      if ((tmdb as any).apiKey !== 'YOUR_API_KEY_HERE' && tmdb.isAvailable()) {
        const trending = await tmdb.getTrending('all', 'week');
        if (trending && trending.length > 0) {
          setHeroContent(trending[0]);
        }
      } else {
        setHeroContent({
          title: "Trending Today",
          overview: "Discover the latest movies and series added to the catalog. Explore our vast collection of live TV, movies, and series.",
          backdropUrl: 'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?q=80&w=2070&auto=format&fit=crop',
          rating: 8.5
        });
      }
    };
    fetchHero();
  }, []);

  // Animation values for the sidebar expansion
  // Sidebar is expanded by default when active (TiviMate style)
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [isSidebarFocused, setIsSidebarFocused] = useState(true); // Track if sidebar has focus
  const collapsedWidth = Platform.isTV ? 80 : 60;
  const expandedWidth = Platform.isTV ? 200 : 160;
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
    // Collapse menu when a tab is selected (TiviMate behavior)
    setIsSidebarExpanded(false);
    setIsSidebarFocused(false);
    sidebarFocusCountRef.current = 0;
    
    // Focus first item in content after a short delay
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
    // Expand sidebar when it gains focus (TiviMate style)
    setIsSidebarExpanded(true);
    setIsSidebarFocused(true);
  };

  const handleSidebarBlur = () => {
    sidebarFocusCountRef.current = Math.max(0, sidebarFocusCountRef.current - 1);
    if (sidebarTimeoutRef.current) {
      clearTimeout(sidebarTimeoutRef.current);
    }
    // Collapse sidebar when focus leaves it (going to content)
    sidebarTimeoutRef.current = setTimeout(() => {
      if (sidebarFocusCountRef.current === 0) {
        setIsSidebarExpanded(false);
        setIsSidebarFocused(false);
      }
    }, 150);
  };

  // Handle back navigation to sidebar - expand it again
  const handleSidebarReturn = () => {
    setIsSidebarExpanded(true);
    setIsSidebarFocused(true);
    sidebarFocusCountRef.current = 1;
  };

  const renderContent = () => {
    return (
      <View style={{ flex: 1 }}>
        {/* Modern Hero Banner (Show only on media tabs) */}
        {heroContent && (activeTab === 'channels' || activeTab === 'movies' || activeTab === 'series') && (
          <View style={styles.heroWrapper}>
            <ImageBackground
              source={{ uri: heroContent.backdropUrl }}
              style={styles.heroBanner}
              imageStyle={{ borderRadius: 16 }}
            >
              <View style={[styles.heroOverlay, { backgroundColor: 'rgba(13,13,15,0.75)' }]}>
                <View style={styles.heroContentText}>
                  <Text style={styles.heroLabel}>FEATURED</Text>
                  <Text style={styles.heroTitle} numberOfLines={1}>{heroContent.title}</Text>
                  <Text style={styles.heroDesc} numberOfLines={2}>{heroContent.overview}</Text>
                  <View style={styles.heroMetaRow}>
                    <Star color="#FFD700" size={16} fill="#FFD700" />
                    <Text style={styles.heroRating}>{heroContent.rating}</Text>
                  </View>
                </View>
              </View>
            </ImageBackground>
          </View>
        )}

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
        <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
              <ScrollView
                contentContainerStyle={{ paddingVertical: 16 }}
                // TV focus interactions
              >
                {/* Hamburger menu toggle */}
                <TouchableOpacity
                  onPress={() => setIsSidebarExpanded(!isSidebarExpanded)}
                  onFocus={handleSidebarFocus}
                  onBlur={handleSidebarBlur}
                  style={[styles.menuItem, { justifyContent: 'center' }]}
                  accessibilityRole="button"
                  accessibilityLabel="Toggle Sidebar"
                >
                  <Icon name="menu" size={24} color="#FFF" style={isSidebarExpanded ? styles.menuIcon : {}} />
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

                <View style={{ height: 1, backgroundColor: '#27272A', marginVertical: 20, marginHorizontal: 20, borderRadius: 1 }} />
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
        size={Platform.isTV ? 24 : 18} 
        color={isActive ? '#3B82F6' : (isFocused ? '#FAFAFA' : '#71717A')} 
        style={[showLabel ? styles.menuIcon : {}, { textAlign: 'center' }]} 
      />
      {showLabel && (
        <Text 
          style={{ 
            color: isActive ? '#3B82F6' : (isFocused ? '#FAFAFA' : '#A1A1AA'), 
            fontWeight: isActive || isFocused ? '600' : '400', 
            fontSize: Platform.isTV ? 16 : 13,
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

  // ⚡ Perf: Once adult content is detected, cache the result to avoid
  // re-iterating potentially thousands of items on every collection change.
  const hasAdultContentRef = React.useRef(false);

  const prevProfileIdRef = React.useRef(currentProfile?.id);

  const hasAdultContent = React.useMemo(() => {
    // Reset the ref during render when the profile changes because a new profile might not have adult content
    if (prevProfileIdRef.current !== currentProfile?.id) {
      hasAdultContentRef.current = false;
      prevProfileIdRef.current = currentProfile?.id;
    }

    // Short-circuit: once we've found adult content, it won't disappear for this profile
    if (hasAdultContentRef.current) return true;
    // ⚡ Bolt: Replaced O(N) array methods (.some) with manual for-loops.
    // Calling .some() on arrays with 100k+ items creates significant overhead
    // from closure instantiation and function invocation per element.
    // A manual loop is measurably faster and avoids blocking the main thread.
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

  // Prevent MainLayout from rendering momentarily if we're about to redirect to PinSetup
  useEffect(() => {
    // Prompt to update when a profile is successfully loaded and we haven't asked yet
    if (currentProfile && !isInitializing && !isLoading && !hasCheckedOnStartup) {
      setHasCheckedOnStartup(true);
      // Wait a tick so the UI renders first
      setTimeout(() => {
         // Using standard Alert for simple yes/no
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
    fontSize: 11,
    marginBottom: 12,
    paddingHorizontal: 20,
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Platform.isTV ? 10 : 8,
    paddingHorizontal: Platform.isTV ? 14 : 12,
    borderRadius: 10,
    marginHorizontal: 6,
    marginBottom: 4,
  },
  menuIcon: {
    marginRight: 14,
  },
  heroWrapper: {
    padding: 20,
    paddingBottom: 12,
  },
  heroBanner: {
    width: '100%',
    height: 240,
    borderRadius: 20,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    // Modern shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    padding: 24,
    // Gradient overlay for better text readability
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  heroContentText: {
    gap: 6,
  },
  heroLabel: {
    color: '#3B82F6',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: '#FAFAFA',
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  heroDesc: {
    color: '#D4D4D8',
    fontSize: 14,
    lineHeight: 22,
    marginTop: 6,
    maxWidth: '85%',
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  heroRating: {
    color: '#FAFAFA',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default HomeScreen;
