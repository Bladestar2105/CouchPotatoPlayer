import React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MobileTopTabBar } from './TabNavigation';
import type { TabDef, TabId } from './types';
import type { ThemeColors } from '../../context/SettingsContext';
import type { IPTVProfile } from '../../types';

interface HomeMobileLayoutProps {
  colors: ThemeColors;
  tabs: TabDef[];
  activeTab: TabId;
  onTabPress: (tabId: TabDef['id']) => void;
  profiles: IPTVProfile[];
  currentProfileId?: string;
  onProfileSwitch: (profile: IPTVProfile) => void;
  children: React.ReactNode;
}

export const HomeMobileLayout = ({
  colors,
  tabs,
  activeTab,
  onTabPress,
  profiles,
  currentProfileId,
  onProfileSwitch,
  children,
}: HomeMobileLayoutProps) => {
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: colors.card, zIndex: 10, elevation: 10 }}>
        <MobileTopTabBar
          tabs={tabs}
          activeTab={activeTab}
          onTabPress={onTabPress}
          colors={colors}
          profiles={profiles}
          currentProfileId={currentProfileId}
          onProfileSwitch={onProfileSwitch}
        />
      </SafeAreaView>

      <View style={{ flex: 1, zIndex: 1, backgroundColor: colors.background }}>{children}</View>
    </View>
  );
};
