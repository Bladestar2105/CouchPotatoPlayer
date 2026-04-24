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
import { OVERLAY_AUTO_HIDE_SECONDS_OPTIONS } from '../utils/playbackSettings';
import { getTVBooleanSettingPressHandler } from '../utils/settingsControls';

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
    overlayAutoHideSeconds, setOverlayAutoHideSeconds,
    tmdbApiKey, setTmdbApiKey
  } = useSettings();

  const navigation = useNavigation<any>();
  const isFocusedScreen = useIsFocused();

  const [activeCategory, setActiveCategory] = useState<'playlists' | 'general' | 'appearance' | 'playback' | 'parental' | 'advanced'>('playlists');
  const [focusedCategory, setFocusedCategory] = useState<'playlists' | 'general' | 'appearance' | 'playback' | 'parental' | 'advanced' | null>(null);
  const [activeSubMenu, setActiveSubMenu] = useState<{ title: string, options: any[], onSelect: (val: any) => void, selectedValue: any } | null>(null);
  const firstCategoryRef = useRef<any>(null);
  const categoryLabels: Record<'playlists' | 'general' | 'appearance' | 'playback' | 'parental' | 'advanced', string> = {
    playlists: t('settings.category.playlists'),
    general: t('settings.category.general'),
    appearance: t('settings.category.appearance'),
    playback: t('settings.category.playback'),
    parental: t('settings.category.parental'),
    advanced: t('settings.category.advanced'),
  };

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
      t('settings.logoutTitle'),
      t('settings.logoutConfirm'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('settings.logoutCta'),
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
        t('settings.tmdbTitle'),
        t('settings.tmdbPrompt'),
        [
          { text: t('cancel'), style: 'cancel' },
          {
            text: t('save'),
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
        t('settings.tmdbTitle'),
        t('settings.tmdbUnsupportedPrompt'),
        [
          { text: t('cancel'), style: 'cancel' },
          { text: t('settings.tmdbClearKey'), style: 'destructive', onPress: () => setTmdbApiKey('') }
        ]
      );
    }
  };

  const handleDeleteProfile = (id: string) => {
    Alert.alert(
      t('deleteProfile'),
      t('settings.deleteProfileConfirm'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
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
    if (Platform.isTV) return t('settings.playerType.avkit');
    if (Platform.OS === 'ios') return t('settings.playerType.metalNative');
    if (Platform.OS === 'android') return t('settings.playerType.exoNative');
    return t('settings.playerType.native');
  };

  const getPlayerTypeName = (type: PlayerType) => {
    if (type === 'avkit') return t('settings.playerType.avkit');
    if (type === 'vlc') return t('settings.playerType.vlcAndroid');
    if (type === 'ksplayer') return t('settings.playerType.ksplayer');
    return getNativePlayerName();
  };

  const playerTypeOptions = getAvailablePlayerTypesForPlatform(Platform.OS, Platform.isTV).map((type) => {
    if (type === 'ksplayer') return { label: t('settings.playerType.ksplayer'), value: 'ksplayer' as PlayerType };
    if (type === 'avkit') return { label: t('settings.playerType.avkit'), value: 'avkit' as PlayerType };
    if (type === 'vlc') return { label: t('settings.playerType.vlcAndroid'), value: 'vlc' as PlayerType };
    return { label: getNativePlayerName(), value: 'native' as PlayerType };
  });
  const canConfigureKSPlayer = Platform.OS === 'ios';

  const handleToggleAdultContent = (value: boolean) => {
    if (!value) {
       lockAdultContent();
       return;
    }

    if (Platform.OS === 'ios') {
      Alert.prompt(
        t('enterPinToUnlock'),
        t('pin.subtitle.unlockAdult'),
        [
          { text: t('cancel'), style: 'cancel' },
          {
            text: t('unlock'),
            onPress: (enteredPin?: string) => {
               const sanitizedPin = (enteredPin ?? '').replace(/[^0-9]/g, '');
               if (!/^\d{4}$/.test(sanitizedPin)) {
                  Alert.alert(t('error'), t('pin.error.exactDigits'));
                  return;
               }

               const unlocked = unlockAdultContent(sanitizedPin);
               if (!unlocked) {
                  Alert.alert(t('error'), t('pin.error.incorrect'));
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

  const renderBooleanSettingValue = (
    value: boolean,
    onValueChange: (enabled: boolean) => void,
  ) => {
    if (Platform.isTV) {
      return (
        <Text style={{ color: value ? colors.primary : colors.textSecondary }}>
          {value ? t('settings.enabled') : t('settings.disabled')}
        </Text>
      );
    }

    return (
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.divider, true: colors.primary }}
        thumbColor={Platform.OS === 'ios' ? '#FFFFFF' : (value ? colors.primary : '#f4f3f4')}
      />
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.sidebar, { backgroundColor: colors.card, borderColor: colors.divider }]}>
          <Text style={[styles.sidebarTitle, { color: colors.text }]}>{t('settings')}</Text>
        <ScrollView
          style={Platform.isTV ? { flex: 1 } : undefined}
          horizontal={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={!Platform.isTV ? styles.mobileCategoryList : undefined}
        >
          {renderCategoryItem('playlists', <Tv color={activeCategory === 'playlists' ? '#FAFAFA' : '#A1A1AA'} size={20} style={{ marginRight: 12 }} />, categoryLabels.playlists, 0)}
          {renderCategoryItem('general', <Settings color={activeCategory === 'general' ? '#FAFAFA' : '#A1A1AA'} size={20} style={{ marginRight: 12 }} />, categoryLabels.general, 1)}
          {renderCategoryItem('appearance', <Palette color={activeCategory === 'appearance' ? '#FAFAFA' : '#A1A1AA'} size={20} style={{ marginRight: 12 }} />, categoryLabels.appearance, 2)}
          {renderCategoryItem('playback', <PlayCircle color={activeCategory === 'playback' ? '#FAFAFA' : '#A1A1AA'} size={20} style={{ marginRight: 12 }} />, categoryLabels.playback, 3)}
          {renderCategoryItem('parental', <Shield color={activeCategory === 'parental' ? '#FAFAFA' : '#A1A1AA'} size={20} style={{ marginRight: 12 }} />, categoryLabels.parental, 4)}
          {renderCategoryItem('advanced', <Database color={activeCategory === 'advanced' ? '#FAFAFA' : '#A1A1AA'} size={20} style={{ marginRight: 12 }} />, categoryLabels.advanced, 5)}
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
               accessibilityLabel={t('settings.backToCategory', { category: categoryLabels[activeCategory] })}
               isTVSelectable={true}
             >
               <Text style={[styles.subMenuBackText, { color: colors.primary }]}>← {t('settings.backToCategory', { category: categoryLabels[activeCategory] })}</Text>
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
                <SectionHeader title={t('providers')} color={colors.textSecondary} />
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
                          <TouchableOpacity onPress={() => loadProfile(p)} style={styles.iconButton} accessible={true} accessibilityRole="button" accessibilityLabel={t('settings.loadProfileA11y', { name: p.name })} isTVSelectable={true}>
                            <Text style={{ color: colors.primary }}>{t('load')}</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity onPress={() => handleDeleteProfile(p.id)} style={styles.iconButton} accessible={true} accessibilityRole="button" accessibilityLabel={t('settings.deleteProfileA11y', { name: p.name })} isTVSelectable={true}>
                          <Text style={{ color: colors.error }}>{t('delete')}</Text>
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
                  accessibilityLabel={t('settings.addProvider')}
                  isTVSelectable={true}
                >
                  <Tv color="#FFF" size={20} style={{ marginRight: 10 }} />
                  <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '600' }}>{t('settings.addProvider')}</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* General */}
            {activeCategory === 'general' && (
              <View>
                <SectionHeader title={categoryLabels.general} color={colors.textSecondary} />
                {renderSettingRow(
                  t('settings.updateInterval'),
                  t('settings.updateIntervalSubtitle', { hours: updateInterval }),
                  <Text style={{ color: colors.primary }}>{t('settings.hoursValue', { value: updateInterval })}</Text>,
                  () => openSubMenu(t('settings.updateInterval'), [
                    { label: t('settings.hoursValue', { value: 12 }), value: 12 },
                    { label: t('settings.hoursValue', { value: 24 }), value: 24 },
                    { label: t('settings.hoursValue', { value: 48 }), value: 48 }
                  ], handleSetUpdateInterval, updateInterval)
                )}
                {renderSettingRow(
                  t('settings.updatePlaylist'),
                  t('settings.updatePlaylistSubtitle'),
                  <Text style={{ color: colors.primary }}>{t('settings.updateNow')}</Text>,
                  handleManualUpdate
                )}
              </View>
            )}

            {/* Appearance */}
            {activeCategory === 'appearance' && (
              <View>
                <SectionHeader title={categoryLabels.appearance} color={colors.textSecondary} />
                {renderSettingRow(
                  t('settings.themeMode'),
                  t('settings.themeCurrent', { mode: t(`settings.theme.${themeMode}`) }),
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                     {themeMode === 'light' ? <Sun color={colors.text} size={16} /> : themeMode === 'dark' ? <Moon color={colors.text} size={16} /> : <Monitor color={colors.text} size={16} />}
                     <Text style={{ color: colors.primary }}>{t('settings.change')}</Text>
                  </View>,
                  () => openSubMenu(t('settings.themeMode'), [
                    { label: t('settings.theme.dark'), value: 'dark' },
                    { label: t('settings.theme.oled'), value: 'oled' },
                    { label: t('settings.theme.light'), value: 'light' }
                  ], setThemeMode, themeMode)
                )}
              </View>
            )}

            {/* Playback */}
            {activeCategory === 'playback' && (
              <View>
                <SectionHeader title={categoryLabels.playback} color={colors.textSecondary} />
                {renderSettingRow(
                  t('playerSettings'),
                  getPlayerTypeName(playerType),
                  <Text style={{ color: colors.primary }}>{t('settings.change')}</Text>,
                  () => openSubMenu(t('playerSettings'), playerTypeOptions, setPlayerType, playerType)
                )}

                {renderSettingRow(
                  t('settings.overlayAutoHideSeconds'),
                  t('settings.overlayAutoHideSecondsSubtitle', { seconds: overlayAutoHideSeconds }),
                  <Text style={{ color: colors.primary }}>{t('settings.secondsValue', { value: overlayAutoHideSeconds })}</Text>,
                  () => openSubMenu(
                    t('settings.overlayAutoHideSeconds'),
                    OVERLAY_AUTO_HIDE_SECONDS_OPTIONS.map((seconds) => ({
                      label: t('settings.secondsValue', { value: seconds }),
                      value: seconds,
                    })),
                    setOverlayAutoHideSeconds,
                    overlayAutoHideSeconds,
                  )
                )}

                {renderSettingRow(
                  t('settings.streamingBufferSize'),
                  t('settings.bufferSizeValue', { value: bufferSize }),
                  <Text style={{ color: colors.primary }}>{t('settings.change')}</Text>,
                  () => openSubMenu(t('settings.bufferSize'), [
                    { label: '8 MB', value: 8 },
                    { label: '16 MB', value: 16 },
                    { label: '32 MB', value: 32 },
                    { label: '64 MB', value: 64 },
                    { label: '128 MB', value: 128 }
                  ], setBufferSize, bufferSize)
                )}

                {playerType === 'vlc' && (
                  renderSettingRow(
                    t('hardwareAcceleration'),
                    t('settings.useHardwareDecodingWhenAvailable'),
                    renderBooleanSettingValue(vlcHardwareAcceleration, setVlcHardwareAcceleration),
                    getTVBooleanSettingPressHandler(Platform.isTV, vlcHardwareAcceleration, setVlcHardwareAcceleration)
                  )
                )}

                {canConfigureKSPlayer && (
                  <>
                    {renderSettingRow(
                      t('hardwareAcceleration'),
                      t('settings.useHardwareDecoding'),
                      renderBooleanSettingValue(ksplayerHardwareDecode, setKsplayerHardwareDecode),
                      getTVBooleanSettingPressHandler(Platform.isTV, ksplayerHardwareDecode, setKsplayerHardwareDecode)
                    )}
                    {renderSettingRow(
                      t('asyncDecompression'),
                      t('settings.processVideoFramesAsync'),
                      renderBooleanSettingValue(ksplayerAsynchronousDecompression, setKsplayerAsynchronousDecompression),
                      getTVBooleanSettingPressHandler(Platform.isTV, ksplayerAsynchronousDecompression, setKsplayerAsynchronousDecompression)
                    )}
                    {renderSettingRow(
                      t('adaptiveFrameRate'),
                      t('settings.autoAdjustDisplayFrameRate'),
                      renderBooleanSettingValue(ksplayerDisplayFrameRate, setKsplayerDisplayFrameRate),
                      getTVBooleanSettingPressHandler(Platform.isTV, ksplayerDisplayFrameRate, setKsplayerDisplayFrameRate)
                    )}
                  </>
                )}
              </View>
            )}

            {/* Parental Control */}
            {activeCategory === 'parental' && (
              <View>
                <SectionHeader title={categoryLabels.parental} color={colors.textSecondary} />
                {renderSettingRow(
                  t('settings.parentalPin'),
                  pin ? t('settings.pinSet') : t('settings.pinNotSet'),
                  <Text style={{ color: colors.primary }}>{t('settings.manage')}</Text>,
                  () => navigation.navigate('PinSetup')
                )}

                {pin && (
                  renderSettingRow(
                    t('settings.showAdultContent'),
                    isAdultUnlocked ? t('settings.unlocked') : t('settings.locked'),
                    renderBooleanSettingValue(isAdultUnlocked, handleToggleAdultContent),
                    getTVBooleanSettingPressHandler(Platform.isTV, isAdultUnlocked, handleToggleAdultContent)
                  )
                )}
              </View>
            )}

            {/* Advanced */}
            {activeCategory === 'advanced' && (
              <View>
                <SectionHeader title={categoryLabels.advanced} color={colors.textSecondary} />
                {renderSettingRow(
                  t('settings.tmdbTitle'),
                  tmdbApiKey ? t('settings.tmdbKeySetMasked', { prefix: tmdbApiKey.substring(0, 4) }) : t('settings.tmdbNoKeySet'),
                  <Text style={{ color: colors.primary }}>{tmdbApiKey ? t('edit') : t('settings.tmdbSetKey')}</Text>,
                  handleSetTmdbKey
                )}
                {renderSettingRow(
                  t('settings.clearEpgAndAppCache'),
                  t('settings.clearEpgAndAppCacheSubtitle'),
                  <Text style={{ color: colors.error }}>{t('clear')}</Text>,
                  handleClearCache
                )}
                {renderSettingRow(
                  t('settings.logoutAndClearData'),
                  t('settings.logoutAndClearDataSubtitle'),
                  <Text style={{ color: colors.error }}>{t('settings.logoutCta')}</Text>,
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
  mobileCategoryList: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
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
    marginBottom: Platform.isTV ? 0 : 8,
    width: Platform.isTV ? undefined : '100%',
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
