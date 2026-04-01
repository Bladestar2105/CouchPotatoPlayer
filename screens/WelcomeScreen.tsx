import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
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
    const trimmedServerUrl = serverUrl.trim();
    if (!name || !trimmedServerUrl) {
      setError('Name and Server URL are required.');
      return;
    }
    if (!/^https?:\/\//i.test(trimmedServerUrl)) {
      setError('URL must start with http:// or https://');
      return;
    }
    if (type === 'm3u' && epgUrl && !/^https?:\/\//i.test(epgUrl.trim())) {
      setError('EPG URL must start with http:// or https://');
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
          url: trimmedServerUrl,
          epgUrl: epgUrl || undefined,
          icon: selectedIcon,
        };
      } else {
        newProfile = {
          id: Date.now().toString(),
          name,
          type: 'xtream',
          url: trimmedServerUrl,
          username,
          password,
          icon: selectedIcon,
        };
      }

      await addProfile(newProfile);
      await loadProfile(newProfile);
    } catch (e: any) {
      setError('Failed to add profile');
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
          <Image
            source={require('../assets/icon.png')}
            style={styles.appLogo}
            resizeMode="contain"
          />
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
            accessibilityLabel="Provider Name"
            value={name}
            onChangeText={setName}
            tvFocusable={true}
            autoFocus={!Platform.isTV}
          />
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.divider }]}
            placeholder={type === 'xtream' ? "Server URL (http://...)" : "M3U Playlist URL"}
            placeholderTextColor={colors.textSecondary}
            accessibilityLabel={type === 'xtream' ? "Server URL" : "M3U Playlist URL"}
            value={serverUrl}
            onChangeText={setServerUrl}
            keyboardType="url"
            autoCapitalize="none"
            autoCorrect={false}
            tvFocusable={true}
          />

          {type === 'xtream' ? (
            <>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.divider }]}
                placeholder="Username"
                placeholderTextColor={colors.textSecondary}
                accessibilityLabel="Username"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
                tvFocusable={true}
              />
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.divider }]}
                placeholder="Password"
                placeholderTextColor={colors.textSecondary}
                accessibilityLabel="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                tvFocusable={true}
              />
            </>
          ) : (
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.divider }]}
              placeholder="XMLTV EPG URL (Optional)"
              placeholderTextColor={colors.textSecondary}
              accessibilityLabel="XMLTV EPG URL"
              value={epgUrl}
              onChangeText={setEpgUrl}
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
              tvFocusable={true}
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
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 520,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    // Modern shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 8,
  },
  appLogo: {
    width: 100,
    height: 100,
    marginBottom: 24,
    borderRadius: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 28,
    textAlign: 'center',
    opacity: 0.7,
  },
  typeSelector: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 4,
    marginBottom: 24,
    width: '100%',
  },
  typeButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  typeText: {
    fontWeight: '600',
    fontSize: 15,
  },
  input: {
    width: '100%',
    padding: Platform.isTV ? 20 : 16,
    borderRadius: 14,
    marginBottom: 14,
    fontSize: Platform.isTV ? 28 : 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  loginButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 12,
    // Button shadow for depth
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 15,
    marginBottom: 20,
    textAlign: 'center',
    backgroundColor: 'rgba(239,68,68,0.1)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    overflow: 'hidden',
  },
  inputLabel: {
    width: '100%',
    textAlign: 'left',
    marginBottom: 10,
    fontSize: 14,
    fontWeight: '500',
  },
  iconContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    width: '100%',
  },
  iconWrapper: {
    padding: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
});

export default WelcomeScreen;
