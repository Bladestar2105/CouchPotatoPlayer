import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIPTVProfiles } from '../context/IPTVContext';
import { useSettings } from '../context/SettingsContext';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Crypto from 'expo-crypto';
import BrandMark from '../components/BrandMark';
import { colors as tokenColors, effects, radii, shadows, spacing, typography } from '../theme/tokens';
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
  const welcomeBackgroundColor = tokenColors.bg;
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
    <SafeAreaView edges={['top', 'bottom']} style={styles.profilesContainer}>
      <View pointerEvents="none" style={styles.glowLayer}>
        <View style={[styles.glowOrb, styles.glowOrbTopLeft]} />
        <View style={[styles.glowOrb, styles.glowOrbBottomRight, { backgroundColor: colors.primaryLight }]} />
      </View>
      <BrandMark
        size={Platform.isTV ? 220 : 164}
        variant="character"
        style={[styles.appLogo, shadows.modal]}
      />
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
      <Text style={[styles.subtitle, { color: colors.primary }]}>Select a Provider</Text>
      {currentProfile?.name ? (
        <Text style={[styles.currentProviderText, { color: colors.textSecondary }]} numberOfLines={1}>
          Current: {currentProfile.name}
        </Text>
      ) : null}

      <FlatList
        data={profiles}
        keyExtractor={(item) => item.id}
        style={styles.profileList}
        contentContainerStyle={styles.profileListContent}
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
    </SafeAreaView>
  );

  const renderAddForm = () => (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: welcomeBackgroundColor }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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

          <BrandMark size={Platform.isTV ? 156 : 124} variant="character" style={styles.appLogo} />
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
          <Text style={[styles.subtitle, { color: colors.primary }]}>
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
      </SafeAreaView>
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
    paddingHorizontal: spacing.xxl,
    paddingVertical: Platform.isTV ? spacing.huge : spacing.xxl,
  },
  profilesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    paddingVertical: Platform.isTV ? spacing.huge : spacing.xxl,
    backgroundColor: tokenColors.bg,
  },
  glowLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  glowOrb: {
    position: 'absolute',
    width: 520,
    height: 520,
    borderRadius: 260,
    opacity: 0.75,
    backgroundColor: 'rgba(232,93,28,0.18)',
  },
  glowOrbTopLeft: {
    top: -220,
    left: -180,
  },
  glowOrbBottomRight: {
    bottom: -240,
    right: -200,
  },
  card: {
    width: '100%',
    maxWidth: 520,
    borderRadius: radii.xxl,
    padding: spacing.xxxl,
    borderWidth: effects.subtleBorderWidth,
    alignItems: 'center',
    ...shadows.card,
  },
  appLogo: {
    marginBottom: spacing.lg,
  },
  wordmark: {
    width: '100%',
    marginBottom: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wordmarkText: {
    width: '100%',
    fontSize: Platform.isTV ? 56 : 40,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: Platform.isTV ? 60 : 44,
    textAlign: 'center',
  },
  wordmarkPrimary: {
    color: tokenColors.brandOrange,
  },
  wordmarkSecondary: {
    color: tokenColors.text,
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
    marginBottom: spacing.xl,
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
    borderRadius: radii.md,
    marginBottom: spacing.md + 2,
    fontSize: Platform.isTV ? 20 : 16,
    lineHeight: Platform.isTV ? 24 : 22,
    minHeight: Platform.isTV ? 64 : 52,
    borderWidth: 1.5,
  },
  loginButton: {
    width: '100%',
    paddingVertical: spacing.lg,
    borderRadius: radii.lg,
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
    borderRadius: radii.lg,
    borderWidth: 1,
    marginBottom: spacing.sm + 2,
    width: '100%',
    maxWidth: 520,
  },
  profileIconContainer: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: 'rgba(233, 105, 42, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  profileList: {
    width: '100%',
    maxWidth: 560,
    maxHeight: 320,
  },
  profileListContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
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
    borderRadius: radii.lg,
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
    backgroundColor: tokenColors.scrim80,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
});

export default WelcomeScreen;
