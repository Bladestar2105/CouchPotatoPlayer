import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Switch, Alert, Platform } from 'react-native';
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
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { useTranslation } from 'react-i18next';
import { Moon, Sun, Monitor, Palette } from 'lucide-react-native';
import { themeOptions } from '../utils/theme';

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

  const handleThemeChange = () => {
    const nextMode = themeMode === 'dark' ? 'light' : themeMode === 'light' ? 'oled' : 'dark';
    setThemeMode(nextMode);
  };
  const navigation = useNavigation<any>();

  const [updateInterval, setUpdateInterval] = React.useState<number>(24);

  React.useEffect(() => {
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

  const handleActionSheetTheme = () => {
    if (Platform.OS === 'ios' && !Platform.isTV) {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Dark', 'OLED Black', 'Light'],
          cancelButtonIndex: 0,
        },
        (buttonIndex: number) => {
          if (buttonIndex === 1) setThemeMode('dark');
          if (buttonIndex === 2) setThemeMode('oled');
          if (buttonIndex === 3) setThemeMode('light');
        }
      );
    }
  };

  const handleActionSheetBuffer = () => {
    if (Platform.OS === 'ios' && !Platform.isTV) {
      const options = ['Cancel', '8 MB', '16 MB', '32 MB', '64 MB', '128 MB'];
      const values = [0, 8, 16, 32, 64, 128];
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: 0 },
        (buttonIndex: number) => {
          if (buttonIndex > 0) setBufferSize(values[buttonIndex]);
        }
      );
    }
  };

  const handleActionSheetUpdateInterval = () => {
    if (Platform.OS === 'ios' && !Platform.isTV) {
      const options = ['Cancel', '12 Hours', '24 Hours', '48 Hours'];
      const values = [0, 12, 24, 48];
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: 0 },
        (buttonIndex: number) => {
          if (buttonIndex > 0) handleSetUpdateInterval(values[buttonIndex]);
        }
      );
    }
  };

  const handleActionSheetPlayerType = () => {
    if (Platform.OS === 'ios' && !Platform.isTV) {
      const nativeLabel = 'Metal (Native)';
      const avkitLabel = 'AVKit (HLS & MP4 only)';
      const options = ['Cancel', 'VLC (All Formats)', avkitLabel, nativeLabel];
      const values: (PlayerType | null)[] = [null, 'vlc', 'avkit', 'native'];
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: 0 },
        (buttonIndex: number) => {
          if (buttonIndex > 0 && values[buttonIndex]) setPlayerType(values[buttonIndex] as PlayerType);
        }
      );
    }
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

  // Render sections as FlatList data for better performance on TV
  const renderSectionHeader = (title: string) => (
    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{title}</Text>
  );

  const renderProviderItem = ({ item }: { item: typeof profiles[0] }) => {
    const isCurrent = item.id === currentProfile?.id;
    return (
      <TouchableOpacity
        style={[styles.tile, { backgroundColor: colors.card, borderColor: isCurrent ? colors.primary : colors.divider, borderWidth: isCurrent ? 2 : 1 }]}
        onPress={() => loadProfile(item)}
        accessibilityRole="button"
        accessibilityLabel={`Profile ${item.name}`}
      >
        <View style={styles.tileLeft}>
          <Text style={[styles.tileTitle, { color: isCurrent ? colors.primary : colors.text, fontWeight: isCurrent ? 'bold' : 'normal' }]}>{item.name}</Text>
          <Text style={[styles.tileSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>{(item.type === 'm3u' || item.type === 'xtream') ? item.url : ''}</Text>
          {item.providerInfo && (
            <View style={{ marginTop: 4 }}>
              <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
                {t('channelsCount')}: {item.providerInfo.channelsCount ?? '-'}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.tileRight}>
          {!isCurrent && (
            <TouchableOpacity onPress={() => loadProfile(item)} style={styles.iconButton}>
              <Text style={{ color: colors.primary, fontSize: 13 }}>Load</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => handleDeleteProfile(item.id)} style={styles.iconButton}>
            <Text style={{ color: colors.error, fontSize: 13 }}>Delete</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <FlatList
      style={[styles.container, { backgroundColor: colors.background }]}
      data={profiles}
      keyExtractor={(item) => item.id}
      renderItem={renderProviderItem}
      ListHeaderComponent={
        <View style={styles.section}>
          {renderSectionHeader('Providers')}
        </View>
      }
      ListFooterComponent={
        <View style={styles.section}>
          {renderSectionHeader('General')}

          {/* PIN Setup */}
          <TouchableOpacity
            style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.divider }]}
            onPress={() => navigation.navigate('PinSetup')}
          >
            <View style={styles.tileLeft}>
              <Text style={[styles.tileTitle, { color: colors.text }]}>Parental Control PIN</Text>
              <Text style={[styles.tileSubtitle, { color: colors.textSecondary }]}>
                {pin ? 'PIN is set' : 'No PIN set'}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Video Player Engine */}
          {Platform.isTV ? (
            <TouchableOpacity
              style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.divider }]}
              onPress={() => {
                const options: PlayerType[] = ['vlc', 'ksplayer', 'avkit'];
                const nextIndex = (options.indexOf(playerType) + 1) % options.length;
                setPlayerType(options[nextIndex]);
              }}
            >
              <View style={styles.tileLeft}>
                <Text style={[styles.tileTitle, { color: colors.text }]}>{t('playerSettings', 'Video Player Engine')}</Text>
                <Text style={[styles.tileSubtitle, { color: colors.textSecondary }]}>{getPlayerTypeName(playerType)}</Text>
              </View>
              <Text style={{ color: colors.primary, fontSize: 13 }}>Toggle</Text>
            </TouchableOpacity>
          ) : Platform.OS === 'ios' ? (
            <TouchableOpacity style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.divider }]} onPress={handleActionSheetPlayerType}>
              <View style={styles.tileLeft}>
                <Text style={[styles.tileTitle, { color: colors.text }]}>{t('playerSettings', 'Video Player Engine')}</Text>
                <Text style={[styles.tileSubtitle, { color: colors.textSecondary }]}>{getPlayerTypeName(playerType)}</Text>
              </View>
              <Text style={{ color: colors.primary, fontSize: 13 }}>Edit</Text>
            </TouchableOpacity>
          ) : (
            <View style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.divider }]}>
              <View style={styles.tileLeft}>
                <Text style={[styles.tileTitle, { color: colors.text }]}>{t('playerSettings', 'Video Player Engine')}</Text>
                <Text style={[styles.tileSubtitle, { color: colors.textSecondary }]}>{getPlayerTypeName(playerType)}</Text>
              </View>
              <View style={[styles.pickerContainer, { backgroundColor: colors.background }]}>
                <Picker selectedValue={playerType} onValueChange={(val: PlayerType) => setPlayerType(val)} style={[styles.picker, { color: colors.text }]} dropdownIconColor={colors.text}>
                  <Picker.Item label={getNativePlayerName()} value="native" />
                  <Picker.Item label="VLC" value="vlc" />
                </Picker>
              </View>
            </View>
          )}

          {/* Hardware Acceleration */}
          {(playerType === 'vlc') && (
            <TouchableOpacity
              style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.divider }]}
              onPress={() => setVlcHardwareAcceleration(!vlcHardwareAcceleration)}
            >
              <View style={styles.tileLeft}>
                <Text style={[styles.tileTitle, { color: colors.text }]}>{t('hardwareAcceleration', 'Hardware Acceleration')}</Text>
                <Text style={[styles.tileSubtitle, { color: colors.textSecondary }]}>Improve performance</Text>
              </View>
              <Switch
                value={vlcHardwareAcceleration}
                onValueChange={setVlcHardwareAcceleration}
                trackColor={{ false: colors.divider, true: colors.primary }}
                thumbColor={Platform.OS === 'ios' ? '#FFFFFF' : (vlcHardwareAcceleration ? colors.primary : '#f4f3f4')}
              />
            </TouchableOpacity>
          )}

          {/* KSPlayer Settings */}
          {(playerType === 'ksplayer') && (
            <>
              <TouchableOpacity
                style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.divider }]}
                onPress={() => setKsplayerHardwareDecode(!ksplayerHardwareDecode)}
              >
                <View style={styles.tileLeft}>
                  <Text style={[styles.tileTitle, { color: colors.text }]}>Hardware Decoding</Text>
                  <Text style={[styles.tileSubtitle, { color: colors.textSecondary }]}>VideoToolbox (H.264/H.265)</Text>
                </View>
                <Switch
                  value={ksplayerHardwareDecode}
                  onValueChange={setKsplayerHardwareDecode}
                  trackColor={{ false: colors.divider, true: colors.primary }}
                  thumbColor={Platform.OS === 'ios' ? '#FFFFFF' : (ksplayerHardwareDecode ? colors.primary : '#f4f3f4')}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.divider }]}
                onPress={() => setKsplayerAsynchronousDecompression(!ksplayerAsynchronousDecompression)}
              >
                <View style={styles.tileLeft}>
                  <Text style={[styles.tileTitle, { color: colors.text }]}>{t('asyncDecompression', 'Async Decompression')}</Text>
                  <Text style={[styles.tileSubtitle, { color: colors.textSecondary }]}>High-bitrate performance</Text>
                </View>
                <Switch
                  value={ksplayerAsynchronousDecompression}
                  onValueChange={setKsplayerAsynchronousDecompression}
                  trackColor={{ false: colors.divider, true: colors.primary }}
                  thumbColor={Platform.OS === 'ios' ? '#FFFFFF' : (ksplayerAsynchronousDecompression ? colors.primary : '#f4f3f4')}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.divider }]}
                onPress={() => setKsplayerDisplayFrameRate(!ksplayerDisplayFrameRate)}
              >
                <View style={styles.tileLeft}>
                  <Text style={[styles.tileTitle, { color: colors.text }]}>{t('adaptiveFrameRate', 'Adaptive Frame Rate')}</Text>
                  <Text style={[styles.tileSubtitle, { color: colors.textSecondary }]}>Auto-adjust display</Text>
                </View>
                <Switch
                  value={ksplayerDisplayFrameRate}
                  onValueChange={setKsplayerDisplayFrameRate}
                  trackColor={{ false: colors.divider, true: colors.primary }}
                  thumbColor={Platform.OS === 'ios' ? '#FFFFFF' : (ksplayerDisplayFrameRate ? colors.primary : '#f4f3f4')}
                />
              </TouchableOpacity>
            </>
          )}

          {/* Theme */}
          <TouchableOpacity style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.divider }]} onPress={handleThemeChange}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {themeMode === 'light' ? <Sun color={colors.text} size={18} /> : themeMode === 'dark' ? <Moon color={colors.text} size={18} /> : <Monitor color={colors.text} size={18} />}
              <Text style={[styles.tileTitle, { color: colors.text }]}>{t('theme', 'Theme')}: {themeMode.toUpperCase()}</Text>
            </View>
          </TouchableOpacity>

          {/* Buffer Size */}
          {Platform.isTV ? (
            <TouchableOpacity
              style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.divider }]}
              onPress={() => {
                const sizes = [8, 16, 32, 64, 128];
                const nextIndex = (sizes.indexOf(bufferSize) + 1) % sizes.length;
                setBufferSize(sizes[nextIndex]);
              }}
            >
              <View style={styles.tileLeft}>
                <Text style={[styles.tileTitle, { color: colors.text }]}>Buffer Size</Text>
                <Text style={[styles.tileSubtitle, { color: colors.textSecondary }]}>{bufferSize} MB</Text>
              </View>
              <Text style={{ color: colors.primary, fontSize: 13 }}>Toggle</Text>
            </TouchableOpacity>
          ) : Platform.OS === 'ios' ? (
            <TouchableOpacity style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.divider }]} onPress={handleActionSheetBuffer}>
              <View style={styles.tileLeft}>
                <Text style={[styles.tileTitle, { color: colors.text }]}>Buffer Size</Text>
                <Text style={[styles.tileSubtitle, { color: colors.textSecondary }]}>{bufferSize} MB</Text>
              </View>
              <Text style={{ color: colors.primary, fontSize: 13 }}>Edit</Text>
            </TouchableOpacity>
          ) : (
            <View style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.divider }]}>
              <View style={styles.tileLeft}>
                <Text style={[styles.tileTitle, { color: colors.text }]}>Buffer Size</Text>
                <Text style={[styles.tileSubtitle, { color: colors.textSecondary }]}>{bufferSize} MB</Text>
              </View>
              <View style={[styles.pickerContainer, { backgroundColor: colors.background }]}>
                <Picker selectedValue={bufferSize} onValueChange={(val: number) => setBufferSize(val)} style={[styles.picker, { color: colors.text }]} dropdownIconColor={colors.text}>
                  <Picker.Item label="8 MB" value={8} />
                  <Picker.Item label="16 MB" value={16} />
                  <Picker.Item label="32 MB" value={32} />
                  <Picker.Item label="64 MB" value={64} />
                  <Picker.Item label="128 MB" value={128} />
                </Picker>
              </View>
            </View>
          )}

          {/* Update Playlist */}
          <TouchableOpacity
            style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.divider }]}
            onPress={handleManualUpdate}
          >
            <View style={styles.tileLeft}>
              <Text style={[styles.tileTitle, { color: colors.text }]}>{t('settings.updatePlaylist')}</Text>
              <Text style={[styles.tileSubtitle, { color: colors.textSecondary }]}>Force refresh</Text>
            </View>
          </TouchableOpacity>

          {/* Clear Cache */}
          <TouchableOpacity
            style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.divider }]}
            onPress={handleClearCache}
          >
            <View style={styles.tileLeft}>
              <Text style={[styles.tileTitle, { color: colors.text }]}>Clear Cache</Text>
              <Text style={[styles.tileSubtitle, { color: colors.textSecondary }]}>Force fresh data fetch</Text>
            </View>
          </TouchableOpacity>

          {/* Adult Content Toggle */}
          {pin && (
            <TouchableOpacity
              style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.divider }]}
              onPress={() => handleToggleAdultContent(!isAdultUnlocked)}
            >
              <View style={styles.tileLeft}>
                <Text style={[styles.tileTitle, { color: colors.text }]}>Show Adult Content</Text>
              </View>
              <Switch
                value={isAdultUnlocked}
                onValueChange={handleToggleAdultContent}
                trackColor={{ false: colors.divider, true: colors.primary }}
                thumbColor={Platform.OS === 'ios' ? '#FFFFFF' : (isAdultUnlocked ? colors.primary : '#f4f3f4')}
              />
            </TouchableOpacity>
          )}

          {/* Logout */}
          <TouchableOpacity
            style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.divider, marginTop: 16 }]}
            onPress={handleLogout}
          >
            <Text style={[styles.tileTitle, { color: colors.error }]}>Logout / Clear Data</Text>
          </TouchableOpacity>
        </View>
      }
      contentContainerStyle={{ paddingBottom: 40 }}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 10,
    paddingLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  tileLeft: {
    flex: 1,
  },
  tileRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tileTitle: {
    fontSize: 15,
    fontWeight: '500',
  },
  tileSubtitle: {
    fontSize: 13,
    marginTop: 4,
    opacity: 0.8,
  },
  iconButton: {
    marginLeft: 12,
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  pickerContainer: {
    borderRadius: 10,
    width: 140,
    height: Platform.OS === 'ios' ? 44 : 44,
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  picker: {
    width: '100%',
    height: '100%',
  },
});

export default SettingsScreen;