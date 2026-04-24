import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, FlatList } from 'react-native';
import BrandMark from '../components/BrandMark';
import { useIPTVProfiles } from '../context/IPTVContext';
import { useSettings } from '../context/SettingsContext';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Crypto from 'expo-crypto';
import { effects, radii, spacing, typography } from '../theme/tokens';
import ThemedTextInput from '../components/ui/ThemedTextInput';
import ThemedButton from '../components/ui/ThemedButton';

const WelcomeScreen = () => {
  const { addProfile, loadProfile, profiles, currentProfile } = useIPTVProfiles();
  const { colors } = useSettings();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const [type, setType] = useState<'xtream' | 'm3u' | 'quickshare'>('xtream');
  const [name, setName] = useState('');
  const [serverUrl, setServerUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [epgUrl, setEpgUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('dns');
  const isAppleTV = Platform.isTV && Platform.OS === 'ios';
  const isCompactLayout = !Platform.isTV;
  const welcomeBackgroundColor = '#FFFFFF';
  // Show add form if: no profiles exist, or explicitly requested via route params
  const [showAddForm, setShowAddForm] = useState(profiles.length === 0 || route.params?.showAddForm === true);

  const predefinedIcons = [
    'tv', 'movie', 'star', 'public', 'dns', 'live-tv', 'sports-soccer', 'music-note', 'child-care', 'business'
  ];

  // If a profile is already loaded and we're not in add mode, navigate to Home
  useEffect(() => {
    if (currentProfile && !route.params?.showAddForm) {
      navigation.replace('Home');
    }
  }, [currentProfile, navigation, route.params?.showAddForm]);

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
    const trimmedEpgUrl = epgUrl.trim();
    if (type === 'm3u' && trimmedEpgUrl && !/^https?:\/\//i.test(trimmedEpgUrl)) {
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
          id: Crypto.randomUUID(),
          name,
          type: 'm3u',
          url: trimmedServerUrl,
          epgUrl: trimmedEpgUrl || undefined,
          icon: selectedIcon,
        };
      } else if (type === 'quickshare') {
        newProfile = {
          id: Crypto.randomUUID(),
          name,
          type: 'quickshare',
          url: trimmedServerUrl,
          icon: selectedIcon,
        };
      } else {
        newProfile = {
          id: Crypto.randomUUID(),
          name,
          type: 'xtream',
          url: trimmedServerUrl,
          username,
          password,
          icon: selectedIcon,
        };
      }

      await addProfile(newProfile);
      
      // If we're in add mode (already have a profile), go back to Home
      // Otherwise load the new profile
      if (route.params?.showAddForm && currentProfile) {
        navigation.goBack();
      } else {
        await loadProfile(newProfile);
      }
    } catch (e: any) {
      setError('Failed to add profile');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadProfile = async (profile: any) => {
    setLoading(true);
    try {
      await loadProfile(profile);
    } catch (e: any) {
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const renderExistingProfiles = () => (
    <View style={styles.profilesContainer}>
      <BrandMark size={136} variant="character" style={styles.appLogo} />
      <View style={styles.wordmark}>
        <Text
          style={styles.wordmarkText}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.55}
        >
          <Text style={styles.wordmarkPrimary}>CouchPotato</Text>
          <Text style={styles.wordmarkSecondary}>Player</Text>
        </Text>
      </View>
      <Text style={[styles.subtitle, { color: colors.accent }]}>Select a Provider</Text>
      {currentProfile?.name ? (
        <Text style={[styles.currentProviderText, { color: colors.textSecondary }]} numberOfLines={1}>
          Current: {currentProfile.name}
        </Text>
      ) : null}

      <FlatList
        data={profiles}
        keyExtractor={(item) => item.id}
        style={{ width: '100%', maxHeight: 300 }}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.profileTile, { backgroundColor: colors.card, borderColor: colors.divider }]}
            onPress={() => handleLoadProfile(item)}
            accessibilityRole="button"
            accessibilityLabel={`Load ${item.name}`}
          >
            <View style={styles.profileIconContainer}>
              <Icon name={(item.icon?.replace('_', '-') as any) || 'dns'} size={28} color={colors.primary} />
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: colors.text }]}>{item.name}</Text>
              <Text style={[styles.profileType, { color: colors.textSecondary }]}>
                {item.type === 'xtream'
                  ? 'Xtream Codes'
                  : item.type === 'quickshare'
                    ? 'Quickshare by IPTV-Manager'
                    : 'M3U Playlist'}
              </Text>
              {item.providerInfo && (
                <Text style={[styles.profileChannels, { color: colors.textMuted }]}>
                  {item.providerInfo.channelsCount || 0} channels
                </Text>
              )}
            </View>
            <Icon name="chevron-right" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      />

      <ThemedButton
        label="Add New Provider"
        backgroundColor={colors.primary}
        onPress={() => setShowAddForm(true)}
        style={styles.addNewButton}
      />
    </View>
  );

  const renderAddForm = () => (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: welcomeBackgroundColor }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.divider }]}>
          {profiles.length > 0 && (
            <TouchableOpacity
              style={styles.backToList}
              onPress={() => setShowAddForm(false)}
              accessibilityRole="button"
              accessibilityLabel="Back to Providers"
            >
              <Icon name="arrow-back" size={24} color={colors.textSecondary} />
              <Text style={[styles.backToListText, { color: colors.text }]}>Back to Providers</Text>
            </TouchableOpacity>
          )}

          <BrandMark size={136} variant="character" style={styles.appLogo} />
          <View style={styles.wordmark}>
            <Text
              style={styles.wordmarkText}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.55}
            >
              <Text style={styles.wordmarkPrimary}>CouchPotato</Text>
              <Text style={styles.wordmarkSecondary}>Player</Text>
            </Text>
          </View>
          <Text style={[styles.subtitle, { color: colors.accent }]}>
            {profiles.length > 0 ? 'Add New Provider' : 'Welcome'}
          </Text>

          {/* Type Selector */}
          <View
            style={[
              styles.typeSelector,
              isCompactLayout && styles.typeSelectorCompact,
              { backgroundColor: colors.surface, borderColor: colors.divider },
            ]}
            accessibilityRole="tablist"
          >
            <TouchableOpacity
              style={[styles.typeButton, isCompactLayout && styles.typeButtonCompact, type === 'xtream' && { backgroundColor: colors.primary }]}
              onPress={() => setType('xtream')}
              accessibilityRole="tab"
              accessibilityState={{ selected: type === 'xtream' }}
              accessibilityLabel="Select Xtream Codes type"
            >
              <Text style={[styles.typeText, { color: type === 'xtream' ? '#FFF' : colors.text }]}>Xtream Codes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeButton, isCompactLayout && styles.typeButtonCompact, type === 'm3u' && { backgroundColor: colors.primary }]}
              onPress={() => setType('m3u')}
              accessibilityRole="tab"
              accessibilityState={{ selected: type === 'm3u' }}
              accessibilityLabel="Select M3U Playlist type"
            >
              <Text style={[styles.typeText, { color: type === 'm3u' ? '#FFF' : colors.text }]}>M3U Playlist</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeButton, isCompactLayout && styles.typeButtonCompact, type === 'quickshare' && { backgroundColor: colors.primary }]}
              onPress={() => setType('quickshare')}
              accessibilityRole="tab"
              accessibilityState={{ selected: type === 'quickshare' }}
              accessibilityLabel="Select Quickshare by IPTV-Manager type"
            >
              <Text style={[styles.typeText, { color: type === 'quickshare' ? '#FFF' : colors.text }]}>Quickshare by IPTV-Manager</Text>
            </TouchableOpacity>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={{ width: '100%', marginBottom: 12 }}>
             <Text style={[styles.inputLabel, { color: colors.text }]}>Select Icon:</Text>
             <View style={styles.iconContainer}>
               {predefinedIcons.map((iconName) => (
                 <TouchableOpacity
                   key={iconName}
                   style={[
                     styles.iconWrapper,
                     { borderColor: colors.divider, backgroundColor: colors.surface },
                     selectedIcon === iconName && { backgroundColor: colors.primaryLight, borderColor: colors.primary }
                   ]}
                   onPress={() => setSelectedIcon(iconName)}
                   accessibilityRole="button"
                   accessibilityState={{ selected: selectedIcon === iconName }}
                   accessibilityLabel={`Select ${iconName.replace('_', ' ')} icon`}
                 >
                   <Icon name={iconName.replace('_', '-') as any} size={24} color={selectedIcon === iconName ? colors.primary : colors.textSecondary} />
                 </TouchableOpacity>
               ))}
             </View>
          </View>

          {/* Inputs */}
          <ThemedTextInput
            style={styles.input}
            backgroundColor={colors.surface}
            borderColor={colors.divider}
            focusedBorderColor={colors.primary}
            textColor={colors.text}
            placeholder="Provider Name"
            placeholderTextColor='#888888'
            selectionColor={colors.primary}
            keyboardAppearance={isAppleTV ? "light" : "default"}
            accessibilityLabel="Provider Name"
            value={name}
            onChangeText={setName}
            autoFocus={!Platform.isTV && Platform.OS === 'android'}
          />
          <ThemedTextInput
            style={styles.input}
            backgroundColor={colors.surface}
            borderColor={colors.divider}
            focusedBorderColor={colors.primary}
            textColor={colors.text}
            placeholder={type === 'xtream' ? "Server URL (http://...)" : type === 'quickshare' ? "Quickshare URL (https://.../share/...)" : "M3U Playlist URL"}
            placeholderTextColor='#888888'
            selectionColor={colors.primary}
            keyboardAppearance={isAppleTV ? "light" : "default"}
            accessibilityLabel={type === 'xtream' ? "Server URL" : type === 'quickshare' ? "Quickshare URL" : "M3U Playlist URL"}
            value={serverUrl}
            onChangeText={setServerUrl}
            keyboardType="url"
            autoCapitalize="none"
            autoCorrect={false}
          />

          {type === 'xtream' ? (
            <>
              <ThemedTextInput
                style={styles.input}
                backgroundColor={colors.surface}
                borderColor={colors.divider}
                focusedBorderColor={colors.primary}
                textColor={colors.text}
                placeholder="Username"
                placeholderTextColor='#888888'
                selectionColor={colors.primary}
            keyboardAppearance={isAppleTV ? "light" : "default"}
                accessibilityLabel="Username"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <ThemedTextInput
                style={styles.input}
                backgroundColor={colors.surface}
                borderColor={colors.divider}
                focusedBorderColor={colors.primary}
                textColor={colors.text}
                placeholder="Password"
                placeholderTextColor='#888888'
                selectionColor={colors.primary}
            keyboardAppearance={isAppleTV ? "light" : "default"}
                accessibilityLabel="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </>
          ) : type === 'm3u' ? (
            <ThemedTextInput
              style={styles.input}
              backgroundColor={colors.surface}
              borderColor={colors.divider}
              focusedBorderColor={colors.primary}
              textColor={colors.text}
              placeholder="XMLTV EPG URL (Optional)"
              placeholderTextColor='#888888'
              selectionColor={colors.primary}
            keyboardAppearance={isAppleTV ? "light" : "default"}
              accessibilityLabel="XMLTV EPG URL"
              value={epgUrl}
              onChangeText={setEpgUrl}
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
            />
          ) : null}

          {/* Login Button */}
          <ThemedButton
            style={styles.loginButton}
            backgroundColor={colors.primary}
            label={loading ? 'Adding...' : 'Add Provider'}
            onPress={handleLogin}
            disabled={loading}
            accessibilityLabel="Add Provider"
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  // If profiles exist and we're not showing the add form, show the profile list
  if (profiles.length > 0 && !showAddForm) {
    return (
      <View style={[styles.container, { backgroundColor: welcomeBackgroundColor }]}>
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}
        {renderExistingProfiles()}
      </View>
    );
  }

  // Otherwise show the add form
  return renderAddForm();
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  profilesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  card: {
    width: '100%',
    maxWidth: 520,
    borderRadius: radii.xl,
    padding: spacing.xxxl,
    borderWidth: effects.subtleBorderWidth,
    alignItems: 'center',
    // Modern shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 8,
  },
  appLogo: {
    width: 136,
    height: 112,
    marginBottom: -10,
  },
  wordmark: {
    width: '100%',
    minHeight: 72,
    marginBottom: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wordmarkText: {
    width: '100%',
    fontSize: Platform.isTV ? 66 : 42,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: Platform.isTV ? 72 : 46,
    textAlign: 'center',
  },
  wordmarkPrimary: {
    color: '#EB6C2A',
  },
  wordmarkSecondary: {
    color: '#FFFFFF',
  },
  subtitle: {
    ...typography.body,
    marginBottom: spacing.xxl + 4,
    textAlign: 'center',
    opacity: 0.7,
  },
  currentProviderText: {
    ...typography.caption,
    marginTop: -18,
    marginBottom: spacing.lg + 2,
    opacity: 0.75,
    textAlign: 'center',
  },
  typeSelector: {
    flexDirection: 'row',
    borderRadius: radii.lg,
    padding: spacing.xs,
    marginBottom: spacing.xxl,
    width: '100%',
    borderWidth: 1,
  },

  typeSelectorCompact: {
    flexDirection: 'column',
    gap: spacing.xs,
  },
  typeButton: {
    flex: 1,
    paddingVertical: spacing.md + 2,
    borderRadius: radii.md,
    alignItems: 'center',
  },

  typeButtonCompact: {
    width: '100%',
  },
  typeText: {
    ...typography.body,
    fontSize: 15,
    fontWeight: '600',
  },
  input: {
    width: '100%',
    paddingHorizontal: Platform.isTV ? 18 : 16,
    paddingVertical: Platform.isTV ? 14 : 12,
    borderRadius: radii.lg - 2,
    marginBottom: spacing.md + 2,
    fontSize: Platform.isTV ? 20 : 16,
    lineHeight: Platform.isTV ? 24 : 22,
    minHeight: Platform.isTV ? 64 : 52,
    borderWidth: 1.5,
  },
  loginButton: {
    width: '100%',
    paddingVertical: spacing.lg,
    borderRadius: radii.lg - 2,
    alignItems: 'center',
    marginTop: spacing.md,
    // Button shadow for depth
    shadowColor: '#E9692A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
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
    marginBottom: spacing.sm + 2,
    fontSize: 14,
    fontWeight: '500',
  },
  iconContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm + 2,
    width: '100%',
  },
  iconWrapper: {
    padding: spacing.sm + 2,
    borderRadius: radii.lg - 2,
    borderWidth: 1.5,
  },
  profileTile: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    width: '100%',
    maxWidth: 400,
  },
  profileIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(233, 105, 42, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
  },
  profileType: {
    fontSize: 13,
    marginTop: 2,
  },
  profileChannels: {
    fontSize: 12,
    marginTop: 2,
    opacity: 0.7,
  },
  addNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    marginTop: 20,
    gap: 8,
  },
  backToList: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  backToListText: {
    fontSize: 15,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
});

export default WelcomeScreen;
