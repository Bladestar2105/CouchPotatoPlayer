import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Alert, Platform } from 'react-native';
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
// Removed synchronous Paths/Directory/File imports — using async FileSystem API instead

const SettingsScreen = () => {
  const { currentProfile, profiles, pin, isAdultUnlocked, unlockAdultContent, lockAdultContent, removeProfile, loadProfile, unloadProfile } = useIPTV();
  const {
    colors, themeMode, setThemeMode, bufferSize, setBufferSize,
    playerType, setPlayerType, vlcHardwareAcceleration, setVlcHardwareAcceleration,
    ksplayerHardwareDecode, setKsplayerHardwareDecode,
    ksplayerAsynchronousDecompression, setKsplayerAsynchronousDecompression,
    ksplayerDisplayFrameRate, setKsplayerDisplayFrameRate
  } = useSettings();
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

                // ⚡ Perf: Use asynchronous file system operations to avoid
                // blocking the JS thread and causing UI stuttering.
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
       // Fallback for Android/Web where Alert.prompt is unsupported
       navigation.navigate('PinSetup');
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Providers</Text>
        {profiles.map(p => {
          const isCurrent = p.id === currentProfile?.id;
          return (
            <View key={p.id} style={[styles.tile, { backgroundColor: colors.card, borderColor: isCurrent ? colors.primary : colors.divider, borderWidth: isCurrent ? 2 : 1 }]}>
              <View style={styles.tileLeft}>
                <Text style={[styles.tileTitle, { color: isCurrent ? colors.primary : colors.text, fontWeight: isCurrent ? 'bold' : 'normal' }]}>{p.name}</Text>
                <Text style={[styles.tileSubtitle, { color: colors.textSecondary }]}>{(p.type === 'm3u' || p.type === 'xtream') ? p.url : p.type === 'stalker' ? p.portalUrl : ''}</Text>
              </View>
              <View style={styles.tileRight}>
                {!isCurrent && (
                  <TouchableOpacity onPress={() => loadProfile(p)} style={styles.iconButton} accessibilityRole="button" accessibilityLabel={`Load profile ${p.name}`}>
                    <Text style={{ color: colors.primary }}>Load</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => handleDeleteProfile(p.id)} style={styles.iconButton} accessibilityRole="button" accessibilityLabel={`Delete profile ${p.name}`}>
                  <Text style={{ color: colors.error }}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>General</Text>

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
        {/* On tvOS, VLC is the recommended default (plays all IPTV formats).
            AVKit only supports HLS & MP4. KSPlayer uses FFmpeg for full format support. */}
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
              <Text style={[styles.tileTitle, { color: colors.text }]}>Video Player Engine</Text>
              <Text style={[styles.tileSubtitle, { color: colors.textSecondary }]}>{getPlayerTypeName(playerType)}</Text>
              <Text style={[styles.tileSubtitle, { color: colors.textSecondary, fontSize: 10, marginTop: 2 }]}>
                {playerType === 'vlc' ? 'Recommended — plays all IPTV streams' :
                 playerType === 'ksplayer' ? 'FFmpeg-based — plays all formats' :
                 'HLS & MP4 only — TS streams auto-fallback to VLC'}
              </Text>
            </View>
            <Text style={{ color: colors.primary }}>Toggle</Text>
          </TouchableOpacity>
        ) : Platform.OS === 'ios' ? (
          <TouchableOpacity style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.divider }]} onPress={handleActionSheetPlayerType}>
            <View style={styles.tileLeft}>
              <Text style={[styles.tileTitle, { color: colors.text }]}>Video Player Engine</Text>
              <Text style={[styles.tileSubtitle, { color: colors.textSecondary }]}>{getPlayerTypeName(playerType)}</Text>
            </View>
            <Text style={{ color: colors.primary }}>Edit</Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.divider }]}>
            <View style={styles.tileLeft}>
              <Text style={[styles.tileTitle, { color: colors.text }]}>Video Player Engine</Text>
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

        {/* Hardware Acceleration — shown when VLC is selected (including tvOS) */}
        {(playerType === 'vlc') && (
          <TouchableOpacity
            style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.divider }]}
            onPress={() => setVlcHardwareAcceleration(!vlcHardwareAcceleration)}
            disabled={!Platform.isTV}
          >
            <View style={styles.tileLeft}>
              <Text style={[styles.tileTitle, { color: colors.text }]}>Hardware Acceleration</Text>
              <Text style={[styles.tileSubtitle, { color: colors.textSecondary }]}>
                Improve performance on supported devices
              </Text>
            </View>
            <View pointerEvents={Platform.isTV ? 'none' : 'auto'}>
              <Switch
                value={vlcHardwareAcceleration}
                onValueChange={(val) => setVlcHardwareAcceleration(val)}
                trackColor={{ false: colors.divider, true: colors.primary }}
                thumbColor={Platform.OS === 'ios' ? '#FFFFFF' : (vlcHardwareAcceleration ? colors.primary : '#f4f3f4')}
              />
            </View>
          </TouchableOpacity>
        )}

        {/* KSPlayer specific settings */}
        {(playerType === 'ksplayer') && (
          <>
            <TouchableOpacity
              style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.divider }]}
              onPress={() => setKsplayerHardwareDecode(!ksplayerHardwareDecode)}
              disabled={!Platform.isTV}
            >
              <View style={styles.tileLeft}>
                <Text style={[styles.tileTitle, { color: colors.text }]}>Hardware Decoding</Text>
                <Text style={[styles.tileSubtitle, { color: colors.textSecondary }]}>
                  VideoToolbox decoding (H.264/H.265)
                </Text>
              </View>
              <View pointerEvents={Platform.isTV ? 'none' : 'auto'}>
                <Switch
                  value={ksplayerHardwareDecode}
                  onValueChange={(val) => setKsplayerHardwareDecode(val)}
                  trackColor={{ false: colors.divider, true: colors.primary }}
                  thumbColor={Platform.OS === 'ios' ? '#FFFFFF' : (ksplayerHardwareDecode ? colors.primary : '#f4f3f4')}
                />
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.divider }]}
              onPress={() => setKsplayerAsynchronousDecompression(!ksplayerAsynchronousDecompression)}
              disabled={!Platform.isTV}
            >
              <View style={styles.tileLeft}>
                <Text style={[styles.tileTitle, { color: colors.text }]}>Asynchronous Decompression</Text>
                <Text style={[styles.tileSubtitle, { color: colors.textSecondary }]}>
                  Improve performance for high-bitrate streams
                </Text>
              </View>
              <View pointerEvents={Platform.isTV ? 'none' : 'auto'}>
                <Switch
                  value={ksplayerAsynchronousDecompression}
                  onValueChange={(val) => setKsplayerAsynchronousDecompression(val)}
                  trackColor={{ false: colors.divider, true: colors.primary }}
                  thumbColor={Platform.OS === 'ios' ? '#FFFFFF' : (ksplayerAsynchronousDecompression ? colors.primary : '#f4f3f4')}
                />
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.divider }]}
              onPress={() => setKsplayerDisplayFrameRate(!ksplayerDisplayFrameRate)}
              disabled={!Platform.isTV}
            >
              <View style={styles.tileLeft}>
                <Text style={[styles.tileTitle, { color: colors.text }]}>Adaptive Frame Rate</Text>
                <Text style={[styles.tileSubtitle, { color: colors.textSecondary }]}>
                  Automatically adjust display frame rate
                </Text>
              </View>
              <View pointerEvents={Platform.isTV ? 'none' : 'auto'}>
                <Switch
                  value={ksplayerDisplayFrameRate}
                  onValueChange={(val) => setKsplayerDisplayFrameRate(val)}
                  trackColor={{ false: colors.divider, true: colors.primary }}
                  thumbColor={Platform.OS === 'ios' ? '#FFFFFF' : (ksplayerDisplayFrameRate ? colors.primary : '#f4f3f4')}
                />
              </View>
            </TouchableOpacity>
          </>
        )}

        {/* Theme Mode */}
        {Platform.OS === 'ios' && !Platform.isTV ? (
          <TouchableOpacity style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.divider }]} onPress={handleActionSheetTheme}>
            <View style={styles.tileLeft}>
              <Text style={[styles.tileTitle, { color: colors.text }]}>Theme Mode</Text>
              <Text style={[styles.tileSubtitle, { color: colors.textSecondary }]}>{themeMode}</Text>
            </View>
            <Text style={{ color: colors.primary }}>Edit</Text>
          </TouchableOpacity>
        ) : Platform.isTV ? (
          <TouchableOpacity
            style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.divider }]}
            onPress={() => {
              const themes: ThemeMode[] = ['dark', 'oled', 'light'];
              const nextIndex = (themes.indexOf(themeMode) + 1) % themes.length;
              setThemeMode(themes[nextIndex]);
            }}
          >
            <View style={styles.tileLeft}>
              <Text style={[styles.tileTitle, { color: colors.text }]}>Theme Mode</Text>
              <Text style={[styles.tileSubtitle, { color: colors.textSecondary }]}>{themeMode}</Text>
            </View>
            <Text style={{ color: colors.primary }}>Toggle</Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.divider }]}>
            <View style={styles.tileLeft}>
              <Text style={[styles.tileTitle, { color: colors.text }]}>Theme Mode</Text>
              <Text style={[styles.tileSubtitle, { color: colors.textSecondary }]}>{themeMode}</Text>
            </View>
            <View style={[styles.pickerContainer, { backgroundColor: colors.background }]}>
              <Picker selectedValue={themeMode} onValueChange={(val: ThemeMode) => setThemeMode(val)} style={[styles.picker, { color: colors.text }]} dropdownIconColor={colors.text}>
                <Picker.Item label="Dark" value="dark" />
                <Picker.Item label="OLED Black" value="oled" />
                <Picker.Item label="Light" value="light" />
              </Picker>
            </View>
          </View>
        )}

        {/* Buffer Size */}
        {Platform.OS === 'ios' && !Platform.isTV ? (
          <TouchableOpacity style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.divider }]} onPress={handleActionSheetBuffer}>
            <View style={styles.tileLeft}>
              <Text style={[styles.tileTitle, { color: colors.text }]}>Streaming Buffer Size</Text>
              <Text style={[styles.tileSubtitle, { color: colors.textSecondary }]}>{bufferSize} MB</Text>
            </View>
            <Text style={{ color: colors.primary }}>Edit</Text>
          </TouchableOpacity>
        ) : Platform.isTV ? (
          <TouchableOpacity
            style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.divider }]}
            onPress={() => {
              const sizes = [8, 16, 32, 64, 128];
              const nextIndex = (sizes.indexOf(bufferSize) + 1) % sizes.length;
              setBufferSize(sizes[nextIndex]);
            }}
          >
            <View style={styles.tileLeft}>
              <Text style={[styles.tileTitle, { color: colors.text }]}>Streaming Buffer Size</Text>
              <Text style={[styles.tileSubtitle, { color: colors.textSecondary }]}>{bufferSize} MB</Text>
            </View>
            <Text style={{ color: colors.primary }}>Toggle</Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.divider }]}>
            <View style={styles.tileLeft}>
              <Text style={[styles.tileTitle, { color: colors.text }]}>Streaming Buffer Size</Text>
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

        {/* Update Interval */}
        {Platform.OS === 'ios' && !Platform.isTV ? (
          <TouchableOpacity style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.divider }]} onPress={handleActionSheetUpdateInterval}>
            <View style={styles.tileLeft}>
              <Text style={[styles.tileTitle, { color: colors.text }]}>Update Interval</Text>
              <Text style={[styles.tileSubtitle, { color: colors.textSecondary }]}>{updateInterval} Hours</Text>
            </View>
            <Text style={{ color: colors.primary }}>Edit</Text>
          </TouchableOpacity>
        ) : Platform.isTV ? (
          <TouchableOpacity
            style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.divider }]}
            onPress={() => {
              const intervals = [12, 24, 48];
              const nextIndex = (intervals.indexOf(updateInterval) + 1) % intervals.length;
              handleSetUpdateInterval(intervals[nextIndex]);
            }}
          >
            <View style={styles.tileLeft}>
              <Text style={[styles.tileTitle, { color: colors.text }]}>Update Interval</Text>
              <Text style={[styles.tileSubtitle, { color: colors.textSecondary }]}>{updateInterval} Hours</Text>
            </View>
            <Text style={{ color: colors.primary }}>Toggle</Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.divider }]}>
            <View style={styles.tileLeft}>
              <Text style={[styles.tileTitle, { color: colors.text }]}>Update Interval</Text>
              <Text style={[styles.tileSubtitle, { color: colors.textSecondary }]}>{updateInterval} Hours</Text>
            </View>
            <View style={[styles.pickerContainer, { backgroundColor: colors.background }]}>
              <Picker selectedValue={updateInterval} onValueChange={(val: number) => handleSetUpdateInterval(val)} style={[styles.picker, { color: colors.text }]} dropdownIconColor={colors.text}>
                <Picker.Item label="12 Hours" value={12} />
                <Picker.Item label="24 Hours" value={24} />
                <Picker.Item label="48 Hours" value={48} />
              </Picker>
            </View>
          </View>
        )}

        {/* Clear Cache */}
        <TouchableOpacity
          style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.divider }]}
          onPress={handleClearCache}
        >
          <View style={styles.tileLeft}>
            <Text style={[styles.tileTitle, { color: colors.text }]}>Clear EPG & App Cache</Text>
            <Text style={[styles.tileSubtitle, { color: colors.textSecondary }]}>
              Forces a fresh data fetch on next load
            </Text>
          </View>
        </TouchableOpacity>

        {/* Show Adult Content */}
        {pin && (
          <TouchableOpacity
            style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.divider }]}
            onPress={() => handleToggleAdultContent(!isAdultUnlocked)}
            disabled={!Platform.isTV}
          >
            <View style={styles.tileLeft}>
              <Text style={[styles.tileTitle, { color: colors.text }]}>Show Adult Content</Text>
            </View>
            <View pointerEvents={Platform.isTV ? 'none' : 'auto'}>
              <Switch
                value={isAdultUnlocked}
                onValueChange={handleToggleAdultContent}
                trackColor={{ false: colors.divider, true: colors.primary }}
                thumbColor={Platform.OS === 'ios' ? '#FFFFFF' : (isAdultUnlocked ? colors.primary : '#f4f3f4')}
              />
            </View>
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
    </ScrollView>
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
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    paddingLeft: 4,
  },
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
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
  },
  tileSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  iconButton: {
    marginLeft: 16,
    padding: 8,
  },
  pickerContainer: {
    borderRadius: 8,
    width: 140,
    height: Platform.OS === 'ios' ? 50 : 50,
    justifyContent: 'center',
  },
  picker: {
    width: '100%',
    height: '100%',
  },
});

export default SettingsScreen;
