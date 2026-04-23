import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Image, ScrollView } from 'react-native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import type { ThemeColors } from '../../context/SettingsContext';
import type { IPTVProfile } from '../../types';
import type { TabId, TabDef } from './types';

export interface TabColors extends Pick<ThemeColors, 'primary' | 'text' | 'textMuted' | 'textSecondary' | 'primaryLight' | 'card' | 'divider'> {}

interface TVSidebarItemProps {
  icon: string;
  label: string;
  isActive: boolean;
  isFocused?: boolean;
  onPress: () => void;
  showLabel: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  colors: TabColors;
  hasTVPreferredFocus?: boolean;
}

export const TVSidebarItem = ({ icon, label, isActive, isFocused = false, onPress, showLabel, onFocus, onBlur, colors, hasTVPreferredFocus = false }: TVSidebarItemProps) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      onFocus={onFocus}
      onBlur={onBlur}
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
        name={icon as any}
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

const MobileTabItem = React.memo(({ tab, isActive, onPress, colors, onLayout }: {
  tab: TabDef;
  isActive: boolean;
  onPress: () => void;
  colors: TabColors;
  onLayout?: (x: number, width: number) => void;
}) => {
  const [isFocused, setIsFocused] = useState(false);
  return (
    <TouchableOpacity
      onPress={onPress}
      onLayout={(event) => {
        const { x, width } = event.nativeEvent.layout;
        onLayout?.(x, width);
      }}
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

export const MobileTopTabBar = ({ tabs, activeTab, onTabPress, colors, profiles, currentProfileId, onProfileSwitch }: {
  tabs: TabDef[];
  activeTab: TabId;
  onTabPress: (tab: TabId) => void;
  colors: TabColors;
  profiles: IPTVProfile[];
  currentProfileId?: string;
  onProfileSwitch: (profile: IPTVProfile) => void;
}) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [tabsViewportWidth, setTabsViewportWidth] = useState(0);
  const [tabsContentWidth, setTabsContentWidth] = useState(0);
  const tabsScrollXRef = useRef(0);
  const [showLeftScrollCue, setShowLeftScrollCue] = useState(false);
  const [showRightScrollCue, setShowRightScrollCue] = useState(false);
  const [tabLayouts, setTabLayouts] = useState<Partial<Record<TabId, { x: number; width: number }>>>({});
  const tabsScrollRef = useRef<ScrollView>(null);

  const hasTabOverflow = tabsContentWidth - tabsViewportWidth > 6;

  const updateScrollMetrics = useCallback((nextX: number) => {
    tabsScrollXRef.current = nextX;
    if (!hasTabOverflow) {
      setShowLeftScrollCue(false);
      setShowRightScrollCue(false);
      return;
    }
    const maxScrollX = tabsContentWidth - tabsViewportWidth - 8;
    const nextShowLeft = nextX > 8;
    const nextShowRight = nextX < maxScrollX;
    setShowLeftScrollCue((prev) => (prev === nextShowLeft ? prev : nextShowLeft));
    setShowRightScrollCue((prev) => (prev === nextShowRight ? prev : nextShowRight));
  }, [hasTabOverflow, tabsContentWidth, tabsViewportWidth]);

  useEffect(() => {
    updateScrollMetrics(tabsScrollXRef.current);
  }, [updateScrollMetrics]);

  useEffect(() => {
    if (!tabsViewportWidth) return;
    const activeLayout = tabLayouts[activeTab];
    if (!activeLayout) return;

    const viewportLeft = tabsScrollXRef.current;
    const viewportRight = viewportLeft + tabsViewportWidth;
    const activeLeft = activeLayout.x;
    const activeRight = activeLayout.x + activeLayout.width;
    const edgePadding = 12;

    if (activeLeft < viewportLeft + edgePadding) {
      const targetX = Math.max(0, activeLeft - edgePadding);
      tabsScrollRef.current?.scrollTo({ x: targetX, animated: true });
      updateScrollMetrics(targetX);
      return;
    }

    if (activeRight > viewportRight - edgePadding) {
      const targetX = Math.max(0, activeRight - tabsViewportWidth + edgePadding);
      tabsScrollRef.current?.scrollTo({ x: targetX, animated: true });
      updateScrollMetrics(targetX);
    }
  }, [activeTab, tabLayouts, tabsViewportWidth, updateScrollMetrics]);

  return (
    <View style={[mobileTabStyles.outerContainer, { backgroundColor: colors.card }]}> 
      <View style={[mobileTabStyles.container, { borderBottomColor: colors.divider }]}> 
        <TouchableOpacity
          style={[mobileTabStyles.brandContainer, { borderRightColor: colors.divider }]}
          onPress={() => profiles.length > 1 && setShowProfileMenu(!showProfileMenu)}
          activeOpacity={0.7}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={profiles.length > 1 ? 'Switch provider profile' : 'App logo'}
          accessibilityState={{ expanded: showProfileMenu }}
        >
          <Image source={require('../../assets/brand-mark-small.png')} style={mobileTabStyles.brandLogo} resizeMode="contain" />
          {profiles.length > 1 && (
            <Icon name="arrow-drop-down" size={18} color={colors.textMuted} />
          )}
        </TouchableOpacity>

        <View style={mobileTabStyles.tabsScrollArea}>
          {showLeftScrollCue && (
            <View pointerEvents="none" style={mobileTabStyles.leftScrollCue}>
              <Icon name="chevron-left" size={16} color={colors.textSecondary} />
            </View>
          )}
          {showRightScrollCue && (
            <View pointerEvents="none" style={mobileTabStyles.rightScrollCue}>
              <Icon name="chevron-right" size={16} color={colors.textSecondary} />
            </View>
          )}
          <ScrollView
            ref={tabsScrollRef}
            horizontal
            showsHorizontalScrollIndicator={hasTabOverflow}
            contentContainerStyle={mobileTabStyles.tabsRow}
            bounces={false}
            onLayout={(event) => setTabsViewportWidth(event.nativeEvent.layout.width)}
            onContentSizeChange={(width) => setTabsContentWidth(width)}
            onScrollEndDrag={(event) => updateScrollMetrics(event.nativeEvent.contentOffset.x)}
            onMomentumScrollEnd={(event) => updateScrollMetrics(event.nativeEvent.contentOffset.x)}
          >
            {tabs.map((tab) => (
              <MobileTabItem
                key={tab.id}
                tab={tab}
                isActive={activeTab === tab.id}
                onPress={() => { setShowProfileMenu(false); onTabPress(tab.id); }}
                onLayout={(x, width) => {
                  setTabLayouts((prev) => {
                    const existing = prev[tab.id];
                    if (existing && existing.x === x && existing.width === width) {
                      return prev;
                    }
                    return { ...prev, [tab.id]: { x, width } };
                  });
                }}
                colors={colors}
              />
            ))}
          </ScrollView>
        </View>
      </View>

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
  tabsScrollArea: {
    flex: 1,
    position: 'relative',
  },
  leftScrollCue: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 22,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingLeft: 2,
    zIndex: 2,
    backgroundColor: 'rgba(16, 18, 34, 0.38)',
  },
  rightScrollCue: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 22,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 2,
    zIndex: 2,
    backgroundColor: 'rgba(16, 18, 34, 0.38)',
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

export const tvStyles = StyleSheet.create({
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
