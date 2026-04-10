import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, StyleSheet, Text, Platform, ActivityIndicator, TouchableOpacity, Image, BackHandler, Alert, TVEventControl, NativeModules, ScrollView } from 'react-native';
import TVFocusGuideView from '../components/TVFocusGuideView';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { isTV as isTVPlatform } from '../utils/platform';

export type ContentRef = {
  focusFirstItem: () => void;
  handleBack?: () => boolean;
};

type TabId = 'channels' | 'movies' | 'series' | 'favorites' | 'recent' | 'settings' | 'search';

interface TabDef {
  id: TabId;
  icon: string;
  label: string;
}

const isTV = isTVPlatform;
const VALID_PROFILE_ICONS = new Set([
  'tv',
  'movie',
  'star',
  'public',
  'dns',
  'live-tv',
  'sports-soccer',
  'music-note',
  'child-care',
  'business',
]);

// ============================================================
// TV SIDEBAR - TiviMate-style collapsible left sidebar for TV
// ============================================================
const TVSidebarItem = ({ icon, label, isActive, onPress, showLabel, onFocus, onBlur, colors, hasTVPreferredFocus = false }: any) => {
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
            ? 'rgba(233, 105, 42, 0.22)'
            : (isActive ? 'rgba(233, 105, 42, 0.12)' : 'transparent'),
          justifyContent: showLabel ? 'flex-start' : 'center',
          alignItems: 'center',
          borderWidth: isFocused ? 1.5 : 0,
          borderColor: isFocused ? 'rgba(233, 105, 42, 0.45)' : 'transparent',
          borderLeftWidth: isActive ? 3 : 0,
          borderLeftColor: isActive ? colors.primary : 'transparent',
        }
      ]}
      accessible={true}
      isTVSelectable={true}
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={label}
      hasTVPreferredFocus={hasTVPreferredFocus}
      activeOpacity={0.85}
    >
      <Icon
        name={icon}
        size={24}
        color={isActive ? colors.primary : (isFocused ? colors.text : colors.textMuted)}
        style={[showLabel ? tvStyles.menuIcon : {}, { textAlign: 'center' }]}
      />
      {showLabel && (
        <Text
          style={{
            color: isActive ? colors.primary : (isFocused ? colors.text : colors.textSecondary),
            fontWeight: isActive || isFocused ? '600' : '400',
            fontSize: 16,
            letterSpacing: 0.3,
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
// Uses a flat View row instead of ScrollView to avoid
// touch-interception issues on Android.
// ============================================================
const MobileTabItem = React.memo(({ tab, isActive, onPress, colors }: {
  tab: TabDef;
  isActive: boolean;
  onPress: () => void;
  colors: any;
}) => {
  const [isFocused, setIsFocused] = useState(false);
  return (
    <TouchableOpacity
      onPress={onPress}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      activeOpacity={0.85}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      style={[
        mobileTabStyles.tab,
        isActive && { borderBottomColor: colors.primary, borderBottomWidth: 2.5 },
        isFocused && { backgroundColor: colors.primaryLight },
      ]}
      accessible={true}
      // @ts-ignore - isTVSelectable is valid on RN-TVOS
      isTVSelectable={true}
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={tab.label}
    >
      <Icon name={tab.icon as any} size={17} color={isActive ? colors.primary : colors.textMuted} />
      <Text
        style={[
          mobileTabStyles.tabLabel,
          { color: isActive ? colors.primary : colors.textMuted, fontWeight: isActive ? '700' : '500' },
        ]}
        numberOfLines={1}
      >
        {tab.label}
      </Text>
    </TouchableOpacity>
  );
});

const MobileTopTabBar = ({ tabs, activeTab, onTabPress, colors, profiles, currentProfileId, onProfileSwitch }: {
  tabs: TabDef[];
  activeTab: TabId;
  onTabPress: (tab: TabId) => void;
  colors: any;
  profiles: any[];
  currentProfileId?: string;
  onProfileSwitch: (profile: any) => void;
}) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  return (
    <View style={[mobileTabStyles.outerContainer, { backgroundColor: colors.card }]}>
      {/* Top row: branding + tabs */}
      <View style={[mobileTabStyles.container, { borderBottomColor: colors.divider }]}>
        {/* App branding - tappable for provider switch */}
        <TouchableOpacity
          style={[mobileTabStyles.brandContainer, { borderRightColor: colors.divider }]}
          onPress={() => profiles.length > 1 && setShowProfileMenu(!showProfileMenu)}
          activeOpacity={0.7}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={profiles.length > 1 ? "Switch provider profile" : "App logo"}
          accessibilityState={{ expanded: showProfileMenu }}
        >
          <Image source={require('../assets/brand-mark-small.png')} style={mobileTabStyles.brandLogo} resizeMode="contain" />
          {profiles.length > 1 && (
            <Icon name="arrow-drop-down" size={18} color={colors.textMuted} />
          )}
        </TouchableOpacity>

        {/* Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={mobileTabStyles.tabsRow}
          bounces={false}
        >
          {tabs.map((tab) => (
            <MobileTabItem
              key={tab.id}
              tab={tab}
              isActive={activeTab === tab.id}
              onPress={() => { setShowProfileMenu(false); onTabPress(tab.id); }}
              colors={colors}
            />
          ))}
        </ScrollView>
      </View>

      {/* Provider dropdown - rendered outside the tab row to avoid blocking taps */}
      {showProfileMenu && (
        <View style={[mobileTabStyles.profileDropdown, { backgroundColor: colors.card, borderColor: colors.divider }]}>
          {profiles.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={[mobileTabStyles.profileItem, p.id === currentProfileId && { backgroundColor: colors.primaryLight }]}
              onPress={() => { onProfileSwitch(p); setShowProfileMenu(false); }}
              activeOpacity={0.7}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={`Profile ${p.name}`}
              accessibilityState={{ selected: p.id === currentProfileId }}
            >
              <Icon name={(p.icon?.replace('_', '-') as any) || 'dns'} size={18} color={p.id === currentProfileId ? colors.primary : colors.textSecondary} />
              <Text style={{ color: p.id === currentProfileId ? colors.primary : colors.text, marginLeft: 10, fontWeight: p.id === currentProfileId ? '700' : '500', fontSize: 13 }} numberOfLines={1}>
                {p.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const mobileTabStyles = StyleSheet.create({
  outerContainer: {
    zIndex: 10,
    position: 'relative',
    elevation: 10,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingLeft: 6,
    height: 56,
    overflow: 'visible',
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    borderRightWidth: 1,
    height: '100%',
    minWidth: 58,
    flexShrink: 0,
    marginRight: 4,
  },
  brandLogo: { width: 34, height: 34, marginRight: 2 },
  profileDropdown: {
    position: 'absolute', top: 56, left: 0, minWidth: 220,
    borderWidth: 1, borderRadius: 14, zIndex: 200, elevation: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 16,
    paddingVertical: 6,
  },
  profileItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 11, paddingHorizontal: 16, borderRadius: 10, marginHorizontal: 6, marginVertical: 2,
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingRight: 12,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
    height: 56,
    minWidth: 88,
  },
  tabLabel: { fontSize: 12, marginLeft: 5, letterSpacing: 0.2, fontWeight: '600' },
});

// ============================================================
// MAIN LAYOUT
// ============================================================
const MainLayout = () => {
  const { t } = useTranslation();
  const { colors } = useSettings();
  const { isLoading, profiles, currentProfile, loadProfile } = useIPTV();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const isFocused = useIsFocused();

  const [activeTab, setActiveTab] = useState<TabId>('channels');

  // Handle return parameters from Player
  useEffect(() => {
    if (route.params?.returnTab) {
      setActiveTab(route.params.returnTab);
      if (isTV && route.params.returnTab === 'channels') {
        setIsSidebarExpanded(false);
        setTimeout(() => {
          contentRef.current?.focusFirstItem();
        }, 120);
      }
      navigation.setParams({ returnTab: undefined });
    }
  }, [route.params?.returnTab, navigation]);

  const contentRef = useRef<ContentRef>(null);
  const searchRef = useRef<ContentRef>(null);
  const settingsRef = useRef<ContentRef>(null);

  const getActiveContentRef = useCallback(() => {
    if (activeTab === 'settings') return settingsRef;
    if (activeTab === 'search') return searchRef;
    return contentRef;
  }, [activeTab]);

  // TV sidebar state (TiviMate-style collapsible)
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const expandedWidth = 230;
  const collapsedWidth = 86;

  const tabs: TabDef[] = useMemo(() => [
    { id: 'channels', icon: 'live-tv', label: t('channels') },
    { id: 'movies', icon: 'movie', label: t('movies') },
    { id: 'series', icon: 'tv', label: t('series') },
    { id: 'favorites', icon: 'favorite', label: t('favorites') },
    { id: 'recent', icon: 'history', label: t('recent') },
    { id: 'search', icon: 'search', label: t('search') },
    { id: 'settings', icon: 'settings', label: t('settings') },
  ], [t]);

  // ============================================================
  // BACK NAVIGATION - step-by-step, never closes app
  // Priority:
  //   1. Let active content handle back (e.g. movie grid -> categories)
  //   2. If on a non-default tab, go back to channels (default tab)
  //   3. If already on channels, show exit confirmation
  // ============================================================
  useEffect(() => {
    if (!isFocused) return;

    // Enable menu key interception on tvOS so the remote's menu button
    // triggers hardwareBackPress instead of exiting the app
    if (isTV && TVEventControl?.enableTVMenuKey) {
      TVEventControl.enableTVMenuKey();
    }

    const onBack = () => {
      // 1. Let the active content component handle back first
      if (getActiveContentRef().current?.handleBack?.()) {
        return true;
      }

      // 2. If not on the default tab, navigate back to channels
      if (activeTab !== 'channels') {
        setActiveTab('channels');
        return true;
      }

      // 3. On default tab with nothing to go back to: show exit dialog
      Alert.alert(
        t('exitAppTitle'),
        t('exitAppMessage'),
        [
          { text: t('no'), style: 'cancel' },
          {
            text: t('yes'),
            style: 'destructive',
            onPress: () => {
              if (isTV && TVEventControl?.disableTVMenuKey) {
                TVEventControl.disableTVMenuKey();
              }

              const rnExitApp = (NativeModules as any)?.RNExitApp;
              if (rnExitApp?.exitApp) {
                try {
                  rnExitApp.exitApp();
                } catch (_) {}
              }

              try {
                BackHandler.exitApp();
              } catch (_) {}
            },
          },
        ],
        { cancelable: false }
      );
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => {
      if (isTV && TVEventControl?.disableTVMenuKey) {
        TVEventControl.disableTVMenuKey();
      }
      backHandler.remove();
    };
  }, [isFocused, activeTab, getActiveContentRef, t]);

  const handleTabPress = useCallback((tab: TabId, options?: { collapseSidebar?: boolean }) => {
    setActiveTab(tab);

    if (isTV && options?.collapseSidebar) {
      setIsSidebarExpanded(false);
    }

    setTimeout(() => {
      getActiveContentRef().current?.focusFirstItem();
    }, 100);
  }, [getActiveContentRef]);

  if (isLoading) {
    return (
      <View style={[styles.centeredContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const handleSidebarFocus = () => {
    setIsSidebarExpanded(true);
  };

  const handleSidebarBlur = () => {};

  const handleSidebarReturn = () => {
    setIsSidebarExpanded(true);
  };

  const renderContent = () => {
    return (
      <View style={{ flex: 1 }}>
        {activeTab === 'channels' && <ChannelList ref={contentRef} onReturnToSidebar={handleSidebarReturn} initialViewMode="epg" />}
        {activeTab === 'movies' && <MovieList ref={contentRef} onReturnToSidebar={handleSidebarReturn} />}
        {activeTab === 'series' && <SeriesList ref={contentRef} onReturnToSidebar={handleSidebarReturn} />}
        {activeTab === 'favorites' && <FavoritesList ref={contentRef} onReturnToSidebar={handleSidebarReturn} />}
        {activeTab === 'recent' && <RecentlyWatchedList ref={contentRef} onReturnToSidebar={handleSidebarReturn} />}
        {activeTab === 'settings' && <SettingsScreen ref={settingsRef} />}
        {activeTab === 'search' && <SearchScreen ref={searchRef} />}
      </View>
    );
  };

  // ===== TV LAYOUT: TiviMate-style left sidebar =====
  if (isTV) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, flexDirection: 'row' }}>
        {/* TiviMate-style sidebar - TVFocusGuideView with autoFocus ensures
            the focus engine can find sidebar items when navigating left */}
        <TVFocusGuideView autoFocus style={[tvStyles.sidebar, { width: isSidebarExpanded ? expandedWidth : collapsedWidth, backgroundColor: colors.card, borderRightColor: colors.divider }]}>
          <View style={{ paddingTop: Math.max(insets.top, 18), paddingBottom: Math.max(insets.bottom, 10), flex: 1 }}>
            {isSidebarExpanded && <Text style={[tvStyles.sidebarSectionTitle, { color: colors.textMuted }]}>{t('menu')}</Text>}

            {tabs.map((tab) => (
              <TVSidebarItem
                key={tab.id}
                onFocus={handleSidebarFocus}
                onBlur={handleSidebarBlur}
                icon={tab.icon}
                label={tab.label}
                isActive={activeTab === tab.id}
                onPress={() => handleTabPress(tab.id, { collapseSidebar: true })}
                showLabel={isSidebarExpanded}
                colors={colors}
                hasTVPreferredFocus={isSidebarExpanded && tab.id === activeTab}
              />
            ))}

            <View style={{ height: 1, backgroundColor: colors.divider, marginVertical: 14, marginHorizontal: 14 }} />
            {isSidebarExpanded && <Text style={[tvStyles.sidebarSectionTitle, { color: colors.textMuted }]}>{t('providers')}</Text>}

            {profiles.map(p => {
              const isCurrent = currentProfile?.id === p.id;
              let iconName = p.icon || 'dns';
              if (!VALID_PROFILE_ICONS.has(iconName.replace('_', '-'))) {
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
        </TVFocusGuideView>

        {/* Main Content - wrapped in TVFocusGuideView so directional navigation
            from sidebar works even when target items are not on the exact same Y position */}
        <TVFocusGuideView autoFocus style={{ flex: 1 }}>
          <View style={{ flex: 1 }}>
            {renderContent()}
          </View>
        </TVFocusGuideView>
      </View>
    );
  }

  // ===== MOBILE/TABLET LAYOUT: Top tab bar =====
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: colors.card, zIndex: 10, elevation: 10 }}>
        <MobileTopTabBar
          tabs={tabs}
          activeTab={activeTab}
          onTabPress={handleTabPress}
          colors={colors}
          profiles={profiles}
          currentProfileId={currentProfile?.id}
          onProfileSwitch={loadProfile}
        />
      </SafeAreaView>

      <View style={{ flex: 1, zIndex: 1 }}>
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
    fontSize: 13,
    marginBottom: 10,
    paddingHorizontal: 18,
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginHorizontal: 8,
    marginBottom: 6,
  },
  menuIcon: {
    marginRight: 14,
  },
});

const HomeScreen = () => {
  const { isInitializing, currentProfile, pin, channels, movies, series, isLoading, isUpdating, loadProfile, hasCheckedOnStartup, setHasCheckedOnStartup } = useIPTV();
  const { colors } = useSettings();
  const navigation = useNavigation<any>();
  const { t } = useTranslation();

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
         <Image source={require('../assets/character_logo.png')} style={{ width: 150, height: 150, marginBottom: 20 }} resizeMode="contain" />
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
             <Text style={{ color: colors.text, marginTop: 16, fontSize: 18, fontWeight: '600' }}>{t('playlistUpdating', 'Aktualisiere Playlist...')}</Text>
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
