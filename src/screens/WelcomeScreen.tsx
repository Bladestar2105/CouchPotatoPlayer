import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '../store';
import { XtreamService } from '../services/xtream';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Welcome'>;

export const WelcomeScreen = () => {
  const [type, setType] = useState<'xtream' | 'm3u'>('xtream');
  const [serverUrl, setServerUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [epgUrl, setEpgUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const setConfig = useAppStore(state => state.setConfig);
  const navigation = useNavigation<NavigationProp>();

  const handleLogin = async () => {
    const trimmedServerUrl = serverUrl.trim();
    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();
    const trimmedEpgUrl = epgUrl.trim();

    const isValidUrl = (url: string) => /^https?:\/\//i.test(url);

    if (type === 'xtream') {
      if (!trimmedServerUrl || !trimmedUsername || !trimmedPassword) {
        setError('Please fill in all fields for Xtream Codes');
        return;
      }
      if (!isValidUrl(trimmedServerUrl)) {
        setError('Server URL must start with http:// or https://');
        return;
      }
    } else {
      if (!trimmedServerUrl) {
        setError('Please enter an M3U Playlist URL');
        return;
      }
      if (!isValidUrl(trimmedServerUrl)) {
        setError('Playlist URL must start with http:// or https://');
        return;
      }
      if (trimmedEpgUrl && !isValidUrl(trimmedEpgUrl)) {
        setError('EPG URL must start with http:// or https://');
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
      if (type === 'xtream') {
        const config = { type: 'xtream' as const, serverUrl: trimmedServerUrl, username: trimmedUsername, password: trimmedPassword };
        const xtream = new XtreamService(config);

        const auth = await xtream.authenticate();

        if (auth && auth.user_info && auth.user_info.auth === 1) {
          setConfig(config);
          navigation.replace('Home');
        } else {
          setError('Authentication failed. Check credentials.');
        }
      } else {
        const config = { type: 'm3u' as const, serverUrl: trimmedServerUrl, username: '', epgUrl: trimmedEpgUrl };
        setConfig(config);
        navigation.replace('Home');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Login error:', errorMessage);
      setError(`Connection error: ${errorMessage}. Verify URL or credentials.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>CouchPotatoPlayer</Text>
        <Text style={styles.subtitle}>Welcome</Text>

        <View style={styles.typeSelector}>
          <TouchableOpacity
            style={[styles.typeButton, type === 'xtream' && styles.typeButtonActive]}
            onPress={() => setType('xtream')}
            onFocus={() => setType('xtream')}
          >
            <Text style={[styles.typeText, type === 'xtream' && styles.typeTextActive]}>Xtream Codes</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeButton, type === 'm3u' && styles.typeButtonActive]}
            onPress={() => setType('m3u')}
            onFocus={() => setType('m3u')}
          >
            <Text style={[styles.typeText, type === 'm3u' && styles.typeTextActive]}>M3U Playlist</Text>
          </TouchableOpacity>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TextInput
          style={styles.input}
          placeholder={type === 'xtream' ? "Server URL (http://...)" : "M3U Playlist URL"}
          placeholderTextColor="#888"
          value={serverUrl}
          onChangeText={setServerUrl}
          autoCapitalize="none"
          keyboardType="url"
        />

        {type === 'xtream' ? (
          <>
            <TextInput
              style={styles.input}
              placeholder="Username"
              placeholderTextColor="#888"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#888"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </>
        ) : (
          <TextInput
            style={styles.input}
            placeholder="XMLTV EPG URL (Optional)"
            placeholderTextColor="#888"
            value={epgUrl}
            onChangeText={setEpgUrl}
            autoCapitalize="none"
            keyboardType="url"
          />
        )}

        <TouchableOpacity
          style={styles.button}
          onPress={handleLogin}
          activeOpacity={0.8}
          hasTVPreferredFocus
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.buttonText}>Login</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#1C1C1E',
    padding: 40,
    borderRadius: 20,
    width: 600,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 20,
    color: '#AAA',
    textAlign: 'center',
    marginBottom: 20,
  },
  typeSelector: {
    flexDirection: 'row',
    marginBottom: 30,
    backgroundColor: '#2C2C2E',
    borderRadius: 10,
    padding: 5,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  typeButtonActive: {
    backgroundColor: '#007AFF',
  },
  typeText: {
    color: '#888',
    fontSize: 16,
    fontWeight: 'bold',
  },
  typeTextActive: {
    color: '#FFF',
  },
  input: {
    backgroundColor: '#2C2C2E',
    color: '#FFF',
    padding: 15,
    borderRadius: 10,
    fontSize: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#3C3C3E',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  error: {
    color: '#FF453A',
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 16,
  }
});
