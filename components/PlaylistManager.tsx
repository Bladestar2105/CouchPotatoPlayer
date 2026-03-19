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
      Alert.alert("Erreur", "Veuillez remplir le nom du profil");
      return;
    }
    let profileData: IPTVProfile;
    if (profileType === 'm3u') {
      if (!url.trim()) {
        Alert.alert("Erreur", "Veuillez remplir l'URL M3U");
        return;
      }
      profileData = {
        id: editingProfile?.id || Date.now().toString(),
        name, type: 'm3u', url,
      };
    } else if (profileType === 'xtream') {
      if (!serverUrl.trim() || !username.trim()) {
        Alert.alert("Erreur", "Veuillez remplir le Serveur et l'Utilisateur");
        return;
      }
      profileData = {
        id: editingProfile?.id || Date.now().toString(),
        name, type: 'xtream', serverUrl, username, password,
      };
    } else {
      Alert.alert("Erreur", "Type de profil non supporté");
      return;
    }

    if (editingProfile) {
      editProfile(profileData);
      Alert.alert("Succès", `Profil "${name}" mis à jour.`);
    } else {
      addProfile(profileData);
    }
    cancelEdit();
  };

  const startEditing = (profile: IPTVProfile) => {
    if (profile.type === 'stalker') {
      Alert.alert("Non supporté", "L'édition des profils Stalker n'est pas encore implémentée.");
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
    console.log("Chargement du profil:", profile.name);
    loadProfile(profile);
  };

  const handleDeleteProfile = (profile: IPTVProfile) => {
    Alert.alert( "Supprimer le profil", `Êtes-vous sûr de vouloir supprimer "${profile.name}" ?`,
      [ { text: "Annuler", style: "cancel" }, { text: "Supprimer", style: "destructive", onPress: () => removeProfile(profile.id) } ]
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
          <Text style={styles.actionButtonText}>Charger</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.editButton]} onPress={() => startEditing(item)}>
          <Text style={styles.actionButtonText}>Éditer</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={() => handleDeleteProfile(item)}>
          <Text style={styles.actionButtonText}>X</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{editingProfile ? "Modifier le Profil" : "Ajouter un Profil"}</Text>

      <Text style={styles.label}>Type de Profil</Text>
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

      <Text style={styles.label}>Nom du Profil</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex: Mon FAI"
        value={name}
        onChangeText={setName}
        placeholderTextColor="#888"
        autoFocus={true}
      />

      {profileType === 'm3u' && (
        <>
          <Text style={styles.label}>URL M3U</Text>
          <TextInput style={styles.input} placeholder="http://..." value={url} onChangeText={setUrl} autoCapitalize="none" keyboardType="url" placeholderTextColor="#888" />
        </>
      )}

      {profileType === 'xtream' && (
        <>
          <Text style={styles.label}>URL du Serveur (avec http:// et port)</Text>
          <TextInput style={styles.input} placeholder="http://domaine.com:80" value={serverUrl} onChangeText={setServerUrl} autoCapitalize="none" keyboardType="url" placeholderTextColor="#888" />
          <Text style={styles.label}>Nom d'utilisateur</Text>
          <TextInput style={styles.input} placeholder="Utilisateur" value={username} onChangeText={setUsername} autoCapitalize="none" placeholderTextColor="#888" />
          <Text style={styles.label}>Mot de passe</Text>
          <TextInput style={styles.input} placeholder="Mot de passe" value={password} onChangeText={setPassword} autoCapitalize="none" secureTextEntry placeholderTextColor="#888" />
        </>
      )}

      <View style={styles.formButtons}>
        <Button title={editingProfile ? "Sauvegarder" : "Ajouter"} onPress={handleSubmit} />
        {editingProfile && (<Button title="Annuler" onPress={cancelEdit} color="#FF3B30" />)}
      </View>

      <View style={styles.divider} />
      <Text style={styles.title}>Profils Sauvegardés</Text>

      {isLoading && !currentProfile && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Chargement en cours...</Text>
        </View>
      )}
      {error && <Text style={styles.errorText}>Erreur: {error}</Text>}
      <FlatList
        data={profiles}
        renderItem={renderProfileItem}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={ !isLoading ? <Text style={styles.emptyText}>Aucun profil sauvegardé.</Text> : null }
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