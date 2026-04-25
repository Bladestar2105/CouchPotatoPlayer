import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import type { ThemeColors } from '../../context/SettingsContext';
import type { IPTVProfile } from '../../types';
import type { TabId, TabDef } from './types';
import BrandMark from '../BrandMark';
import { focus, radii, spacing, typography } from '../../theme/tokens';

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
  const backgroundColor = isFocused ? colors.primary : (isActive ? colors.primaryLight : 'transparent');
  const foregroundColor = isFocused ? '#FFFFFF' : (isActive ? colors.primary : colors.textSecondary);

  return (
    <TouchableOpacity
      onPress={onPress}
      onFocus={onFocus}
      onBlur={onBlur}
      style={[
        tvStyles.menuItem,
        {
          backgroundColor,
          justifyContent: showLabel ? 'flex-start' : 'center',
          alignItems: 'center',
          borderWidth: focus.ringWidth,
          borderColor: isFocused ? colors.primary : 'transparent',
          transform: [{ scale: isFocused ? focus.scale : 1 }],
        },
        isFocused ? {
          shadowColor: colors.primary,
          shadowOpacity: focus.glow.shadowOpacity,
          shadowRadius: focus.glow.shadowRadius,
          shadowOffset: focus.glow.shadowOffset,
          elevation: focus.glow.elevation,
          zIndex: 2,
        } : null,
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
        size={22}
        color={foregroundColor}
        style={[showLabel ? tvStyles.menuIcon : tvStyles.menuIconCentered, { textAlign: 'center' }]}
      />
      {showLabel && (
        <Text
          style={{
            color: isFocused ? '#FFFFFF' : (isActive ? colors.text : colors.textSecondary),
            fontWeight: isActive || isFocused ? '700' : '500',
            fontSize: 15,
            letterSpacing: 0,
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
          <BrandMark size="mobile-header" />
          {profiles.length > 1 && (
            <Icon name="arrow-drop-down" size={18} color={colors.textMuted} style={{ marginLeft: 2 }} />
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
            scrollEventThrottle={16}
            onLayout={(event) => {
              setTabsViewportWidth(event.nativeEvent.layout.width);
              updateScrollMetrics(tabsScrollXRef.current);
            }}
            onContentSizeChange={(width) => {
              setTabsContentWidth(width);
              updateScrollMetrics(tabsScrollXRef.current);
            }}
            onScroll={(event) => updateScrollMetrics(event.nativeEvent.contentOffset.x)}
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
    paddingHorizontal: spacing.sm + 2,
    borderRightWidth: 1,
    height: '100%',
    minWidth: 58,
    flexShrink: 0,
    marginRight: 4,
  },
  profileDropdown: {
    position: 'absolute', top: 56, left: 0, minWidth: 220,
    borderWidth: 1, borderRadius: radii.lg, zIndex: 200, elevation: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 16,
    paddingVertical: 6,
  },
  profileItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 11, paddingHorizontal: spacing.lg, borderRadius: radii.md, marginHorizontal: 6, marginVertical: 2,
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
    ...typography.eyebrow,
    marginBottom: 10,
    paddingHorizontal: 18,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radii.md,
    marginHorizontal: 8,
    marginBottom: 4,
    minHeight: 48,
  },
  menuIcon: {
    marginRight: 14,
    width: 24,
  },
  menuIconCentered: {
    width: 24,
  },
});
