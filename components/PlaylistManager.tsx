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

const PlaylistManager = () => {
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
        setServerUrl(editingProfile.serverUrl);
        setUsername(editingProfile.username);
        setPassword(editingProfile.password || '');
      }
    }
  }, [editingProfile]);

  const handleSubmit = () => {
    if (!name.trim()) {
      Alert.alert("Error / Fehler", "Please fill in the profile name / Bitte geben Sie den Profilnamen ein");
      return;
    }
    let profileData: IPTVProfile;
    if (profileType === 'm3u') {
      if (!url.trim()) {
        Alert.alert("Error / Fehler", "Please fill in the M3U URL / Bitte geben Sie die M3U-URL ein");
        return;
      }
      profileData = {
        id: editingProfile?.id || Date.now().toString(),
        name, type: 'm3u', url,
      };
    } else if (profileType === 'xtream') {
      if (!serverUrl.trim() || !username.trim()) {
        Alert.alert("Error / Fehler", "Please fill in the Server and Username / Bitte geben Sie den Server und Benutzernamen ein");
        return;
      }
      profileData = {
        id: editingProfile?.id || Date.now().toString(),
        name, type: 'xtream', serverUrl, username, password,
      };
    } else {
      Alert.alert("Error / Fehler", "Unsupported profile type / Nicht unterstützter Profiltyp");
      return;
    }

    if (editingProfile) {
      editProfile(profileData);
      Alert.alert("Success / Erfolg", `Profil "${name}" mis à jour.`);
    } else {
      addProfile(profileData);
    }
    cancelEdit();
  };

  const startEditing = (profile: IPTVProfile) => {
    if (profile.type === 'stalker') {
      Alert.alert("Unsupported / Nicht unterstützt", "Editing Stalker profiles is not yet implemented. / Das Bearbeiten von Stalker-Profilen ist noch nicht implementiert.");
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
    console.log("Loading profile: / Lade Profil:", profile.name);
    loadProfile(profile);
  };

  const handleDeleteProfile = (profile: IPTVProfile) => {
    Alert.alert( "Delete Profile / Profil löschen", `Êtes-vous sûr de vouloir supprimer "${profile.name}" ?`,
      [ { text: "Cancel / Abbrechen", style: "cancel" }, { text: "Delete / Löschen", style: "destructive", onPress: () => removeProfile(profile.id) } ]
    );
  };

  const renderProfileItem = ({ item }: { item: IPTVProfile }) => (
    <View style={styles.profileItem}>
      <View style={styles.profileInfo}>
        <Text style={styles.profileName}>{item.name}</Text>
        <Text style={styles.profileType}>{item.type.toUpperCase()}</Text>
      </View>
      <View style={styles.profileActions}>
        <TouchableOpacity style={[styles.actionButton, styles.loadButton]} onPress={() => handleLoadProfile(item)} disabled={isLoading}>
          <Text style={styles.actionButtonText}>Load / Laden</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.editButton]} onPress={() => startEditing(item)}>
          <Text style={styles.actionButtonText}>Edit / Bearbeiten</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={() => handleDeleteProfile(item)}>
          <Text style={styles.actionButtonText}>X</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{editingProfile ? "Edit Profile / Profil bearbeiten" : "Add Profile / Profil hinzufügen"}</Text>

      <Text style={styles.label}>Profile Type / Profiltyp</Text>
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

      <Text style={styles.label}>Profile Name / Profilname</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex: My ISP / Bsp: Mein ISP"
        value={name}
        onChangeText={setName}
        placeholderTextColor="#888"
        autoFocus={true}
      />

      {profileType === 'm3u' && (
        <>
          <Text style={styles.label}>M3U URL</Text>
          <TextInput style={styles.input} placeholder="http://..." value={url} onChangeText={setUrl} autoCapitalize="none" keyboardType="url" placeholderTextColor="#888" />
        </>
      )}

      {profileType === 'xtream' && (
        <>
          <Text style={styles.label}>Server URL (with http:// and port) / Server-URL (mit http:// und Port)</Text>
          <TextInput style={styles.input} placeholder="http://domaine.com:80" value={serverUrl} onChangeText={setServerUrl} autoCapitalize="none" keyboardType="url" placeholderTextColor="#888" />
          <Text style={styles.label}>Username / Benutzername</Text>
          <TextInput style={styles.input} placeholder="Username / Benutzername" value={username} onChangeText={setUsername} autoCapitalize="none" placeholderTextColor="#888" />
          <Text style={styles.label}>Password / Passwort</Text>
          <TextInput style={styles.input} placeholder="Password / Passwort" value={password} onChangeText={setPassword} autoCapitalize="none" secureTextEntry placeholderTextColor="#888" />
        </>
      )}

      <View style={styles.formButtons}>
        <Button title={editingProfile ? "Save / Speichern" : "Add / Hinzufügen"} onPress={handleSubmit} />
        {editingProfile && (<Button title="Cancel / Abbrechen" onPress={cancelEdit} color="#FF3B30" />)}
      </View>

      <View style={styles.divider} />
      <Text style={styles.title}>Saved Profiles / Gespeicherte Profile</Text>

      {isLoading && !currentProfile && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading... / Wird geladen...</Text>
        </View>
      )}
      {error && <Text style={styles.errorText}>Error / Fehler: {error}</Text>}
      <FlatList
        data={profiles}
        renderItem={renderProfileItem}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={ !isLoading ? <Text style={styles.emptyText}>No saved profiles. / Keine gespeicherten Profile.</Text> : null }
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