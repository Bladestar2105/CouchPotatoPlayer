/**
 * ProfileManager - IPTV server profile management.
 *
 * Inspired by MKS-IPTV-App's IPTVProfilesManager:
 * - Save multiple IPTV server configurations
 * - Quick-switch between profiles
 * - Import/Export profiles
 * - Visual profile cards with status indicators
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  TextInput, Modal, Platform, Alert, ScrollView,
} from 'react-native';
import { User, Plus, Trash2, Check, Edit2, X, Server, Copy } from 'lucide-react-native';
import { useAppStore } from '../store';
import { isTV, isMobile } from '../utils/platform';

export interface IPTVProfile {
  id: string;
  name: string;
  type: 'xtream' | 'm3u';
  serverUrl: string;
  username: string;
  password: string;
  createdAt: number;
  lastUsed?: number;
  color: string;
}

const PROFILE_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#6C5CE7', '#00CEC9', '#FD79A8', '#E17055',
];

interface ProfileManagerProps {
  visible: boolean;
  onClose: () => void;
  onSelectProfile: (profile: IPTVProfile) => void;
  profiles: IPTVProfile[];
  activeProfileId?: string;
  onSaveProfiles: (profiles: IPTVProfile[]) => void;
}

export const ProfileManager: React.FC<ProfileManagerProps> = ({
  visible,
  onClose,
  onSelectProfile,
  profiles,
  activeProfileId,
  onSaveProfiles,
}) => {
  const [editingProfile, setEditingProfile] = useState<IPTVProfile | null>(null);
  const [showEditor, setShowEditor] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<'xtream' | 'm3u'>('xtream');
  const [formUrl, setFormUrl] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formColor, setFormColor] = useState(PROFILE_COLORS[0]);

  const resetForm = useCallback(() => {
    setFormName('');
    setFormType('xtream');
    setFormUrl('');
    setFormUsername('');
    setFormPassword('');
    setFormColor(PROFILE_COLORS[Math.floor(Math.random() * PROFILE_COLORS.length)]);
    setEditingProfile(null);
  }, []);

  const openEditor = useCallback((profile?: IPTVProfile) => {
    if (profile) {
      setEditingProfile(profile);
      setFormName(profile.name);
      setFormType(profile.type);
      setFormUrl(profile.serverUrl);
      setFormUsername(profile.username);
      setFormPassword(profile.password);
      setFormColor(profile.color);
    } else {
      resetForm();
    }
    setShowEditor(true);
  }, [resetForm]);

  const saveProfile = useCallback(() => {
    if (!formName.trim() || !formUrl.trim()) return;

    const now = Date.now();
    if (editingProfile) {
      // Update existing
      const updated = profiles.map(p =>
        p.id === editingProfile.id
          ? { ...p, name: formName, type: formType, serverUrl: formUrl, username: formUsername, password: formPassword, color: formColor }
          : p
      );
      onSaveProfiles(updated);
    } else {
      // Create new
      const newProfile: IPTVProfile = {
        id: `profile_${now}_${Math.random().toString(36).substring(7)}`,
        name: formName.trim(),
        type: formType,
        serverUrl: formUrl.trim(),
        username: formUsername.trim(),
        password: formPassword,
        createdAt: now,
        color: formColor,
      };
      onSaveProfiles([...profiles, newProfile]);
    }
    setShowEditor(false);
    resetForm();
  }, [formName, formType, formUrl, formUsername, formPassword, formColor, editingProfile, profiles, onSaveProfiles, resetForm]);

  const deleteProfile = useCallback((id: string) => {
    const updated = profiles.filter(p => p.id !== id);
    onSaveProfiles(updated);
  }, [profiles, onSaveProfiles]);

  const handleSelect = useCallback((profile: IPTVProfile) => {
    const updated = profiles.map(p =>
      p.id === profile.id ? { ...p, lastUsed: Date.now() } : p
    );
    onSaveProfiles(updated);
    onSelectProfile(profile);
    onClose();
  }, [profiles, onSaveProfiles, onSelectProfile, onClose]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, isMobile && styles.containerMobile]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Server color="#007AFF" size={22} />
              <Text style={styles.title}>IPTV Profiles</Text>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity style={styles.addBtn} onPress={() => openEditor()}>
                <Plus color="#FFF" size={18} />
                <Text style={styles.addBtnText}>Add</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <X color="#999" size={22} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Profile List */}
          {profiles.length === 0 ? (
            <View style={styles.empty}>
              <Server color="#555" size={48} />
              <Text style={styles.emptyText}>No profiles yet</Text>
              <Text style={styles.emptySubtext}>Add your first IPTV server</Text>
              <TouchableOpacity style={styles.emptyAddBtn} onPress={() => openEditor()}>
                <Plus color="#FFF" size={18} />
                <Text style={styles.emptyAddBtnText}>Add Profile</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={profiles}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.list}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.profileCard,
                    item.id === activeProfileId && styles.profileCardActive,
                  ]}
                  onPress={() => handleSelect(item)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.profileAvatar, { backgroundColor: item.color }]}>
                    <Text style={styles.profileAvatarText}>
                      {item.name.substring(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.profileInfo}>
                    <View style={styles.profileNameRow}>
                      <Text style={styles.profileName} numberOfLines={1}>{item.name}</Text>
                      {item.id === activeProfileId && (
                        <View style={styles.activeBadge}>
                          <Check color="#FFF" size={12} />
                          <Text style={styles.activeBadgeText}>Active</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.profileUrl} numberOfLines={1}>
                      {item.type === 'xtream' ? `${item.serverUrl} • ${item.username}` : item.serverUrl}
                    </Text>
                    <Text style={styles.profileMeta}>
                      {item.type.toUpperCase()} • {item.lastUsed ? `Last used ${new Date(item.lastUsed).toLocaleDateString()}` : 'Never used'}
                    </Text>
                  </View>
                  <View style={styles.profileActions}>
                    <TouchableOpacity onPress={() => openEditor(item)} style={styles.actionBtn}>
                      <Edit2 color="#888" size={16} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => deleteProfile(item.id)}
                      style={styles.actionBtn}
                    >
                      <Trash2 color="#FF4444" size={16} />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              )}
            />
          )}

          {/* Editor Modal */}
          {showEditor && (
            <Modal visible={showEditor} transparent animationType="fade" onRequestClose={() => setShowEditor(false)}>
              <View style={styles.editorOverlay}>
                <ScrollView style={[styles.editor, isMobile && styles.editorMobile]} contentContainerStyle={styles.editorContent}>
                  <Text style={styles.editorTitle}>
                    {editingProfile ? 'Edit Profile' : 'New Profile'}
                  </Text>

                  <Text style={styles.label}>Profile Name</Text>
                  <TextInput
                    style={styles.input}
                    value={formName}
                    onChangeText={setFormName}
                    placeholder="My IPTV Server"
                    placeholderTextColor="#666"
                  />

                  <Text style={styles.label}>Type</Text>
                  <View style={styles.typeRow}>
                    <TouchableOpacity
                      style={[styles.typeBtn, formType === 'xtream' && styles.typeBtnActive]}
                      onPress={() => setFormType('xtream')}
                    >
                      <Text style={[styles.typeBtnText, formType === 'xtream' && styles.typeBtnTextActive]}>
                        Xtream Codes
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.typeBtn, formType === 'm3u' && styles.typeBtnActive]}
                      onPress={() => setFormType('m3u')}
                    >
                      <Text style={[styles.typeBtnText, formType === 'm3u' && styles.typeBtnTextActive]}>
                        M3U Playlist
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.label}>Server URL</Text>
                  <TextInput
                    style={styles.input}
                    value={formUrl}
                    onChangeText={setFormUrl}
                    placeholder="http://server.com:8080"
                    placeholderTextColor="#666"
                    autoCapitalize="none"
                    keyboardType="url"
                  />

                  {formType === 'xtream' && (
                    <>
                      <Text style={styles.label}>Username</Text>
                      <TextInput
                        style={styles.input}
                        value={formUsername}
                        onChangeText={setFormUsername}
                        placeholder="username"
                        placeholderTextColor="#666"
                        autoCapitalize="none"
                      />

                      <Text style={styles.label}>Password</Text>
                      <TextInput
                        style={styles.input}
                        value={formPassword}
                        onChangeText={setFormPassword}
                        placeholder="password"
                        placeholderTextColor="#666"
                        autoCapitalize="none"
                        secureTextEntry
                      />
                    </>
                  )}

                  <Text style={styles.label}>Color</Text>
                  <View style={styles.colorRow}>
                    {PROFILE_COLORS.map(color => (
                      <TouchableOpacity
                        key={color}
                        style={[
                          styles.colorDot,
                          { backgroundColor: color },
                          formColor === color && styles.colorDotActive,
                        ]}
                        onPress={() => setFormColor(color)}
                      >
                        {formColor === color && <Check color="#FFF" size={14} />}
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={styles.editorButtons}>
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowEditor(false); resetForm(); }}>
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.saveBtn, (!formName.trim() || !formUrl.trim()) && styles.saveBtnDisabled]}
                      onPress={saveProfile}
                      disabled={!formName.trim() || !formUrl.trim()}
                    >
                      <Text style={styles.saveBtnText}>
                        {editingProfile ? 'Update' : 'Save'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </View>
            </Modal>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '90%',
    maxWidth: 600,
    maxHeight: '80%',
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    overflow: 'hidden',
  },
  containerMobile: {
    width: '95%',
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  addBtnText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },
  closeBtn: {
    padding: 4,
  },
  list: {
    padding: 12,
    gap: 10,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  profileCardActive: {
    borderColor: '#007AFF',
    backgroundColor: '#1a2a3a',
  },
  profileAvatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  profileAvatarText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileName: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 4,
  },
  activeBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
  },
  profileUrl: {
    color: '#999',
    fontSize: 13,
    marginTop: 2,
  },
  profileMeta: {
    color: '#666',
    fontSize: 11,
    marginTop: 2,
  },
  profileActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    padding: 8,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 12,
  },
  emptyText: {
    color: '#AAA',
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubtext: {
    color: '#666',
    fontSize: 14,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
    marginTop: 8,
  },
  emptyAddBtnText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 15,
  },
  // Editor
  editorOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editor: {
    width: '90%',
    maxWidth: 500,
    maxHeight: '85%',
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
  },
  editorMobile: {
    width: '95%',
  },
  editorContent: {
    padding: 20,
  },
  editorTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
  },
  label: {
    color: '#AAA',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    backgroundColor: '#2C2C2E',
    color: '#FFF',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#444',
  },
  typeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#2C2C2E',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  typeBtnActive: {
    borderColor: '#007AFF',
    backgroundColor: '#1a2a3a',
  },
  typeBtnText: {
    color: '#999',
    fontWeight: '600',
  },
  typeBtnTextActive: {
    color: '#007AFF',
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  colorDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorDotActive: {
    borderWidth: 3,
    borderColor: '#FFF',
  },
  editorButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#2C2C2E',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#999',
    fontWeight: '600',
    fontSize: 15,
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.4,
  },
  saveBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 15,
  },
});