import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useIsFocused, useRoute } from '@react-navigation/native';
import { useIPTVAppState, useIPTVGuide, useIPTVLibrary, useIPTVParental, useIPTVProfiles } from '../context/IPTVContext';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../context/SettingsContext';

import WelcomeScreen from './WelcomeScreen';
import { isTV as isTVPlatform } from '../utils/platform';
import { HomeContentRouter } from '../components/home/HomeContentRouter';
import { HomeTVLayout } from '../components/home/HomeTVLayout';
import { HomeMobileLayout } from '../components/home/HomeMobileLayout';
import type { HomeContentRef, TabId, TabDef } from '../components/home/types';
import { useHomeBackHandler, useHomeStartupChecks } from '../hooks/home';
import { spacing } from '../theme/tokens';

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
// MAIN LAYOUT
// ============================================================
const MainLayout = () => {
  const { t } = useTranslation();
  const { colors } = useSettings();
  const { isLoading } = useIPTVAppState();
  const { profiles, currentProfile, loadProfile } = useIPTVProfiles();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const isFocused = useIsFocused();

  const [activeTab, setActiveTab] = useState<TabId>('channels');

  // Handle return parameters from Player
  useEffect(() => {
    if (route.params?.returnTab) {
      setActiveTab(route.params.returnTab);
      if (
        isTV &&
        route.params.returnTab === 'channels' &&
        !route.params?.focusChannelId &&
        !route.params?.returnGroupId
      ) {
        setIsSidebarExpanded(true);
        setTimeout(() => {
          channelsRef.current?.focusFirstItem();
        }, 120);
      }
      navigation.setParams({ returnTab: undefined });
    }
  }, [route.params?.returnTab, navigation]);

  const channelsRef = useRef<HomeContentRef>(null);
  const moviesRef = useRef<HomeContentRef>(null);
  const seriesRef = useRef<HomeContentRef>(null);
  const favoritesRef = useRef<HomeContentRef>(null);
  const recentRef = useRef<HomeContentRef>(null);
  const searchRef = useRef<HomeContentRef>(null);
  const settingsRef = useRef<HomeContentRef>(null);

  const getActiveContentRef = useCallback(() => {
    if (activeTab === 'channels') return channelsRef;
    if (activeTab === 'movies') return moviesRef;
    if (activeTab === 'series') return seriesRef;
    if (activeTab === 'favorites') return favoritesRef;
    if (activeTab === 'recent') return recentRef;
    if (activeTab === 'settings') return settingsRef;
    if (activeTab === 'search') return searchRef;
    return channelsRef;
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

  useHomeBackHandler({
    isFocused,
    isTV,
    activeTab,
    setActiveTab,
    getActiveContentRef,
    t,
  });

  const handleTabPress = useCallback((tab: TabId) => {
    setActiveTab(tab);

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

  const contentNode = (
    <HomeContentRouter
      activeTab={activeTab}
      channelsRef={channelsRef}
      moviesRef={moviesRef}
      seriesRef={seriesRef}
      favoritesRef={favoritesRef}
      recentRef={recentRef}
      searchRef={searchRef}
      settingsRef={settingsRef}
      onReturnToSidebar={handleSidebarReturn}
    />
  );

  if (isTV) {
    return (
      <HomeTVLayout
        colors={colors}
        insets={{ top: insets.top, bottom: insets.bottom }}
        isSidebarExpanded={isSidebarExpanded}
        expandedWidth={expandedWidth}
        collapsedWidth={collapsedWidth}
        tabs={tabs}
        activeTab={activeTab}
        t={t}
        onSidebarFocus={handleSidebarFocus}
        onSidebarBlur={handleSidebarBlur}
        onTabPress={handleTabPress}
        profiles={profiles}
        currentProfileId={currentProfile?.id}
        currentProfileName={currentProfile?.name}
        onProfilePress={loadProfile}
        validProfileIcons={VALID_PROFILE_ICONS}>
        {contentNode}
      </HomeTVLayout>
    );
  }

  return (
    <HomeMobileLayout
      colors={colors}
      tabs={tabs}
      activeTab={activeTab}
      onTabPress={handleTabPress}
      profiles={profiles}
      currentProfileId={currentProfile?.id}
      onProfileSwitch={loadProfile}>
      {contentNode}
    </HomeMobileLayout>
  );
};

const HomeScreen = () => {
  const { isInitializing, isLoading, isUpdating, hasCheckedOnStartup, setHasCheckedOnStartup } = useIPTVAppState();
  const { currentProfile, loadProfile } = useIPTVProfiles();
  const { loadEPG } = useIPTVGuide();
  const { pin } = useIPTVParental();
  const { hasAdultContent } = useIPTVLibrary();
  const { colors } = useSettings();
  const navigation = useNavigation<any>();
  const { t } = useTranslation();

  useHomeStartupChecks({
    isInitializing,
    isLoading,
    currentProfile,
    pin,
    hasAdultContent,
    hasCheckedOnStartup,
    setHasCheckedOnStartup,
    loadProfile,
    loadEPG,
    navigateToPinSetup: () => navigation.navigate('PinSetup'),
  });

  if (isInitializing || (isLoading && !currentProfile)) {
    return (
      <View style={[styles.centeredContainer, { backgroundColor: colors.background }]}>
         <Image source={require('../assets/character_logo.png')} style={styles.loadingLogo} resizeMode="contain" />
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
    <View style={styles.root}>
       <MainLayout />
       {isUpdating && (
          <View style={[StyleSheet.absoluteFill, styles.centeredContainer, styles.updatingOverlay]}>
             <ActivityIndicator size="large" color={colors.primary} />
             <Text style={[styles.updatingText, { color: colors.text }]}>{t('playlistUpdating', 'Aktualisiere Playlist...')}</Text>
          </View>
       )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingLogo: {
    width: 150,
    height: 150,
    marginBottom: spacing.xl,
  },
  updatingOverlay: {
    backgroundColor: 'rgba(0,0,0,0.85)',
    zIndex: 999,
  },
  updatingText: {
    marginTop: spacing.lg,
    fontSize: 18,
    fontWeight: '600',
  },
});

export default HomeScreen;
