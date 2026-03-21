import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform // Importé pour le style du Picker
} from 'react-native';
import { useIPTV } from '../context/IPTVContext';
import { IPTVProfile, M3UProfile, XtreamProfile, ProfileType } from '../types';
import { Picker } from '@react-native-picker/picker';
import { useTranslation } from 'react-i18next';

const PlaylistManager = () => {
  const { t } = useTranslation();
  const {
    addProfile, removeProfile, editProfile, profiles,
    loadProfile, isLoading, error, currentProfile
  } = useIPTV();

  const [profileType, setProfileType] = useState<ProfileType>('m3u');
  const [name, setName] = useState('');
  const [url, setUrl] = useState(''); // Pour M3U
  const [serverUrl, setServerUrl] = useState(''); // Pour Xtream
  const [username, setUsername] = useState(''); // Pour Xtream
  const [password, setPassword] = useState(''); // Pour Xtream
  const [editingProfile, setEditingProfile] = useState<IPTVProfile | null>(null);

  useEffect(() => {
    if (editingProfile) {
      setName(editingProfile.name);
      setProfileType(editingProfile.type);
      if (editingProfile.type === 'm3u') {
        setUrl(editingProfile.url);
      } else if (editingProfile.type === 'xtream') {
        setServerUrl(editingProfile.url);
        setUsername(editingProfile.username);
        setPassword(editingProfile.password || '');
      }
    }
  }, [editingProfile]);

  const handleSubmit = () => {
    if (!name.trim()) {
      Alert.alert(t('error'), t('errorFillProfileName'));
      return;
    }
    let profileData: IPTVProfile;
    if (profileType === 'm3u') {
      const trimmedUrl = url.trim();
      if (!trimmedUrl) {
        Alert.alert(t('error'), t('errorFillM3UUrl'));
        return;
      }
      if (!/^https?:\/\//i.test(trimmedUrl)) {
        Alert.alert(t('error'), 'URL must start with http:// or https://');
        return;
      }
      profileData = {
        id: editingProfile?.id || Date.now().toString(),
        name, type: 'm3u', url: trimmedUrl,
      };
    } else if (profileType === 'xtream') {
      const trimmedServerUrl = serverUrl.trim();
      if (!trimmedServerUrl || !username.trim()) {
        Alert.alert(t('error'), t('errorFillServerAndUser'));
        return;
      }
      if (!/^https?:\/\//i.test(trimmedServerUrl)) {
        Alert.alert(t('error'), 'URL must start with http:// or https://');
        return;
      }
      profileData = {
        id: editingProfile?.id || Date.now().toString(),
        name, type: 'xtream', url: trimmedServerUrl, username, password,
      };
    } else {
      Alert.alert(t('error'), t('unsupportedProfileType'));
      return;
    }

    if (editingProfile) {
      editProfile(profileData);
      Alert.alert(t('success'), t('profileUpdated', { name }));
    } else {
      addProfile(profileData);
    }
    cancelEdit();
  };

  const startEditing = (profile: IPTVProfile) => {
    if (profile.type === 'stalker') {
      Alert.alert(t('unsupported'), t('stalkerEditNotImplemented'));
      return;
    }
    setEditingProfile(profile);
  };

  const cancelEdit = () => {
    setEditingProfile(null);
    setName(''); setUrl(''); setServerUrl(''); setUsername(''); setPassword('');
    setProfileType('m3u');
  };

  const handleLoadProfile = (profile: IPTVProfile) => {
    if (isLoading) return;
    console.log(t('loadingProfile'), profile.name);
    loadProfile(profile);
  };

  const handleDeleteProfile = (profile: IPTVProfile) => {
    Alert.alert( t('deleteProfile'), t('deleteConfirmation', { name: profile.name }),
      [ { text: t('cancel'), style: "cancel" }, { text: t('delete'), style: "destructive", onPress: () => removeProfile(profile.id) } ]
    );
  };

  const renderProfileItem = ({ item }: { item: IPTVProfile }) => (
    <View style={styles.profileItem}>
      <View style={styles.profileInfo}>
        <Text style={styles.profileName}>{item.name}</Text>
        <Text style={styles.profileType}>{item.type.toUpperCase()}</Text>
      </View>
      <View style={styles.profileActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.loadButton]}
          onPress={() => handleLoadProfile(item)}
          disabled={isLoading}
          accessibilityRole="button"
          accessibilityLabel={`${t('load')} ${item.name}`}
        >
          <Text style={styles.actionButtonText}>{t('load')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => startEditing(item)}
          accessibilityRole="button"
          accessibilityLabel={`${t('edit')} ${item.name}`}
        >
          <Text style={styles.actionButtonText}>{t('edit')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteProfile(item)}
          accessibilityRole="button"
          accessibilityLabel={`${t('delete')} ${item.name}`}
        >
          <Text style={styles.actionButtonText}>X</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{editingProfile ? t('editProfile') : t('addProfile')}</Text>

      <Text style={styles.label}>{t('profileType')}</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={profileType}
          onValueChange={(itemValue) => setProfileType(itemValue as ProfileType)}
          style={styles.picker}
          dropdownIconColor="#FFF"
          enabled={!editingProfile}
        >
          {/* --- CORRECTION DU STYLE (blanc sur blanc) --- */}
          <Picker.Item label="Playlist M3U" value="m3u" color={Platform.OS === 'android' ? '#000' : '#FFF'} />
          <Picker.Item label="Xtream Codes" value="xtream" color={Platform.OS === 'android' ? '#000' : '#FFF'} />
          <Picker.Item label="Stalker (MAC)" value="stalker" color={Platform.OS === 'android' ? '#888' : '#888'} enabled={false} />
        </Picker>
      </View>

      <Text style={styles.label}>{t('profileName')}</Text>
      <TextInput
        style={styles.input}
        placeholder={t('exMyISP')}
        value={name}
        onChangeText={setName}
        placeholderTextColor="#888"
        autoFocus={true}
      />

      {profileType === 'm3u' && (
        <>
          <Text style={styles.label}>{t('m3uUrl')}</Text>
          <TextInput style={styles.input} placeholder="http://..." value={url} onChangeText={setUrl} autoCapitalize="none" keyboardType="url" placeholderTextColor="#888" />
        </>
      )}

      {profileType === 'xtream' && (
        <>
          <Text style={styles.label}>{t('serverUrl')}</Text>
          <TextInput style={styles.input} placeholder="http://domaine.com:80" value={serverUrl} onChangeText={setServerUrl} autoCapitalize="none" keyboardType="url" placeholderTextColor="#888" />
          <Text style={styles.label}>{t('username')}</Text>
          <TextInput style={styles.input} placeholder={t('username')} value={username} onChangeText={setUsername} autoCapitalize="none" placeholderTextColor="#888" />
          <Text style={styles.label}>{t('password')}</Text>
          <TextInput style={styles.input} placeholder={t('password')} value={password} onChangeText={setPassword} autoCapitalize="none" secureTextEntry placeholderTextColor="#888" />
        </>
      )}

      <View style={styles.formButtons}>
        <Button title={editingProfile ? t('save') : t('add')} onPress={handleSubmit} />
        {editingProfile && (<Button title={t('cancel')} onPress={cancelEdit} color="#FF3B30" />)}
      </View>

      <View style={styles.divider} />
      <Text style={styles.title}>{t('savedProfiles')}</Text>

      {isLoading && !currentProfile && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>{t('loading')}</Text>
        </View>
      )}
      {error && <Text style={styles.errorText}>{t('error')}: {error}</Text>}
      <FlatList
        data={profiles}
        renderItem={renderProfileItem}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={ !isLoading ? <Text style={styles.emptyText}>{t('noSavedProfiles')}</Text> : null }
      />
    </View>
  );
};

