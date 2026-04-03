import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Alert, Platform, Modal, FlatList } from 'react-native';
import { Picker } from '@react-native-picker/picker';

let ActionSheetIOS: any;
if (Platform.OS === 'ios' && !Platform.isTV) {
  try {
    ActionSheetIOS = require('react-native').ActionSheetIOS;
  } catch (e) {
    // Ignore
  }
}
import { useIPTV } from '../context/IPTVContext';
import { useSettings, ThemeMode, PlayerType } from '../context/SettingsContext';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { useTranslation } from 'react-i18next';
import { Moon, Sun, Monitor, Palette, Settings, Tv, Shield, Database, PlayCircle } from 'lucide-react-native';

const SettingsScreen = () => {
  const { t } = useTranslation();
  const { currentProfile, profiles, pin, isAdultUnlocked, unlockAdultContent, lockAdultContent, removeProfile, loadProfile, unloadProfile } = useIPTV();
  const {
    colors, themeMode, setThemeMode, bufferSize, setBufferSize,
    playerType, setPlayerType, vlcHardwareAcceleration, setVlcHardwareAcceleration,
    ksplayerHardwareDecode, setKsplayerHardwareDecode,
    ksplayerAsynchronousDecompression, setKsplayerAsynchronousDecompression,
    ksplayerDisplayFrameRate, setKsplayerDisplayFrameRate
  } = useSettings();

  const navigation = useNavigation<any>();
  const isFocusedScreen = useIsFocused();

  const [activeCategory, setActiveCategory] = useState<'playlists' | 'general' | 'appearance' | 'playback' | 'parental' | 'advanced'>('playlists');
  const [activeSubMenu, setActiveSubMenu] = useState<{ title: string, options: any[], onSelect: (val: any) => void, selectedValue: any } | null>(null);

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
      'Clear Cache',
      'This will clear saved EPG data and force a refresh on the next load. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
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
                Alert.alert('Success', 'Cache cleared successfully.');
             } catch (e) {
                Alert.alert('Error', 'Failed to clear cache.');
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
    if (type === 'vlc') return 'VLC (All Formats)';
    if (type === 'ksplayer') return 'KSPlayer (FFmpeg)';
    return getNativePlayerName();
  };

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
               if (enteredPin) {
                  const unlocked = unlockAdultContent(enteredPin);
                  if (!unlocked) {
                     Alert.alert('Error', 'Incorrect PIN code.');
                  }
               }
            }
          }
        ],
        'secure-text'
      );
    } else {
       navigation.navigate('PinSetup');
    }
  };

  // UI Components

  const renderCategoryItem = (id: typeof activeCategory, icon: any, label: string) => {
    const isActive = activeCategory === id;
    return (
      <TouchableOpacity
        style={[
          styles.categoryItem,
          isActive && { backgroundColor: 'rgba(59, 130, 246, 0.25)', borderLeftColor: '#3B82F6', borderLeftWidth: 3 }
        ]}
        onPress={() => setActiveCategory(id)}
        accessible={true}
        accessibilityRole="button"
        isTVSelectable={true}
      >
        {icon}
        <Text style={[styles.categoryText, { color: isActive ? '#FAFAFA' : '#A1A1AA' }]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  const renderSettingRow = (title: string, subtitle: string, rightContent: React.ReactNode, onPress?: () => void) => {
    return (
      <TouchableOpacity
        style={[styles.settingRow, { backgroundColor: colors.card, borderColor: colors.divider }]}
        onPress={onPress}
        disabled={!onPress && Platform.isTV}
        accessible={true}
        accessibilityRole={onPress ? "button" : "none"}
        isTVSelectable={!!onPress}
      >
        <View style={styles.settingRowLeft}>
          <Text style={[styles.settingTitle, { color: colors.text }]}>{title}</Text>
          {subtitle ? <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text> : null}
        </View>
        <View style={styles.settingRowRight} pointerEvents={Platform.isTV ? 'none' : 'auto'}>
          {rightContent}
        </View>
      </TouchableOpacity>
    );
  };

  const openSubMenu = (title: string, options: any[], onSelect: (val: any) => void, selectedValue: any) => {
    setActiveSubMenu({ title, options, onSelect, selectedValue });
  };

  return (
    <View style={[styles.container, { backgroundColor: '#000' }]}>
      <View style={[styles.sidebar, { backgroundColor: 'rgba(24,24,27,0.95)' }]}>
        <Text style={[styles.sidebarTitle, { color: colors.text }]}>{t('settings')}</Text>
        <ScrollView style={{ flex: 1 }}>
          {renderCategoryItem('playlists', <Tv color={activeCategory === 'playlists' ? '#FAFAFA' : '#A1A1AA'} size={20} style={{ marginRight: 12 }} />, 'Playlists / Providers')}
          {renderCategoryItem('general', <Settings color={activeCategory === 'general' ? '#FAFAFA' : '#A1A1AA'} size={20} style={{ marginRight: 12 }} />, 'General')}
          {renderCategoryItem('appearance', <Palette color={activeCategory === 'appearance' ? '#FAFAFA' : '#A1A1AA'} size={20} style={{ marginRight: 12 }} />, 'Appearance')}
          {renderCategoryItem('playback', <PlayCircle color={activeCategory === 'playback' ? '#FAFAFA' : '#A1A1AA'} size={20} style={{ marginRight: 12 }} />, 'Playback')}
          {renderCategoryItem('parental', <Shield color={activeCategory === 'parental' ? '#FAFAFA' : '#A1A1AA'} size={20} style={{ marginRight: 12 }} />, 'Parental Control')}
          {renderCategoryItem('advanced', <Database color={activeCategory === 'advanced' ? '#FAFAFA' : '#A1A1AA'} size={20} style={{ marginRight: 12 }} />, 'Advanced')}
        </ScrollView>
      </View>

      <View style={[styles.mainContent, { backgroundColor: colors.background }]}>
        {activeSubMenu ? (
          <View style={styles.subMenuContainer}>
             <TouchableOpacity
               style={styles.subMenuBack}
               onPress={() => setActiveSubMenu(null)}
               accessible={true}
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
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Providers</Text>
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
                          <TouchableOpacity onPress={() => loadProfile(p)} style={styles.iconButton} accessible={true} accessibilityRole="button" isTVSelectable={true}>
                            <Text style={{ color: colors.primary }}>Load</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity onPress={() => handleDeleteProfile(p.id)} style={styles.iconButton} accessible={true} accessibilityRole="button" isTVSelectable={true}>
                          <Text style={{ color: colors.error }}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* General */}
            {activeCategory === 'general' && (
              <View>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>General</Text>
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
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Appearance</Text>
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
              <View style={styles.playbackContainer}>
                {/* Header Area */}
                <View style={styles.playbackHeader}>
                   <Text style={[styles.mainTitle, { color: colors.textPrimary }]}>PLAYBACK SETTINGS</Text>
                   <View style={styles.headerIcons}>
                      <TouchableOpacity style={styles.headerIconBtn}><Text style={{ color: colors.textSecondary }}>?</Text></TouchableOpacity>
                      <TouchableOpacity style={styles.headerIconBtn}><Text style={{ color: colors.textSecondary }}>👤</Text></TouchableOpacity>
                   </View>
                </View>

                {/* Video Quality Section */}
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>● VIDEO QUALITY</Text>
                <View style={styles.videoQualityGrid}>
                   <View style={styles.videoQualityColLeft}>
                      <TouchableOpacity
                         style={styles.autoResCard}
                         onPress={() => openSubMenu('Video Player Engine', [
                            { label: 'VLC (All Formats)', value: 'vlc' },
                            { label: 'KSPlayer (FFmpeg)', value: 'ksplayer' },
                            { label: 'AVKit (HLS & MP4 only)', value: 'avkit' },
                            { label: getNativePlayerName(), value: 'native' }
                          ], setPlayerType, playerType)}
                      >
                         <View style={styles.autoResIcon}><Text style={{ color: '#fff', fontWeight: 'bold' }}>HQ</Text></View>
                         <View style={styles.autoResText}>
                            <Text style={styles.autoResTitle}>{t('playerSettings', 'Video Player Engine')}</Text>
                            <Text style={styles.autoResDesc}>Current: {getPlayerTypeName(playerType)}</Text>
                         </View>
                         <View style={styles.recommendedBadge}>
                            <Text style={styles.recommendedText}>RECOMMENDED</Text>
                            <Text style={{ color: '#00A8FF', marginLeft: 4 }}>✓</Text>
                         </View>
                      </TouchableOpacity>

                      <View style={styles.resolutionRow}>
                         <View style={styles.resCard}>
                            <Text style={styles.resTitle}>4K</Text>
                            <Text style={styles.resDesc}>Ultra HD Experience</Text>
                         </View>
                         <View style={styles.resCard}>
                            <Text style={styles.resTitle}>1080p</Text>
                            <Text style={styles.resDesc}>Full High Definition</Text>
                         </View>
                         <View style={styles.resCard}>
                            <Text style={styles.resTitle}>720p</Text>
                            <Text style={styles.resDesc}>Standard High Def</Text>
                         </View>
                      </View>
                   </View>

                   <View style={styles.videoQualityColRight}>
                      <View style={styles.statusCard}>
                         <Text style={styles.statusBadgeText}>CURRENT STATUS</Text>
                         <Text style={styles.statusMainText}>Stable Connection</Text>
                         <Text style={styles.statusDescText}>Your hardware supports high bitrate streaming.</Text>
                      </View>
                   </View>
                </View>

                {/* Audio & Subtitles Section */}
                <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: 24 }]}>● AUDIO & SUBTITLES</Text>
                <View style={styles.listGroup}>
                   <TouchableOpacity style={styles.listItem}>
                      <Text style={{ color: colors.textSecondary, marginRight: 12 }}>🌐</Text>
                      <Text style={[styles.listItemText, { color: colors.textPrimary }]}>Preferred Audio Language</Text>
                      <Text style={[styles.listItemValue, { color: colors.textSecondary }]}>English (Original)</Text>
                      <Text style={{ color: colors.textSecondary }}> ›</Text>
                   </TouchableOpacity>
                   <TouchableOpacity style={styles.listItem}>
                      <Text style={{ color: colors.textSecondary, marginRight: 12 }}>TT</Text>
                      <Text style={[styles.listItemText, { color: colors.textPrimary }]}>Subtitle Size</Text>
                      <Text style={[styles.listItemValue, { color: colors.textSecondary }]}>Medium (Normal)</Text>
                      <Text style={{ color: colors.textSecondary }}> ›</Text>
                   </TouchableOpacity>
                   <TouchableOpacity style={styles.listItem}>
                      <Text style={{ color: colors.textSecondary, marginRight: 12 }}>📝</Text>
                      <Text style={[styles.listItemText, { color: colors.textPrimary }]}>Subtitle Style</Text>
                      <Text style={[styles.listItemValue, { color: colors.textSecondary }]}>Classic White Shadow</Text>
                      <Text style={{ color: colors.textSecondary }}> ›</Text>
                   </TouchableOpacity>
                </View>

                {/* Advanced Engine Section */}
                <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: 24 }]}>● ADVANCED ENGINE</Text>
                <View style={styles.advancedGrid}>
                   {/* Hardware Acceleration */}
                   <View style={styles.advancedCard}>
                      <Text style={{ color: '#00A8FF', marginRight: 12 }}>⚡</Text>
                      <View style={styles.advancedCardContent}>
                         <Text style={[styles.advancedCardTitle, { color: colors.textPrimary }]}>Hardware Acceleration</Text>
                         <Text style={styles.advancedCardDesc}>Recommended for high bitrates</Text>
                      </View>
                      <View style={{ pointerEvents: Platform.isTV ? 'none' : 'auto' }}>
                        <Switch
                           value={playerType === 'vlc' ? vlcHardwareAcceleration : ksplayerHardwareDecode}
                           onValueChange={playerType === 'vlc' ? setVlcHardwareAcceleration : setKsplayerHardwareDecode}
                           trackColor={{ false: colors.divider, true: '#00A8FF' }}
                           thumbColor="#FFFFFF"
                        />
                      </View>
                   </View>

                   {/* Buffer Size */}
                   <TouchableOpacity
                      style={styles.advancedCard}
                      onPress={() => openSubMenu('Buffer Size', [
                        { label: '8 MB', value: 8 },
                        { label: '16 MB', value: 16 },
                        { label: '32 MB', value: 32 },
                        { label: '64 MB', value: 64 },
                        { label: '128 MB', value: 128 }
                      ], setBufferSize, bufferSize)}
                   >
                      <Text style={{ color: colors.textSecondary, marginRight: 12 }}>💾</Text>
                      <View style={styles.advancedCardContent}>
                         <Text style={[styles.advancedCardTitle, { color: colors.textPrimary }]}>Buffer Size</Text>
                         <Text style={styles.advancedCardDesc}>Current: {bufferSize}MB</Text>
                      </View>
                      <Text style={{ color: colors.textSecondary }}>⚙️</Text>
                   </TouchableOpacity>

                   {/* Refresh Rate Switching */}
                   <View style={styles.advancedCard}>
                      <Text style={{ color: colors.textSecondary, marginRight: 12 }}>🔄</Text>
                      <View style={styles.advancedCardContent}>
                         <Text style={[styles.advancedCardTitle, { color: colors.textPrimary }]}>Refresh Rate Switching</Text>
                         <Text style={styles.advancedCardDesc}>Match frame rate to content</Text>
                      </View>
                      <View style={{ pointerEvents: Platform.isTV ? 'none' : 'auto' }}>
                        <Switch
                           value={ksplayerDisplayFrameRate}
                           onValueChange={setKsplayerDisplayFrameRate}
                           trackColor={{ false: colors.divider, true: '#00A8FF' }}
                           thumbColor="#FFFFFF"
                           disabled={playerType !== 'ksplayer'}
                        />
                      </View>
                   </View>

                   {/* Async Decompression */}
                   <View style={styles.advancedCard}>
                      <Text style={{ color: colors.textSecondary, marginRight: 12 }}>🚀</Text>
                      <View style={styles.advancedCardContent}>
                         <Text style={[styles.advancedCardTitle, { color: colors.textPrimary }]}>Async Decompression</Text>
                         <Text style={styles.advancedCardDesc}>Improve playback smoothness</Text>
                      </View>
                      <View style={{ pointerEvents: Platform.isTV ? 'none' : 'auto' }}>
                        <Switch
                           value={ksplayerAsynchronousDecompression}
                           onValueChange={setKsplayerAsynchronousDecompression}
                           trackColor={{ false: colors.divider, true: '#00A8FF' }}
                           thumbColor="#FFFFFF"
                           disabled={playerType !== 'ksplayer'}
                        />
                      </View>
                   </View>
                </View>
              </View>
            )}

            {/* Parental Control */}
            {activeCategory === 'parental' && (
              <View>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Parental Control</Text>
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
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Advanced</Text>
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
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: Platform.isTV ? 280 : 250,
    borderRightWidth: 1,
    borderRightColor: '#27272A',
    paddingTop: 20,
  },
  sidebarTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  categoryText: {
    fontSize: 16,
    fontWeight: '500',
  },
  mainContent: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  settingRowLeft: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  settingSubtitle: {
    fontSize: 13,
    marginTop: 4,
    opacity: 0.8,
  },
  settingRowRight: {
    marginLeft: 16,
    justifyContent: 'center',
  },
  profileTile: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 12,
  },
  tileLeft: {
    flex: 1,
  },
  tileRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tileTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  tileSubtitle: {
    fontSize: 14,
    marginTop: 6,
    opacity: 0.8,
  },
  iconButton: {
    marginLeft: 16,
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  // SubMenu Styles
  subMenuContainer: {
    flex: 1,
    padding: 20,
  },
  subMenuBack: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignSelf: 'flex-start',
    borderRadius: 8,
    marginBottom: 20,
  },
  subMenuBackText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  subMenuItem: {
    padding: 18,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  subMenuItemText: {
    fontSize: 16,
    fontWeight: '500',
  },

  playbackContainer: {
    padding: 24,
  },
  playbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 16,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoQualityGrid: {
    flexDirection: Platform.isTV ? 'row' : 'column',
    gap: 16,
    marginBottom: 32,
  },
  videoQualityColLeft: {
    flex: 2,
    gap: 16,
  },
  videoQualityColRight: {
    flex: 1,
  },
  autoResCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#00A8FF',
    borderRadius: 12,
    padding: 20,
  },
  autoResIcon: {
    backgroundColor: '#00A8FF',
    padding: 10,
    borderRadius: 8,
    marginRight: 16,
  },
  autoResText: {
    flex: 1,
  },
  autoResTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  autoResDesc: {
    color: '#A1A1AA',
    fontSize: 13,
  },
  recommendedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,168,255,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  recommendedText: {
    color: '#00A8FF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  resolutionRow: {
    flexDirection: 'row',
    gap: 16,
  },
  resCard: {
    flex: 1,
    backgroundColor: '#1C1C1E',
    padding: 16,
    borderRadius: 12,
  },
  resTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  resDesc: {
    color: '#A1A1AA',
    fontSize: 12,
  },
  statusCard: {
    flex: 1,
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 20,
    justifyContent: 'center',
  },
  statusBadgeText: {
    color: '#00A8FF',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 8,
  },
  statusMainText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  statusDescText: {
    color: '#A1A1AA',
    fontSize: 13,
    lineHeight: 18,
  },
  listGroup: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 32,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  listItemText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  listItemValue: {
    fontSize: 14,
  },
  advancedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  advancedCard: {
    flex: Platform.isTV ? 1 : undefined,
    minWidth: Platform.isTV ? '45%' : '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    padding: 16,
    borderRadius: 12,
  },
  advancedCardContent: {
    flex: 1,
  },
  advancedCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  advancedCardDesc: {
    color: '#A1A1AA',
    fontSize: 13,
  },
});

export default SettingsScreen;
