import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Alert, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useIPTV } from '../context/IPTVContext';
import { useSettings, ThemeMode } from '../context/SettingsContext';
import { useNavigation } from '@react-navigation/native';

const SettingsScreen = () => {
  const { currentProfile, profiles, pin, isAdultUnlocked, removeProfile, loadProfile, unloadProfile } = useIPTV();
  const { colors, themeMode, setThemeMode, bufferSize, setBufferSize } = useSettings();
  const navigation = useNavigation<any>();

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
                  <TouchableOpacity onPress={() => loadProfile(p)} style={styles.iconButton}>
                    <Text style={{ color: colors.primary }}>Load</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => handleDeleteProfile(p.id)} style={styles.iconButton}>
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
        <View style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.divider }]}>
          <View style={styles.tileLeft}>
            <Text style={[styles.tileTitle, { color: colors.text }]}>Theme Mode</Text>
            <Text style={[styles.tileSubtitle, { color: colors.textSecondary }]}>{themeMode}</Text>
          </View>
          <View style={[styles.pickerContainer, { backgroundColor: colors.background }]}>
            <Picker
              selectedValue={themeMode}
              onValueChange={(val: ThemeMode) => setThemeMode(val)}
              style={[styles.picker, { color: colors.text }]}
              dropdownIconColor={colors.text}
            >
              <Picker.Item label="Dark" value="dark" color={Platform.OS === 'ios' ? colors.text : undefined} />
              <Picker.Item label="OLED Black" value="oled" color={Platform.OS === 'ios' ? colors.text : undefined} />
              <Picker.Item label="Light" value="light" color={Platform.OS === 'ios' ? colors.text : undefined} />
            </Picker>
          </View>
        </View>

        {/* Buffer Size */}
        <View style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.divider }]}>
          <View style={styles.tileLeft}>
            <Text style={[styles.tileTitle, { color: colors.text }]}>Streaming Buffer Size</Text>
            <Text style={[styles.tileSubtitle, { color: colors.textSecondary }]}>{bufferSize} MB</Text>
          </View>
          <View style={[styles.pickerContainer, { backgroundColor: colors.background }]}>
            <Picker
              selectedValue={bufferSize}
              onValueChange={(val: number) => setBufferSize(val)}
              style={[styles.picker, { color: colors.text }]}
              dropdownIconColor={colors.text}
            >
              <Picker.Item label="8 MB" value={8} color={Platform.OS === 'ios' ? colors.text : undefined} />
              <Picker.Item label="16 MB" value={16} color={Platform.OS === 'ios' ? colors.text : undefined} />
              <Picker.Item label="32 MB" value={32} color={Platform.OS === 'ios' ? colors.text : undefined} />
              <Picker.Item label="64 MB" value={64} color={Platform.OS === 'ios' ? colors.text : undefined} />
              <Picker.Item label="128 MB" value={128} color={Platform.OS === 'ios' ? colors.text : undefined} />
            </Picker>
          </View>
        </View>

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
