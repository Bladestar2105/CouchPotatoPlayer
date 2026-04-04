import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, Text, Platform, ActivityIndicator, TouchableOpacity, useWindowDimensions, Animated, Image, BackHandler, Alert, ScrollView } from 'react-native';
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

export type ContentRef = {
  focusFirstItem: () => void;
};

type TabId = 'channels' | 'movies' | 'series' | 'favorites' | 'recent' | 'settings' | 'search';

interface TabDef {
  id: TabId;
  icon: string;
  label: string;
}

const isTV = Platform.isTV || (Platform.OS as any) === 'tvos';

// ============================================================
// TV SIDEBAR - TiviMate-style collapsible left sidebar for TV
// Uses LEFT/RIGHT focus navigation which works reliably on tvOS
// ============================================================
const TVSidebarItem = ({ icon, label, isActive, onPress, showLabel, onFocus, onBlur, colors }: any) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <TouchableOpacity
      onPress={onPress}
      onFocus={(e: any) => { setIsFocused(true); if (onFocus) onFocus(e); }}
      onBlur={(e: any) => { setIsFocused(false); if (onBlur) onBlur(e); }}
      style={[
        tvStyles.menuItem,
        {
          backgroundColor: isFocused
            ? 'rgba(124, 77, 255, 0.25)'
            : (isActive ? 'rgba(124, 77, 255, 0.15)' : 'transparent'),
          justifyContent: showLabel ? 'flex-start' : 'center',
          alignItems: 'center',
          borderWidth: isFocused ? 1.5 : 0,
          borderColor: isFocused ? 'rgba(124, 77, 255, 0.5)' : 'transparent',
          borderLeftWidth: isActive ? 3 : 0,
          borderLeftColor: isActive ? colors.primary : 'transparent',
        }
      ]}
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={label}
    >
      <Icon
        name={icon}
        size={20}
        color={isActive ? colors.primary : (isFocused ? colors.text : colors.textMuted)}
        style={[showLabel ? tvStyles.menuIcon : {}, { textAlign: 'center' }]}
      />
      {showLabel && (
        <Text
          style={{
            color: isActive ? colors.primary : (isFocused ? colors.text : colors.textSecondary),
            fontWeight: isActive || isFocused ? '600' : '400',
            fontSize: 13,
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

// ============================================================
// MOBILE TOP TAB BAR - Horizontal tabs for phones/tablets
// ============================================================
const MobileTopTabBar = ({ tabs, activeTab, onTabPress, colors, currentProfileName, profiles, currentProfileId, onProfileSwitch }: {
  tabs: TabDef[];
  activeTab: TabId;
  onTabPress: (tab: TabId) => void;
  colors: any;
  currentProfileName?: string;
  profiles: any[];
  currentProfileId?: string;
  onProfileSwitch: (profile: any) => void;
}) => {
  const [focusedTab, setFocusedTab] = useState<TabId | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  return (
    <View style={[mobileTabStyles.container, { backgroundColor: colors.card, borderBottomColor: colors.divider }]}>
      {/* App branding - tappable for provider switch */}
      <TouchableOpacity
        style={mobileTabStyles.brandContainer}
        onPress={() => profiles.length > 1 && setShowProfileMenu(!showProfileMenu)}
      >
        <Image source={require('../assets/icon.png')} style={mobileTabStyles.brandLogo} resizeMode="contain" />
        {currentProfileName && (
          <Text style={[mobileTabStyles.profileName, { color: colors.text }]} numberOfLines={1}>
            {currentProfileName}
          </Text>
        )}
        {profiles.length > 1 && (
          <Icon name="arrow-drop-down" size={18} color={colors.textMuted} />
        )}
      </TouchableOpacity>

      {/* Provider dropdown */}
      {showProfileMenu && (
        <View style={[mobileTabStyles.profileDropdown, { backgroundColor: colors.card, borderColor: colors.divider }]}>
          {profiles.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={[mobileTabStyles.profileItem, p.id === currentProfileId && { backgroundColor: colors.primaryLight }]}
              onPress={() => { onProfileSwitch(p); setShowProfileMenu(false); }}
            >
              <Icon name={(p.icon?.replace('_', '-') as any) || 'dns'} size={18} color={p.id === currentProfileId ? colors.primary : colors.textSecondary} />
              <Text style={{ color: p.id === currentProfileId ? colors.primary : colors.text, marginLeft: 8, fontWeight: p.id === currentProfileId ? '700' : '500', fontSize: 13 }} numberOfLines={1}>
                {p.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={mobileTabStyles.tabsRow}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const isFocused = focusedTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              onPress={() => { setShowProfileMenu(false); onTabPress(tab.id); }}
              onFocus={() => setFocusedTab(tab.id)}
              onBlur={() => setFocusedTab(null)}
              style={[
                mobileTabStyles.tab,
                isActive && { borderBottomColor: colors.primary, borderBottomWidth: 3 },
                isFocused && { backgroundColor: colors.primaryLight },
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
            >
              <Icon name={tab.icon as any} size={18} color={isActive ? colors.primary : colors.textMuted} />
              <Text style={[mobileTabStyles.tabLabel, { color: isActive ? colors.primary : colors.textMuted, fontWeight: isActive ? '700' : '500' }]} numberOfLines={1}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const mobileTabStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingHorizontal: 8,
    height: 52,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 12,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.08)',
    marginRight: 6,
    height: '100%',
  },
  brandLogo: { width: 24, height: 24, borderRadius: 6, marginRight: 6 },
  profileName: { fontSize: 11, maxWidth: 80, fontWeight: '600' },
  profileDropdown: {
    position: 'absolute', top: 52, left: 0, minWidth: 200,
    borderWidth: 1, borderRadius: 12, zIndex: 100, elevation: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12,
    paddingVertical: 6,
  },
  profileItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, marginHorizontal: 6, marginVertical: 2,
  },
  tabsRow: { flexDirection: 'row', alignItems: 'center', height: '100%' },
  tab: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 8, marginHorizontal: 2,
    borderBottomWidth: 3, borderBottomColor: 'transparent', borderRadius: 4,
    height: '100%', justifyContent: 'center',
  },
  tabLabel: { fontSize: 12, marginLeft: 6, letterSpacing: 0.3 },
});

// ============================================================
// MAIN LAYOUT
// ============================================================
const MainLayout = () => {
  const { t } = useTranslation();
  const { colors } = useSettings();
  const { channels, movies, series, isLoading, profiles, currentProfile, loadProfile, recentlyWatched, playStream, addRecentlyWatched } = useIPTV();
  const dimensions = useWindowDimensions();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const isSmallScreen = dimensions.width < 768;
  const [activeTab, setActiveTab] = useState<TabId>('channels');

  // Handle return parameters from Player
  useEffect(() => {
    if (route.params?.returnTab) {
      setActiveTab(route.params.returnTab);
    }
  }, [route.params?.returnTab]);

  const contentRef = useRef<ContentRef>(null);

  // TV sidebar state (TiviMate-style collapsible)
  const isSidebarExpanded = true;
    const collapsedWidth = 70;
  const expandedWidth = 170;
  const sidebarWidth = React.useRef(new Animated.Value(expandedWidth)).current;

  useEffect(() => {
    if (!isTV) return;
    Animated.timing(sidebarWidth, {
      toValue: expandedWidth,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isSidebarExpanded]);

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
    if (isTV) {

          }
    setTimeout(() => {
      contentRef.current?.focusFirstItem();
    }, 100);
  };

  const handleSidebarFocus = () => {

  };

  const handleSidebarBlur = () => {
              };

  const handleSidebarReturn = () => {

      };

  const renderContent = () => {
    return (
      <View style={{ flex: 1 }}>
        {activeTab === 'channels' && <ChannelList ref={contentRef} onReturnToSidebar={handleSidebarReturn} initialViewMode="list" />}

        {activeTab === 'movies' && <MovieList ref={contentRef} onReturnToSidebar={handleSidebarReturn} />}
        {activeTab === 'series' && <SeriesList ref={contentRef} onReturnToSidebar={handleSidebarReturn} />}
        {activeTab === 'favorites' && <FavoritesList ref={contentRef} onReturnToSidebar={handleSidebarReturn} />}
        {activeTab === 'recent' && <RecentlyWatchedList ref={contentRef} onReturnToSidebar={handleSidebarReturn} />}
        {activeTab === 'settings' && <SettingsScreen />}
        {activeTab === 'search' && <SearchScreen />}
      </View>
    );
  };

  // ===== TV LAYOUT: TiviMate-style left sidebar =====
  if (isTV) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, flexDirection: 'row' }}>
        {/* TiviMate-style collapsible sidebar */}
        <Animated.View style={[tvStyles.sidebar, { width: sidebarWidth, backgroundColor: colors.card, borderRightColor: colors.divider }]}>
          <View style={{ paddingVertical: 8, flex: 1 }}>
            {/* Hamburger toggle */}


            {isSidebarExpanded && <Text style={[tvStyles.sidebarSectionTitle, { color: colors.textMuted }]}>MENU</Text>}

            {tabs.map((tab) => (
              <TVSidebarItem
                key={tab.id}
                onFocus={handleSidebarFocus}
                onBlur={handleSidebarBlur}
                icon={tab.icon}
                label={tab.label}
                isActive={activeTab === tab.id}
                onPress={() => handleTabPress(tab.id)}
                showLabel={isSidebarExpanded}
                colors={colors}
              />
            ))}

            <View style={{ height: 1, backgroundColor: colors.divider, marginVertical: 12, marginHorizontal: 12 }} />
            {isSidebarExpanded && <Text style={[tvStyles.sidebarSectionTitle, { color: colors.textMuted, fontSize: 12 }]}>PROVIDERS</Text>}

            {profiles.map(p => {
              const isCurrent = currentProfile?.id === p.id;
              let iconName = p.icon || 'dns';
              const validIcons = ['tv', 'movie', 'star', 'public', 'dns', 'live-tv', 'sports-soccer', 'music-note', 'child-care', 'business'];
              if (!validIcons.includes(iconName.replace('_', '-'))) {
                iconName = 'dns';
              }

              return (
                <TVSidebarItem
                  key={p.id}
                  onFocus={handleSidebarFocus}
                  onBlur={handleSidebarBlur}
                  icon={iconName.replace('_', '-')}
                  label={p.name}
                  isActive={isCurrent}
                  onPress={() => loadProfile(p)}
                  showLabel={isSidebarExpanded}
                  colors={colors}
                />
              );
            })}
          </View>
        </Animated.View>

        {/* Main Content */}
        <View style={{ flex: 1 }}>
          {renderContent()}
        </View>
      </View>
    );
  }

  // ===== MOBILE/TABLET LAYOUT: Top tab bar =====
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: colors.card }}>
        <MobileTopTabBar
          tabs={tabs}
          activeTab={activeTab}
          onTabPress={handleTabPress}
          colors={colors}
          currentProfileName={currentProfile?.name}
          profiles={profiles}
          currentProfileId={currentProfile?.id}
          onProfileSwitch={loadProfile}
        />
      </SafeAreaView>

      <View style={{ flex: 1 }}>
        {renderContent()}
      </View>
    </View>
  );
};

const tvStyles = StyleSheet.create({
  sidebar: {
    borderRightWidth: 1,
    overflow: 'hidden',
  },
  sidebarSectionTitle: {
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
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginHorizontal: 4,
    marginBottom: 2,
  },
  menuIcon: {
    marginRight: 10,
  },
});

const HomeScreen = () => {
  const { isInitializing, currentProfile, pin, channels, movies, series, isLoading, isUpdating, loadProfile, hasCheckedOnStartup, setHasCheckedOnStartup } = useIPTV();
  const { colors } = useSettings();
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();

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
    for (let i = 0; i < channels.length; i++) { if (channels[i].isAdult) { result = true; break; } }
    if (!result) { for (let i = 0; i < movies.length; i++) { if (movies[i].isAdult) { result = true; break; } } }
    if (!result) { for (let i = 0; i < series.length; i++) { if (series[i].isAdult) { result = true; break; } } }
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
