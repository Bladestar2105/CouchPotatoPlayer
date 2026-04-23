import React from 'react';
import { StyleSheet, View } from 'react-native';
import ChannelList from '../ChannelList';
import MovieList from '../MovieList';
import SeriesList from '../SeriesList';
import FavoritesList from '../FavoritesList';
import RecentlyWatchedList from '../RecentlyWatchedList';
import SettingsScreen from '../../screens/SettingsScreen';
import SearchScreen from '../../screens/SearchScreen';
import type { TabId, HomeContentRef } from './types';

interface HomeContentRouterProps {
  activeTab: TabId;
  channelsRef: React.RefObject<HomeContentRef | null>;
  moviesRef: React.RefObject<HomeContentRef | null>;
  seriesRef: React.RefObject<HomeContentRef | null>;
  favoritesRef: React.RefObject<HomeContentRef | null>;
  recentRef: React.RefObject<HomeContentRef | null>;
  searchRef: React.RefObject<HomeContentRef | null>;
  settingsRef: React.RefObject<HomeContentRef | null>;
  onReturnToSidebar: () => void;
}

export const HomeContentRouter = ({
  activeTab,
  channelsRef,
  moviesRef,
  seriesRef,
  favoritesRef,
  recentRef,
  searchRef,
  settingsRef,
  onReturnToSidebar,
}: HomeContentRouterProps) => {
  return (
    <View style={{ flex: 1 }}>
      <View style={[styles.tabContainer, activeTab === 'channels' ? styles.visibleTab : styles.hiddenTab]}>
        <ChannelList ref={channelsRef} onReturnToSidebar={onReturnToSidebar} initialViewMode="epg" />
      </View>
      <View style={[styles.tabContainer, activeTab === 'movies' ? styles.visibleTab : styles.hiddenTab]}>
        <MovieList ref={moviesRef} onReturnToSidebar={onReturnToSidebar} />
      </View>
      <View style={[styles.tabContainer, activeTab === 'series' ? styles.visibleTab : styles.hiddenTab]}>
        <SeriesList ref={seriesRef} onReturnToSidebar={onReturnToSidebar} />
      </View>
      <View style={[styles.tabContainer, activeTab === 'favorites' ? styles.visibleTab : styles.hiddenTab]}>
        <FavoritesList ref={favoritesRef} onReturnToSidebar={onReturnToSidebar} />
      </View>
      <View style={[styles.tabContainer, activeTab === 'recent' ? styles.visibleTab : styles.hiddenTab]}>
        <RecentlyWatchedList ref={recentRef} onReturnToSidebar={onReturnToSidebar} />
      </View>
      <View style={[styles.tabContainer, activeTab === 'settings' ? styles.visibleTab : styles.hiddenTab]}>
        <SettingsScreen ref={settingsRef} />
      </View>
      <View style={[styles.tabContainer, activeTab === 'search' ? styles.visibleTab : styles.hiddenTab]}>
        <SearchScreen ref={searchRef} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  tabContainer: {
    flex: 1,
  },
  visibleTab: {
    display: 'flex',
  },
  hiddenTab: {
    display: 'none',
  },
});
