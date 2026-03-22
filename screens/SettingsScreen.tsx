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
import { useSettings, ThemeMode } from '../context/SettingsContext';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { Paths, Directory, File } from 'expo-file-system';

const SettingsScreen = () => {
  const { currentProfile, profiles, pin, isAdultUnlocked, unlockAdultContent, lockAdultContent, removeProfile, loadProfile, unloadProfile } = useIPTV();
  const { colors, themeMode, setThemeMode, bufferSize, setBufferSize } = useSettings();
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

                // Also clear FileSystem cache
                if (Platform.OS !== 'web') {
                   const files = Paths.document.list();
                   const epgFiles = files.filter(f => f instanceof File && f.name.startsWith('IPTV_EPG_') && f.name.endsWith('.json'));
                   for (const file of epgFiles) {
                      file.delete();
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

        {/* Theme Mode */}
        {Platform.OS === 'ios' && !Platform.isTV ? (
          <TouchableOpacity style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.divider }]} onPress={handleActionSheetTheme}>
            <View style={styles.tileLeft}>
              <Text style={[styles.tileTitle, { color: colors.text }]}>Theme Mode</Text>
              <Text style={[styles.tileSubtitle, { color: colors.textSecondary }]}>{themeMode}</Text>
            </View>
            <Text style={{ color: colors.primary }}>Edit</Text>
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
          <View style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.divider }]}>
            <View style={styles.tileLeft}>
              <Text style={[styles.tileTitle, { color: colors.text }]}>Show Adult Content</Text>
            </View>
            <Switch
              value={isAdultUnlocked}
              onValueChange={(value) => {
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
              }}
              trackColor={{ false: colors.divider, true: colors.primary }}
              thumbColor={Platform.OS === 'ios' ? '#FFFFFF' : (isAdultUnlocked ? colors.primary : '#f4f3f4')}
            />
          </View>
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