// --- STYLES MIS À JOUR ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: '#121212',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#FFF',
  },
  label: {
    color: '#AAA',
    fontSize: 12,
    marginBottom: 4,
    marginLeft: 2,
  },
  input: {
    height: 44,
    borderColor: '#444',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 12,
    paddingHorizontal: 10,
    backgroundColor: '#222',
    color: '#FFF',
  },
  pickerContainer: {
    borderColor: '#444',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#222',
  },
  picker: {
    height: 44,
    width: '100%',
    color: '#FFF', // Couleur du texte SÉLECTIONNÉ
    backgroundColor: '#222',
  },
  formButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#444',
    marginVertical: 20,
  },
  profileItem: {
    backgroundColor: '#2A2A2A',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
    marginRight: 5,
  },
  profileName: {
    color: '#FFF',
    fontSize: 16,
    flexShrink: 1,
  },
  profileType: {
    color: '#AAA',
    fontSize: 12,
  },
  profileActions: {
    flexDirection: 'row',
  },
  actionButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 5,
    marginLeft: 5,
    justifyContent: 'center',
  },
  loadButton: {
    backgroundColor: '#007AFF',
  },
  editButton: {
    backgroundColor: '#FF9500', // Orange
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
  },
  actionButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  loadingContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  loadingText: {
    color: '#007AFF',
    marginTop: 10,
  },
  errorText: {
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 10,
  },
  emptyText: {
    color: '#888',
    textAlign: 'center',
    marginTop: 20,
  },
});

export default PlaylistManager;