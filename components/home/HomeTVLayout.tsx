import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import TVFocusGuideView from '../TVFocusGuideView';
import BrandMark from '../BrandMark';
import { TVSidebarItem, tvStyles } from './TabNavigation';
import type { TabDef, TabId } from './types';
import type { ThemeColors } from '../../context/SettingsContext';
import type { IPTVProfile } from '../../types';
import { colors as tokenColors, radii, spacing, typography } from '../../theme/tokens';
import { useTVPreferredFocusKey } from '../../hooks/useTVPreferredFocusKey';

interface HomeTVLayoutProps {
  colors: ThemeColors;
  insets: { top: number; right: number; bottom: number; left: number };
  isSidebarExpanded: boolean;
  expandedWidth: number;
  collapsedWidth: number;
  tabs: TabDef[];
  activeTab: TabId;
  t: (key: string) => string;
  onSidebarFocus: () => void;
  onSidebarBlur: () => void;
  onTabPress: (tabId: TabDef['id']) => void;
  profiles: IPTVProfile[];
  currentProfileId?: string;
  currentProfileName?: string;
  onProfilePress: (profile: IPTVProfile) => void;
  validProfileIcons: Set<string>;
  children: React.ReactNode;
}

const CLOCK_FORMATTER = new Intl.DateTimeFormat(undefined, {
  hour: '2-digit',
  minute: '2-digit',
  weekday: 'short',
  day: '2-digit',
  month: 'short',
});

export const HomeTVLayout = ({
  colors,
  insets,
  isSidebarExpanded,
  expandedWidth,
  collapsedWidth,
  tabs,
  activeTab,
  t,
  onSidebarFocus,
  onSidebarBlur,
  onTabPress,
  profiles,
  currentProfileId,
  currentProfileName,
  onProfilePress,
  validProfileIcons,
  children,
}: HomeTVLayoutProps) => {
  const sidebarWidth = isSidebarExpanded ? expandedWidth : collapsedWidth;
  const activeTabLabel = useMemo(() => tabs.find((tab) => tab.id === activeTab)?.label ?? '', [tabs, activeTab]);
  const [nowLabel, setNowLabel] = useState(() => CLOCK_FORMATTER.format(new Date()));
  const [focusedSidebarKey, setFocusedSidebarKey] = useState<string | null>(null);
  const preferredSidebarItemKey = useTVPreferredFocusKey(isSidebarExpanded ? `tab:${activeTab}` : null);

  useEffect(() => {
    const tick = () => setNowLabel(CLOCK_FORMATTER.format(new Date()));
    const intervalId = setInterval(tick, 60_000);
    tick();

    return () => clearInterval(intervalId);
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: tokenColors.bg }]}>
      <TVFocusGuideView
        autoFocus={isSidebarExpanded}
        style={[
          tvStyles.sidebar,
          styles.sidebar,
          {
            width: sidebarWidth + insets.left,
            backgroundColor: tokenColors.surface,
            borderRightColor: tokenColors.borderSoft,
          },
        ]}
      >
        <View
          style={[
            styles.sidebarInner,
            {
              paddingTop: Math.max(insets.top, spacing.lg + 2),
              paddingBottom: Math.max(insets.bottom, spacing.sm + 2),
              paddingLeft: insets.left,
            },
          ]}
        >
          <View style={[styles.brandHeader, !isSidebarExpanded && styles.brandHeaderCollapsed]}>
            <BrandMark size={32} />
            {isSidebarExpanded && (
              <View style={styles.brandText}>
                <Text style={styles.brandName} numberOfLines={1}>CouchPotato</Text>
                <Text style={styles.brandSub} numberOfLines={1}>Player</Text>
              </View>
            )}
          </View>

          {isSidebarExpanded && <Text style={tvStyles.sidebarSectionTitle}>{t('menu')}</Text>}

          {tabs.map((tab) => {
            const itemKey = `tab:${tab.id}`;
            return (
              <TVSidebarItem
                key={tab.id}
                onFocus={() => {
                  setFocusedSidebarKey(itemKey);
                  onSidebarFocus();
                }}
                onBlur={() => {
                  setFocusedSidebarKey((current) => (current === itemKey ? null : current));
                  onSidebarBlur();
                }}
                icon={tab.icon}
                label={tab.label}
                isActive={activeTab === tab.id}
                isFocused={focusedSidebarKey === itemKey}
                onPress={() => onTabPress(tab.id)}
                showLabel={isSidebarExpanded}
                colors={colors}
                hasTVPreferredFocus={preferredSidebarItemKey === itemKey}
              />
            );
          })}

          <View style={[styles.divider, { backgroundColor: tokenColors.borderSoft }]} />
          {isSidebarExpanded && <Text style={tvStyles.sidebarSectionTitle}>{t('providers')}</Text>}

          {profiles.map((profile) => {
            const isCurrent = currentProfileId === profile.id;
            let iconName = profile.icon || 'dns';
            if (!validProfileIcons.has(iconName.replace('_', '-'))) {
              iconName = 'dns';
            }
            const itemKey = `profile:${profile.id}`;

            return (
              <TVSidebarItem
                key={profile.id}
                onFocus={() => {
                  setFocusedSidebarKey(itemKey);
                  onSidebarFocus();
                }}
                onBlur={() => {
                  setFocusedSidebarKey((current) => (current === itemKey ? null : current));
                  onSidebarBlur();
                }}
                icon={iconName.replace('_', '-')}
                label={profile.name}
                isActive={isCurrent}
                isFocused={focusedSidebarKey === itemKey}
                onPress={() => onProfilePress(profile)}
                showLabel={isSidebarExpanded}
                colors={colors}
              />
            );
          })}
        </View>
      </TVFocusGuideView>

      <TVFocusGuideView autoFocus={!isSidebarExpanded} style={styles.contentGuide}>
        <View style={[styles.content, { backgroundColor: tokenColors.bg }]}>
          <View
            style={[
              styles.contentHeader,
              {
                borderBottomColor: tokenColors.borderSoft,
                backgroundColor: tokenColors.bg,
                paddingTop: Math.max(insets.top, spacing.sm),
                paddingRight: Math.max(insets.right, spacing.lg),
              },
            ]}
          >
            <View>
              <Text style={styles.activeSectionLabel} numberOfLines={1}>{activeTabLabel}</Text>
              {!!currentProfileName && (
                <Text style={styles.profileLabel} numberOfLines={1}>
                  {currentProfileName}
                </Text>
              )}
            </View>
            <Text style={styles.clockLabel}>{nowLabel}</Text>
          </View>
          <View style={styles.contentBody}>{children}</View>
        </View>
      </TVFocusGuideView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    borderRightWidth: 1,
  },
  sidebarInner: {
    flex: 1,
  },
  brandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.sm,
    marginBottom: spacing.lg,
  },
  brandHeaderCollapsed: {
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  brandText: {
    flexShrink: 1,
  },
  brandName: {
    color: tokenColors.text,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  brandSub: {
    ...typography.eyebrow,
    color: tokenColors.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginVertical: spacing.md + 2,
    marginHorizontal: spacing.md + 2,
    borderRadius: radii.sm,
  },
  contentGuide: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentHeader: {
    minHeight: 72,
    borderBottomWidth: 1,
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.sm + 2,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  activeSectionLabel: {
    ...typography.headline,
    color: tokenColors.text,
    textTransform: 'capitalize',
  },
  profileLabel: {
    ...typography.caption,
    color: tokenColors.textMuted,
    marginTop: 4,
  },
  clockLabel: {
    ...typography.subtitle,
    color: tokenColors.textDim,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  contentBody: {
    flex: 1,
  },
});
