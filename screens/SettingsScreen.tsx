import React, { forwardRef, useState, useEffect, useRef, useImperativeHandle } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Alert, Platform } from 'react-native';
import { useIPTVParental, useIPTVProfiles } from '../context/IPTVContext';
import { useSettings, PlayerType } from '../context/SettingsContext';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { useTranslation } from 'react-i18next';
import { Moon, Sun, Monitor, Palette, Settings, Tv, Shield, Database, PlayCircle } from 'lucide-react-native';
import { getAvailablePlayerTypesForPlatform } from '../components/player/PlayerAdapter';
import { effects, radii, spacing, typography } from '../theme/tokens';
import SectionHeader from '../components/ui/SectionHeader';
import SurfaceCard from '../components/ui/SurfaceCard';

type ContentRef = { focusFirstItem: () => void; handleBack?: () => boolean };

const SettingsScreen = forwardRef<ContentRef>((_props, ref) => {
  const { t } = useTranslation();
  const { currentProfile, profiles, removeProfile, loadProfile, unloadProfile } = useIPTVProfiles();
  const { pin, isAdultUnlocked, unlockAdultContent, lockAdultContent } = useIPTVParental();
  const {
    colors, themeMode, setThemeMode, bufferSize, setBufferSize,
    playerType, setPlayerType, vlcHardwareAcceleration, setVlcHardwareAcceleration,
    ksplayerHardwareDecode, setKsplayerHardwareDecode,
    ksplayerAsynchronousDecompression, setKsplayerAsynchronousDecompression,
    ksplayerDisplayFrameRate, setKsplayerDisplayFrameRate,
    tmdbApiKey, setTmdbApiKey
  } = useSettings();

  const navigation = useNavigation<any>();
  const isFocusedScreen = useIsFocused();

  const [activeCategory, setActiveCategory] = useState<'playlists' | 'general' | 'appearance' | 'playback' | 'parental' | 'advanced'>('playlists');
  const [focusedCategory, setFocusedCategory] = useState<'playlists' | 'general' | 'appearance' | 'playback' | 'parental' | 'advanced' | null>(null);
  const [activeSubMenu, setActiveSubMenu] = useState<{ title: string, options: any[], onSelect: (val: any) => void, selectedValue: any } | null>(null);
  const firstCategoryRef = useRef<any>(null);

  useImperativeHandle(ref, () => ({
    focusFirstItem: () => {
      firstCategoryRef.current?.focus?.();
      firstCategoryRef.current?.setNativeProps?.({ hasTVPreferredFocus: true });
    },
    handleBack: () => {
      if (activeSubMenu) {
        setActiveSubMenu(null);
        return true;
      }
      return false;
    },
  }), [activeSubMenu]);

  const [updateInterval, setUpdateInterval] = React.useState<number>(24);

  useEffect(() => {
    const loadInterval = async () => {
      const stored = await AsyncStorage.getItem('app_update_interval');
      if (stored) setUpdateInterval(parseInt(stored, 10));
    };
    loadInterval();
  }, []);

  const handleSetUpdateInterval = async (val: number) => {
    setUpdateInterval(val);
    await AsyncStorage.setItem('app_update_interval', val.toString());
  };

  const handleManualUpdate = async () => {
    if (currentProfile) {
      loadProfile(currentProfile, true);
    }
  };

  const handleClearCache = async () => {
    Alert.alert(
      t('settings.clearCacheTitle'),
      t('settings.clearCacheConfirm'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('clear'),
          style: 'destructive',
          onPress: async () => {
             try {
                const keys = await AsyncStorage.getAllKeys();
                const cacheKeys = keys.filter(k => k.startsWith('IPTV_EPG_'));
                if (cacheKeys.length > 0) {
                   await AsyncStorage.multiRemove(cacheKeys);
                }

                if (Platform.OS !== 'web') {
                   const cacheDirUri = Platform.isTV
                     ? FileSystem.cacheDirectory
                     : FileSystem.documentDirectory;
                   if (cacheDirUri) {
                     const files = await FileSystem.readDirectoryAsync(cacheDirUri);
                     const epgFiles = files.filter(f => f.startsWith('IPTV_EPG_') && f.endsWith('.json'));
                     await Promise.all(
                       epgFiles.map(f => FileSystem.deleteAsync(`${cacheDirUri}${f}`, { idempotent: true }))
                     );
                   }
                }
                Alert.alert(t('success'), t('settings.clearCacheSuccess'));
             } catch (e) {
                Alert.alert(t('error'), t('settings.clearCacheFailed'));
             }
          }
        }
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to clear your data and logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => {
            unloadProfile();
          }
        }
      ]
    );
  };

  const handleSetTmdbKey = () => {
    if (Platform.OS === 'ios') {
      Alert.prompt(
        'TMDB API Key',
        'Enter your TMDB API key to enable enriched media info (posters, backdrops, ratings, etc.)',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Save',
            onPress: (key?: string) => {
              if (key !== undefined) setTmdbApiKey(key);
            }
          }
        ],
        'plain-text',
        tmdbApiKey
      );
    } else {
      // Simple fallback for Android/TV or other platforms where prompt isn't supported or styled differently
      // In a real app we might use a dedicated Input screen or Modal
      Alert.alert(
        'TMDB API Key',
        'Please use the web interface or a supported mobile device to set the TMDB API Key, or enter it below if your platform supports it.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Clear Key', style: 'destructive', onPress: () => setTmdbApiKey('') }
        ]
      );
    }
  };

  const handleDeleteProfile = (id: string) => {
    Alert.alert(
      'Delete Profile',
      'Are you sure you want to delete this profile?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await removeProfile(id);
            if (profiles.length === 1 && profiles[0].id === id) {
              unloadProfile();
            }
          }
        }
      ]
    );
  };

  const getNativePlayerName = () => {
    if (Platform.isTV) return 'AVKit (HLS & MP4 only)';
    if (Platform.OS === 'ios') return 'Metal (Native)';
    if (Platform.OS === 'android') return 'ExoPlayer (Native)';
    return 'Native';
  };

  const getPlayerTypeName = (type: PlayerType) => {
    if (type === 'avkit') return 'AVKit (HLS & MP4 only)';
    if (type === 'vlc') return 'VLC (Android)';
    if (type === 'ksplayer') return 'KSPlayer (FFmpeg)';
    return getNativePlayerName();
  };

  const playerTypeOptions = getAvailablePlayerTypesForPlatform(Platform.OS, Platform.isTV).map((type) => {
    if (type === 'ksplayer') return { label: 'KSPlayer (FFmpeg)', value: 'ksplayer' as PlayerType };
    if (type === 'avkit') return { label: 'AVKit (HLS & MP4 only)', value: 'avkit' as PlayerType };
    if (type === 'vlc') return { label: 'VLC (Android)', value: 'vlc' as PlayerType };
    return { label: getNativePlayerName(), value: 'native' as PlayerType };
  });

  const handleToggleAdultContent = (value: boolean) => {
    if (!value) {
       lockAdultContent();
       return;
    }

    if (Platform.OS === 'ios') {
      Alert.prompt(
        'Enter PIN',
        'Please enter your PIN to unlock adult content',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Unlock',
            onPress: (enteredPin?: string) => {
               const sanitizedPin = (enteredPin ?? '').replace(/[^0-9]/g, '');
               if (!/^\d{4}$/.test(sanitizedPin)) {
                  Alert.alert('Error', 'The PIN code must be exactly 4 digits (0-9).');
                  return;
               }

               const unlocked = unlockAdultContent(sanitizedPin);
               if (!unlocked) {
                  Alert.alert('Error', 'Incorrect PIN code.');
               }
            }
          }
        ],
        'plain-text',
        '',
        'number-pad'
      );
    } else {
       navigation.navigate('PinSetup');
    }
  };

  // UI Components

  const renderCategoryItem = (id: typeof activeCategory, icon: any, label: string, index: number) => {
    const isActive = activeCategory === id;
    const isFocused = focusedCategory === id;
    return (
      <TouchableOpacity
        ref={index === 0 ? firstCategoryRef : undefined}
        style={[
          styles.categoryItem,
          (isActive || isFocused) && (Platform.isTV
            ? { backgroundColor: 'rgba(233, 105, 42, 0.2)', borderLeftColor: '#E9692A', borderLeftWidth: 3 }
            : { backgroundColor: 'rgba(233, 105, 42, 0.16)', borderBottomColor: '#E9692A', borderBottomWidth: 2 }),
          isFocused && Platform.isTV ? styles.categoryItemFocused : null,
        ]}
        onPress={() => setActiveCategory(id)}
        onFocus={() => setFocusedCategory(id)}
        onBlur={() => setFocusedCategory((current) => (current === id ? null : current))}
        accessible={true}
        accessibilityRole="tab"
        accessibilityState={{ selected: isActive }}
        isTVSelectable={true}
        hasTVPreferredFocus={isFocusedScreen && index === 0}
      >
        {icon}
        <Text style={[styles.categoryText, { color: isActive || isFocused ? '#FAFAFA' : '#A1A1AA' }]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  const renderSettingRow = (title: string, subtitle: string, rightContent: React.ReactNode, onPress?: () => void) => {
    return (
      <TouchableOpacity
        style={styles.settingRowTouchable}
        onPress={onPress}
        disabled={!onPress && Platform.isTV}
        accessible={true}
        accessibilityRole={onPress ? "button" : "none"}
        isTVSelectable={!!onPress}
      >
        <SurfaceCard backgroundColor={colors.card} borderColor={colors.divider} style={styles.settingRow}>
          <View style={styles.settingRowLeft}>
            <Text style={[styles.settingTitle, { color: colors.text }]}>{title}</Text>
            {subtitle ? <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text> : null}
          </View>
          <View style={styles.settingRowRight} pointerEvents={Platform.isTV ? 'none' : 'auto'}>
            {rightContent}
          </View>
        </SurfaceCard>
      </TouchableOpacity>
    );
  };

  const openSubMenu = (title: string, options: any[], onSelect: (val: any) => void, selectedValue: any) => {
    setActiveSubMenu({ title, options, onSelect, selectedValue });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.sidebar, { backgroundColor: colors.card, borderColor: colors.divider }]}>
        <Text style={[styles.sidebarTitle, { color: colors.text }]}>{t('settings')}</Text>
        <ScrollView
          style={{ flex: 1 }}
          horizontal={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={!Platform.isTV ? styles.mobileCategoryGrid : undefined}
        >
          {renderCategoryItem('playlists', <Tv color={activeCategory === 'playlists' ? '#FAFAFA' : '#A1A1AA'} size={20} style={{ marginRight: 12 }} />, 'Playlists / Providers', 0)}
          {renderCategoryItem('general', <Settings color={activeCategory === 'general' ? '#FAFAFA' : '#A1A1AA'} size={20} style={{ marginRight: 12 }} />, 'General', 1)}
          {renderCategoryItem('appearance', <Palette color={activeCategory === 'appearance' ? '#FAFAFA' : '#A1A1AA'} size={20} style={{ marginRight: 12 }} />, 'Appearance', 2)}
          {renderCategoryItem('playback', <PlayCircle color={activeCategory === 'playback' ? '#FAFAFA' : '#A1A1AA'} size={20} style={{ marginRight: 12 }} />, 'Playback', 3)}
          {renderCategoryItem('parental', <Shield color={activeCategory === 'parental' ? '#FAFAFA' : '#A1A1AA'} size={20} style={{ marginRight: 12 }} />, 'Parental Control', 4)}
          {renderCategoryItem('advanced', <Database color={activeCategory === 'advanced' ? '#FAFAFA' : '#A1A1AA'} size={20} style={{ marginRight: 12 }} />, 'Advanced', 5)}
        </ScrollView>
      </View>

      <View style={[styles.mainContent, { backgroundColor: colors.background }]}>
        {activeSubMenu ? (
          <View style={styles.subMenuContainer}>
             <TouchableOpacity
               style={styles.subMenuBack}
               onPress={() => setActiveSubMenu(null)}
               accessible={true}
               accessibilityRole="button"
               accessibilityLabel={`Back to ${activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1)}`}
               isTVSelectable={true}
             >
               <Text style={[styles.subMenuBackText, { color: colors.primary }]}>← Back to {activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1)}</Text>
             </TouchableOpacity>
             <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{activeSubMenu.title}</Text>
             <ScrollView>
               {activeSubMenu.options.map((opt, index) => (
                 <TouchableOpacity
                   key={index}
                   style={[
                     styles.subMenuItem,
                     { backgroundColor: colors.card, borderColor: activeSubMenu.selectedValue === opt.value ? colors.primary : colors.divider },
                     activeSubMenu.selectedValue === opt.value && { borderWidth: 2 }
                   ]}
                   onPress={() => {
                     activeSubMenu.onSelect(opt.value);
                     setActiveSubMenu(null);
                   }}
                   accessible={true}
                   accessibilityRole="button"
                   accessibilityState={{ selected: activeSubMenu.selectedValue === opt.value }}
                   isTVSelectable={true}
                 >
                   <Text style={[styles.subMenuItemText, { color: activeSubMenu.selectedValue === opt.value ? colors.primary : colors.text }]}>
                     {opt.label}
                   </Text>
                 </TouchableOpacity>
               ))}
             </ScrollView>
          </View>
        ) : (
          <ScrollView style={{ flex: 1, padding: 20 }}>
            {/* Playlists */}
            {activeCategory === 'playlists' && (
              <View>
                <SectionHeader title="Providers" color={colors.textSecondary} />
                {profiles.map(p => {
                  const isCurrent = p.id === currentProfile?.id;
                  return (
                    <View key={p.id} style={[styles.profileTile, { backgroundColor: colors.card, borderColor: isCurrent ? colors.primary : colors.divider, borderWidth: isCurrent ? 2 : 1 }]}>
                      <View style={styles.tileLeft}>
                        <Text style={[styles.tileTitle, { color: isCurrent ? colors.primary : colors.text, fontWeight: isCurrent ? 'bold' : 'normal' }]}>{p.name}</Text>
                        <Text style={[styles.tileSubtitle, { color: colors.textSecondary }]}>{(p.type === 'm3u' || p.type === 'xtream') ? p.url : ''}</Text>

                        {p.providerInfo && (
                          <View style={{ marginTop: 8 }}>
                            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{t('channelsCount')}: {p.providerInfo.channelsCount ?? '-'}</Text>
                            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{t('moviesCount')}: {p.providerInfo.moviesCount ?? '-'}</Text>
                            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{t('seriesCount')}: {p.providerInfo.seriesCount ?? '-'}</Text>
                            {p.type === 'xtream' && (
                              <>
                                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{t('connections')}: {p.providerInfo.activeConnections ?? '-'} / {p.providerInfo.maxConnections ?? '-'}</Text>
                                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{t('expiryDate')}: {p.providerInfo.expiryDate ? new Date(Number(p.providerInfo.expiryDate) * 1000).toLocaleDateString() : '-'}</Text>
                              </>
                            )}
                          </View>
                        )}
                      </View>
                      <View style={styles.tileRight}>
                        {!isCurrent && (
                          <TouchableOpacity onPress={() => loadProfile(p)} style={styles.iconButton} accessible={true} accessibilityRole="button" accessibilityLabel={`Load profile ${p.name}`} isTVSelectable={true}>
                            <Text style={{ color: colors.primary }}>Load</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity onPress={() => handleDeleteProfile(p.id)} style={styles.iconButton} accessible={true} accessibilityRole="button" accessibilityLabel={`Delete profile ${p.name}`} isTVSelectable={true}>
                          <Text style={{ color: colors.error }}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}

                {/* Add New Provider Button */}
                <TouchableOpacity
                  style={[styles.addProviderButton, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    unloadProfile();
                  }}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel="Add new provider"
                  isTVSelectable={true}
                >
                  <Tv color="#FFF" size={20} style={{ marginRight: 10 }} />
                  <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '600' }}>Add New Provider</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* General */}
            {activeCategory === 'general' && (
              <View>
                <SectionHeader title="General" color={colors.textSecondary} />
                {renderSettingRow(
                  'Update Interval',
                  `Refresh playlist every ${updateInterval} hours`,
                  <Text style={{ color: colors.primary }}>{updateInterval} Hours</Text>,
                  () => openSubMenu('Update Interval', [
                    { label: '12 Hours', value: 12 },
                    { label: '24 Hours', value: 24 },
                    { label: '48 Hours', value: 48 }
                  ], handleSetUpdateInterval, updateInterval)
                )}
                {renderSettingRow(
                  t('settings.updatePlaylist'),
                  'Force a fresh download of channels and TV guide',
                  <Text style={{ color: colors.primary }}>Update Now</Text>,
                  handleManualUpdate
                )}
              </View>
            )}

            {/* Appearance */}
            {activeCategory === 'appearance' && (
              <View>
                <SectionHeader title="Appearance" color={colors.textSecondary} />
                {renderSettingRow(
                  'Theme Mode',
                  `Current: ${themeMode.toUpperCase()}`,
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                     {themeMode === 'light' ? <Sun color={colors.text} size={16} /> : themeMode === 'dark' ? <Moon color={colors.text} size={16} /> : <Monitor color={colors.text} size={16} />}
                     <Text style={{ color: colors.primary }}>Change</Text>
                  </View>,
                  () => openSubMenu('Theme Mode', [
                    { label: 'Dark', value: 'dark' },
                    { label: 'OLED Black', value: 'oled' },
                    { label: 'Light', value: 'light' }
                  ], setThemeMode, themeMode)
                )}
              </View>
            )}

            {/* Playback */}
            {activeCategory === 'playback' && (
              <View>
                <SectionHeader title="Playback" color={colors.textSecondary} />
                {renderSettingRow(
                  t('playerSettings', 'Video Player Engine'),
                  getPlayerTypeName(playerType),
                  <Text style={{ color: colors.primary }}>Change</Text>,
                  () => openSubMenu('Video Player Engine', playerTypeOptions, setPlayerType, playerType)
                )}

                {renderSettingRow(
                  'Streaming Buffer Size',
                  `${bufferSize} MB`,
                  <Text style={{ color: colors.primary }}>Change</Text>,
                  () => openSubMenu('Buffer Size', [
                    { label: '8 MB', value: 8 },
                    { label: '16 MB', value: 16 },
                    { label: '32 MB', value: 32 },
                    { label: '64 MB', value: 64 },
                    { label: '128 MB', value: 128 }
                  ], setBufferSize, bufferSize)
                )}

                {playerType === 'vlc' && (
                  renderSettingRow(
                    t('hardwareAcceleration', 'Hardware Acceleration (VLC)'),
                    'Use hardware decoding when available',
                    <Switch
                      value={vlcHardwareAcceleration}
                      onValueChange={setVlcHardwareAcceleration}
                      trackColor={{ false: colors.divider, true: colors.primary }}
                      thumbColor={Platform.OS === 'ios' ? '#FFFFFF' : (vlcHardwareAcceleration ? colors.primary : '#f4f3f4')}
                    />,
                    Platform.isTV ? () => setVlcHardwareAcceleration(!vlcHardwareAcceleration) : undefined
                  )
                )}

                {playerType === 'ksplayer' && (
                  <>
                    {renderSettingRow(
                      t('hardwareAcceleration', 'Hardware Acceleration (KSPlayer)'),
                      'Use hardware decoding',
                      <Switch
                        value={ksplayerHardwareDecode}
                        onValueChange={setKsplayerHardwareDecode}
                        trackColor={{ false: colors.divider, true: colors.primary }}
                        thumbColor={Platform.OS === 'ios' ? '#FFFFFF' : (ksplayerHardwareDecode ? colors.primary : '#f4f3f4')}
                      />,
                      Platform.isTV ? () => setKsplayerHardwareDecode(!ksplayerHardwareDecode) : undefined
                    )}
                    {renderSettingRow(
                      t('asyncDecompression', 'Async Decompression'),
                      'Process video frames asynchronously',
                      <Switch
                        value={ksplayerAsynchronousDecompression}
                        onValueChange={setKsplayerAsynchronousDecompression}
                        trackColor={{ false: colors.divider, true: colors.primary }}
                        thumbColor={Platform.OS === 'ios' ? '#FFFFFF' : (ksplayerAsynchronousDecompression ? colors.primary : '#f4f3f4')}
                      />,
                      Platform.isTV ? () => setKsplayerAsynchronousDecompression(!ksplayerAsynchronousDecompression) : undefined
                    )}
                    {renderSettingRow(
                      t('adaptiveFrameRate', 'Adaptive Frame Rate'),
                      'Automatically adjust display frame rate',
                      <Switch
                        value={ksplayerDisplayFrameRate}
                        onValueChange={setKsplayerDisplayFrameRate}
                        trackColor={{ false: colors.divider, true: colors.primary }}
                        thumbColor={Platform.OS === 'ios' ? '#FFFFFF' : (ksplayerDisplayFrameRate ? colors.primary : '#f4f3f4')}
                      />,
                      Platform.isTV ? () => setKsplayerDisplayFrameRate(!ksplayerDisplayFrameRate) : undefined
                    )}
                  </>
                )}
              </View>
            )}

            {/* Parental Control */}
            {activeCategory === 'parental' && (
              <View>
                <SectionHeader title="Parental Control" color={colors.textSecondary} />
                {renderSettingRow(
                  'Parental Control PIN',
                  pin ? 'PIN is set' : 'No PIN set',
                  <Text style={{ color: colors.primary }}>Manage</Text>,
                  () => navigation.navigate('PinSetup')
                )}

                {pin && (
                  renderSettingRow(
                    'Show Adult Content',
                    isAdultUnlocked ? 'Unlocked' : 'Locked',
                    <Switch
                      value={isAdultUnlocked}
                      onValueChange={handleToggleAdultContent}
                      trackColor={{ false: colors.divider, true: colors.primary }}
                      thumbColor={Platform.OS === 'ios' ? '#FFFFFF' : (isAdultUnlocked ? colors.primary : '#f4f3f4')}
                    />,
                    Platform.isTV ? () => handleToggleAdultContent(!isAdultUnlocked) : undefined
                  )
                )}
              </View>
            )}

            {/* Advanced */}
            {activeCategory === 'advanced' && (
              <View>
                <SectionHeader title="Advanced" color={colors.textSecondary} />
                {renderSettingRow(
                  'TMDB API Key',
                  tmdbApiKey ? `Key is set: ${tmdbApiKey.substring(0, 4)}****` : 'No API key set',
                  <Text style={{ color: colors.primary }}>{tmdbApiKey ? 'Edit' : 'Set Key'}</Text>,
                  handleSetTmdbKey
                )}
                {renderSettingRow(
                  'Clear EPG & App Cache',
                  'Forces a fresh data fetch on next load',
                  <Text style={{ color: colors.error }}>Clear</Text>,
                  handleClearCache
                )}
                {renderSettingRow(
                  'Logout / Clear Data',
                  'Removes current profile and clears all data',
                  <Text style={{ color: colors.error }}>Logout</Text>,
                  handleLogout
                )}
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: Platform.isTV ? 'row' : 'column',
  },
  sidebar: {
    width: Platform.isTV ? 280 : '100%',
    borderRightWidth: Platform.isTV ? 1 : 0,
    borderBottomWidth: Platform.isTV ? 0 : 1,
    paddingTop: Platform.isTV ? spacing.xl : spacing.md,
    paddingBottom: Platform.isTV ? 0 : spacing.sm,
  },
  sidebarTitle: {
    ...typography.title,
    marginBottom: Platform.isTV ? spacing.xl : spacing.md,
    paddingHorizontal: spacing.xl,
    display: Platform.isTV ? 'flex' : 'none',
  },
  mobileCategoryGrid: {
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'stretch',
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Platform.isTV ? spacing.lg : spacing.sm + 2,
    paddingHorizontal: Platform.isTV ? spacing.xl : spacing.lg - 2,
    borderLeftWidth: Platform.isTV ? 3 : 0,
    borderLeftColor: 'transparent',
    borderBottomWidth: Platform.isTV ? 0 : 2,
    borderBottomColor: 'transparent',
    borderRadius: Platform.isTV ? 0 : radii.md,
    marginRight: Platform.isTV ? 0 : 8,
  },
  categoryItemFocused: {
    borderColor: 'rgba(233, 105, 42, 0.55)',
    borderWidth: 1.5,
  },
  categoryText: {
    ...typography.body,
  },
  mainContent: {
    flex: 1,
  },
  sectionTitle: {
    ...typography.section,
    marginBottom: spacing.lg,
  },
  settingRowTouchable: {
    marginBottom: spacing.xs,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.lg,
    borderWidth: effects.subtleBorderWidth,
    marginBottom: 0,
    backgroundColor: 'transparent',
  },
  settingRowLeft: {
    flex: 1,
  },
  settingTitle: {
    ...typography.body,
  },
  settingSubtitle: {
    ...typography.caption,
    marginTop: spacing.xs,
    opacity: 0.8,
  },
  settingRowRight: {
    marginLeft: spacing.lg,
    justifyContent: 'center',
  },
  profileTile: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg + 2,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    marginBottom: spacing.md,
  },
  tileLeft: {
    flex: 1,
  },
  tileRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tileTitle: {
    ...typography.body,
  },
  tileSubtitle: {
    fontSize: 14,
    marginTop: spacing.sm - 2,
    opacity: 0.8,
  },
  iconButton: {
    marginLeft: spacing.lg,
    padding: spacing.sm + 2,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  addProviderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    borderRadius: radii.lg,
    marginTop: spacing.lg,
  },
  // SubMenu Styles
  subMenuContainer: {
    flex: 1,
    padding: spacing.xl,
  },
  subMenuBack: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignSelf: 'flex-start',
    borderRadius: radii.sm,
    marginBottom: spacing.xl,
  },
  subMenuBackText: {
    ...typography.body,
    fontWeight: '700',
  },
  subMenuItem: {
    padding: spacing.lg + 2,
    borderRadius: radii.md,
    borderWidth: effects.subtleBorderWidth,
    marginBottom: spacing.md,
  },
  subMenuItemText: {
    ...typography.body,
  },
});

export default SettingsScreen;
