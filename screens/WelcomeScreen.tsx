import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useIPTV } from '../context/IPTVContext';
import { useSettings } from '../context/SettingsContext';
import { MaterialIcons as Icon } from '@expo/vector-icons';

const WelcomeScreen = () => {
  const { addProfile, loadProfile } = useIPTV();
  const { colors } = useSettings();

  const [type, setType] = useState<'xtream' | 'm3u'>('xtream');
  const [name, setName] = useState('');
  const [serverUrl, setServerUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [epgUrl, setEpgUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('dns');

  const predefinedIcons = [
    'tv', 'movie', 'star', 'public', 'dns', 'live-tv', 'sports-soccer', 'music-note', 'child-care', 'business'
  ];

  const handleLogin = async () => {
    if (!name || !serverUrl) {
      setError('Name and Server URL are required.');
      return;
    }
    if (type === 'xtream' && (!username || !password)) {
      setError('Username and Password are required for Xtream Codes.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let newProfile: any;
      if (type === 'm3u') {
        newProfile = {
          id: Date.now().toString(),
          name,
          type: 'm3u',
          url: serverUrl,
          epgUrl: epgUrl || undefined,
          icon: selectedIcon,
        };
      } else {
        newProfile = {
          id: Date.now().toString(),
          name,
          type: 'xtream',
          url: serverUrl,
          username,
          password,
          icon: selectedIcon,
        };
      }

      await addProfile(newProfile);
      await loadProfile(newProfile);
    } catch (e: any) {
      setError(e.message || 'Failed to add profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.title, { color: colors.text }]}>CouchPotatoPlayer</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Welcome</Text>

          {/* Type Selector */}
          <View style={[styles.typeSelector, { backgroundColor: colors.divider }]}>
            <TouchableOpacity
              style={[styles.typeButton, type === 'xtream' && { backgroundColor: colors.primary }]}
              onPress={() => setType('xtream')}
            >
              <Text style={[styles.typeText, { color: type === 'xtream' ? '#FFF' : colors.textSecondary }]}>Xtream Codes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeButton, type === 'm3u' && { backgroundColor: colors.primary }]}
              onPress={() => setType('m3u')}
            >
              <Text style={[styles.typeText, { color: type === 'm3u' ? '#FFF' : colors.textSecondary }]}>M3U Playlist</Text>
            </TouchableOpacity>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={{ width: '100%', marginBottom: 12 }}>
             <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Select Icon:</Text>
             <View style={styles.iconContainer}>
               {predefinedIcons.map((iconName) => (
                 <TouchableOpacity
                   key={iconName}
                   style={[
                     styles.iconWrapper,
                     selectedIcon === iconName && { backgroundColor: 'rgba(0, 122, 255, 0.3)', borderColor: colors.primary }
                   ]}
                   onPress={() => setSelectedIcon(iconName)}
                   accessibilityRole="button"
                   accessibilityLabel={`Select ${iconName.replace('_', ' ')} icon`}
                 >
                   <Icon name={iconName.replace('_', '-') as any} size={24} color={selectedIcon === iconName ? colors.primary : '#FFF'} />
                 </TouchableOpacity>
               ))}
             </View>
          </View>

          {/* Inputs */}
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.divider }]}
            placeholder="Provider Name"
            placeholderTextColor={colors.textSecondary}
            value={name}
            onChangeText={setName}
            autoFocus={true}
          />
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.divider }]}
            placeholder={type === 'xtream' ? "Server URL (http://...)" : "M3U Playlist URL"}
            placeholderTextColor={colors.textSecondary}
            value={serverUrl}
            onChangeText={setServerUrl}
            keyboardType="url"
            autoCapitalize="none"
            autoCorrect={false}
          />

          {type === 'xtream' ? (
            <>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.divider }]}
                placeholder="Username"
                placeholderTextColor={colors.textSecondary}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.divider }]}
                placeholder="Password"
                placeholderTextColor={colors.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </>
          ) : (
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.divider }]}
              placeholder="XMLTV EPG URL (Optional)"
              placeholderTextColor={colors.textSecondary}
              value={epgUrl}
              onChangeText={setEpgUrl}
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
            />
          )}

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginButton, { backgroundColor: colors.primary }]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.loginButtonText}>Login</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 600,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  typeSelector: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 4,
    marginBottom: 20,
    width: '100%',
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  typeText: {
    fontWeight: 'bold',
  },
  input: {
    width: '100%',
    padding: 14,
    borderRadius: 10,
    marginBottom: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#3C3C3E',
  },
  loginButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: 'bold',
  },
  errorText: {
    color: '#FF453A',
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  inputLabel: {
    width: '100%',
    textAlign: 'left',
    marginBottom: 8,
  },
  iconContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    width: '100%',
  },
  iconWrapper: {
    padding: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#3C3C3E',
    backgroundColor: 'transparent',
  },
});

export default WelcomeScreen;
