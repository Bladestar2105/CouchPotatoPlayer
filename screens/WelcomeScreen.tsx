import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  FlatList,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIPTVProfiles } from '../context/IPTVContext';
import { useTheme } from '../context/ThemeContext';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { ChevronRight, ArrowLeft, ArrowRight, Check, Shield } from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Crypto from 'expo-crypto';
import { useTranslation } from 'react-i18next';
import BrandMark from '../components/BrandMark';
import { FocusableButton, FocusableCard } from '../components/Focusable';
import ThemedTextInput from '../components/ui/ThemedTextInput';
import { colors, radii, shadows, spacing, typography } from '../theme/tokens';

type ProviderType = 'xtream' | 'm3u' | 'quickshare';

const PREDEFINED_ICONS = [
  'tv', 'movie', 'star', 'public', 'dns', 'live-tv', 'sports-soccer', 'music-note', 'child-care', 'business',
] as const;

const PLATFORM_PILLS = ['iOS', 'iPadOS', 'tvOS', 'Android', 'Android TV', 'Web'];

const isTV = Platform.isTV;
const isAppleTV = isTV && Platform.OS === 'ios';

const WelcomeScreen = () => {
  const { addProfile, loadProfile, profiles, currentProfile } = useIPTVProfiles();
  const { accent, accentSoft } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const [type, setType] = useState<ProviderType>('xtream');
  const [name, setName] = useState('');
  const [serverUrl, setServerUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [epgUrl, setEpgUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedIcon, setSelectedIcon] = useState<string>('dns');
  const [showAddForm, setShowAddForm] = useState(profiles.length === 0 || route.params?.showAddForm === true);

  useEffect(() => {
    if (currentProfile && !route.params?.showAddForm) {
      navigation.replace('Home');
    }
  }, [currentProfile, navigation, route.params?.showAddForm]);

  const handleLogin = useCallback(async () => {
    const trimmedServerUrl = serverUrl.trim();
    if (!name || !trimmedServerUrl) {
      setError(t('welcome.errorRequired'));
      return;
    }
    if (!/^https?:\/\//i.test(trimmedServerUrl)) {
      setError(t('welcome.errorUrlScheme'));
      return;
    }
    const trimmedEpgUrl = epgUrl.trim();
    if (type === 'm3u' && trimmedEpgUrl && !/^https?:\/\//i.test(trimmedEpgUrl)) {
      setError(t('welcome.errorEpgScheme'));
      return;
    }
    if (type === 'xtream' && (!username || !password)) {
      setError(t('welcome.errorXtreamCreds'));
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
      if (route.params?.showAddForm && currentProfile) {
        navigation.goBack();
      } else {
        await loadProfile(newProfile);
      }
    } catch {
      setError(t('welcome.errorAddFailed'));
    } finally {
      setLoading(false);
    }
  }, [addProfile, currentProfile, epgUrl, loadProfile, name, navigation, password, route.params?.showAddForm, selectedIcon, serverUrl, t, type, username]);

  const handleLoadProfile = useCallback(async (profile: any) => {
    setLoading(true);
    try {
      await loadProfile(profile);
    } catch {
      setError(t('welcome.errorLoadFailed'));
    } finally {
      setLoading(false);
    }
  }, [loadProfile, t]);

  const providerTypes = useMemo<{ id: ProviderType; label: string }[]>(() => ([
    { id: 'xtream', label: 'Xtream Codes' },
    { id: 'm3u', label: 'M3U Playlist' },
    { id: 'quickshare', label: 'Quickshare by IPTV-Manager' },
  ]), []);

  const renderHeroIntro = () => (
    <>
      <BrandMark
        size={isTV ? 220 : 164}
        variant="character"
        style={[styles.heroLogo, shadows.modal]}
      />

      <Text
        style={styles.wordmark}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.55}
      >
        <Text style={styles.wordmarkPrimary}>CouchPotato</Text>
        <Text style={styles.wordmarkSecondary}>Player</Text>
      </Text>

      <Text style={styles.tagline}>{t('welcome.tagline')}</Text>
      <Text style={styles.description}>{t('welcome.description')}</Text>
    </>
  );

  const renderPlatformPills = () => (
    <View style={styles.platformPills}>
      {PLATFORM_PILLS.map((label) => (
        <View key={label} style={styles.platformPill}>
          <Text style={styles.platformPillText}>{label}</Text>
        </View>
      ))}
    </View>
  );

  const renderProfileItem = ({ item }: { item: any }) => {
    const iconName = (item.icon?.replace('_', '-') as any) || 'dns';
    return (
      <View style={styles.profileListItem}>
        <FocusableCard
          style={styles.profileCard}
          onSelect={() => handleLoadProfile(item)}
          accessibilityRole="button"
          accessibilityLabel={`Load ${item.name}`}
        >
          <View style={[styles.profileIconPlate, { backgroundColor: accentSoft }]}>
            <Icon name={iconName} size={26} color={accent} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.profileSubtitle} numberOfLines={1}>
              {item.type === 'xtream'
                ? 'Xtream Codes'
                : item.type === 'quickshare'
                  ? 'Quickshare'
                  : 'M3U Playlist'}
              {item.providerInfo?.channelsCount
                ? ` · ${t('welcome.channelsSuffix', { count: item.providerInfo.channelsCount })}`
                : ''}
            </Text>
          </View>
          <ChevronRight size={22} color={colors.textDim} />
        </FocusableCard>
      </View>
    );
  };

  const renderHeroHeader = () => (
    <>
      {renderHeroIntro()}
      <View style={styles.profilesBlock}>
        <Text style={[styles.sectionEyebrow, { color: accent }]}>
          {t('welcome.selectProfile')}
        </Text>
        {currentProfile?.name ? (
          <Text style={styles.currentProviderText} numberOfLines={1}>
            {t('welcome.currentProvider', { name: currentProfile.name })}
          </Text>
        ) : null}
      </View>
    </>
  );

  const renderHeroFooter = () => (
    <>
      <View style={styles.profileActionsBlock}>
        <FocusableButton
          variant="primary"
          label={t('welcome.addProvider')}
          onPress={() => setShowAddForm(true)}
          fullWidth
          style={styles.heroCta}
          trailing={<ArrowRight size={16} color="#FFF" />}
        />
      </View>
      {renderPlatformPills()}
    </>
  );

  const renderHeroWithProfiles = () => (
    <FlatList
      data={profiles}
      keyExtractor={(item) => item.id}
      renderItem={renderProfileItem}
      ListHeaderComponent={renderHeroHeader}
      ListFooterComponent={renderHeroFooter}
      contentContainerStyle={[styles.heroScroll, styles.profileVirtualListContent]}
      showsVerticalScrollIndicator={false}
    />
  );

  const renderHeroWithoutProfiles = () => (
    <ScrollView
      contentContainerStyle={styles.heroScroll}
      showsVerticalScrollIndicator={false}
    >
      {renderHeroIntro()}
      <View style={styles.ctaRow}>
        <FocusableButton
          variant="primary"
          label={t('welcome.getStarted')}
          onPress={() => setShowAddForm(true)}
          trailing={<ArrowRight size={16} color="#FFF" />}
        />
      </View>
      {renderPlatformPills()}
    </ScrollView>
  );

  const renderHero = () => (
    <View style={[styles.heroRoot, { paddingTop: insets.top + spacing.xxxl, paddingBottom: insets.bottom + spacing.xxl }]}>
      {/* Radial glow layers — approximates the spec's radial gradient on pure RN */}
      <View pointerEvents="none" style={styles.glowLayer}>
        <View style={[styles.glowOrb, styles.glowOrbTopLeft, { backgroundColor: 'rgba(232, 93, 28, 0.25)' }]} />
        <View style={[styles.glowOrb, styles.glowOrbBottomRight, { backgroundColor: `${accent}33` }]} />
      </View>

      {profiles.length > 0 ? renderHeroWithProfiles() : renderHeroWithoutProfiles()}
    </View>
  );

  const renderAddForm = () => (
    <KeyboardAvoidingView
      style={styles.formRoot}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.formScroll, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xxl }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formCard}>
          <View style={styles.formHeaderRow}>
            {profiles.length > 0 ? (
              <Pressable
                style={styles.backChip}
                onPress={() => setShowAddForm(false)}
                accessibilityRole="button"
                accessibilityLabel={t('welcome.backToProviders')}
              >
                <ArrowLeft size={18} color={colors.text} />
                <Text style={styles.backChipText}>{t('welcome.backToProviders')}</Text>
              </Pressable>
            ) : <View />}
            <BrandMark size={44} />
          </View>

          <Text style={[styles.sectionEyebrow, { color: accent }]}>{t('welcome.onboardingEyebrow')}</Text>
          <Text style={styles.formTitle}>{t('welcome.onboardingTitle')}</Text>
          <View style={styles.formSubtitleRow}>
            <Shield size={14} color={colors.textDim} />
            <Text style={styles.formSubtitle}>{t('welcome.onboardingSubtitle')}</Text>
          </View>

          {/* Type selector */}
          <View style={styles.segmented} accessibilityRole="tablist">
            {providerTypes.map((pt) => {
              const selected = type === pt.id;
              return (
                <Pressable
                  key={pt.id}
                  onPress={() => setType(pt.id)}
                  style={[
                    styles.segmentedItem,
                    selected && { backgroundColor: accent },
                  ]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  accessibilityLabel={pt.label}
                >
                  <Text style={[
                    styles.segmentedItemText,
                    { color: selected ? '#FFF' : colors.textDim },
                  ]}>
                    {pt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Fields */}
          <Field label={t('welcome.providerName')}>
            <ThemedTextInput
              backgroundColor={colors.sunken}
              borderColor={colors.border}
              focusedBorderColor={accent}
              textColor={colors.text}
              placeholder={t('welcome.providerName')}
              placeholderTextColor={colors.textMuted}
              selectionColor={accent}
              keyboardAppearance={isAppleTV ? 'light' : 'default'}
              accessibilityLabel={t('welcome.providerName')}
              value={name}
              onChangeText={setName}
              style={styles.textInput}
              autoFocus={!isTV && Platform.OS === 'android'}
            />
          </Field>

          <Field label={type === 'xtream'
            ? t('welcome.serverUrl')
            : type === 'quickshare'
              ? t('welcome.quickshareUrl')
              : t('welcome.m3uUrl')}>
            <ThemedTextInput
              backgroundColor={colors.sunken}
              borderColor={colors.border}
              focusedBorderColor={accent}
              textColor={colors.text}
              placeholder={type === 'xtream' ? 'http://example.com:8080' : 'https://…'}
              placeholderTextColor={colors.textMuted}
              selectionColor={accent}
              keyboardAppearance={isAppleTV ? 'light' : 'default'}
              accessibilityLabel={t('welcome.serverUrl')}
              value={serverUrl}
              onChangeText={setServerUrl}
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.textInput}
            />
          </Field>

          {type === 'xtream' ? (
            <>
              <Field label="Username">
                <ThemedTextInput
                  backgroundColor={colors.sunken}
                  borderColor={colors.border}
                  focusedBorderColor={accent}
                  textColor={colors.text}
                  placeholder="Username"
                  placeholderTextColor={colors.textMuted}
                  selectionColor={accent}
                  keyboardAppearance={isAppleTV ? 'light' : 'default'}
                  accessibilityLabel="Username"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.textInput}
                />
              </Field>
              <Field label="Password">
                <ThemedTextInput
                  backgroundColor={colors.sunken}
                  borderColor={colors.border}
                  focusedBorderColor={accent}
                  textColor={colors.text}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textMuted}
                  selectionColor={accent}
                  keyboardAppearance={isAppleTV ? 'light' : 'default'}
                  accessibilityLabel="Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  style={styles.textInput}
                />
              </Field>
            </>
          ) : type === 'm3u' ? (
            <Field label={t('welcome.epgUrlOptional')}>
              <ThemedTextInput
                backgroundColor={colors.sunken}
                borderColor={colors.border}
                focusedBorderColor={accent}
                textColor={colors.text}
                placeholder="https://…"
                placeholderTextColor={colors.textMuted}
                selectionColor={accent}
                keyboardAppearance={isAppleTV ? 'light' : 'default'}
                accessibilityLabel={t('welcome.epgUrlOptional')}
                value={epgUrl}
                onChangeText={setEpgUrl}
                keyboardType="url"
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.textInput}
              />
            </Field>
          ) : null}

          {/* Icon picker */}
          <Text style={styles.iconPickerLabel}>{t('welcome.selectIcon')}</Text>
          <View style={styles.iconGrid}>
            {PREDEFINED_ICONS.map((iconName) => {
              const isSelected = selectedIcon === iconName;
              return (
                <Pressable
                  key={iconName}
                  onPress={() => setSelectedIcon(iconName)}
                  style={[
                    styles.iconTile,
                    isSelected && { backgroundColor: accentSoft, borderColor: accent },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={iconName.replace('_', ' ')}
                >
                  <Icon
                    name={iconName.replace('_', '-') as any}
                    size={22}
                    color={isSelected ? accent : colors.textDim}
                  />
                  {isSelected ? (
                    <View style={[styles.iconTileCheck, { backgroundColor: accent }]}>
                      <Check size={10} color="#FFF" strokeWidth={3} />
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>

          <FocusableButton
            variant="primary"
            label={loading ? t('welcome.adding') : t('welcome.addAction')}
            onPress={handleLogin}
            disabled={loading}
            fullWidth
            style={styles.submitButton}
            trailing={<ArrowRight size={16} color="#FFF" />}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  if (profiles.length > 0 && !showAddForm) {
    return (
      <View style={styles.root}>
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={accent} />
          </View>
        )}
        {renderHero()}
      </View>
    );
  }

  if (!showAddForm) {
    return (
      <View style={styles.root}>
        {renderHero()}
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={accent} />
        </View>
      )}
      {renderAddForm()}
    </View>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <View style={styles.field}>
    <Text style={styles.fieldLabel}>{label}</Text>
    {children}
  </View>
);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.scrim80,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },

  // Hero (profile selector + first-run intro)
  heroRoot: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  glowLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  glowOrb: {
    position: 'absolute',
    width: 520,
    height: 520,
    borderRadius: 260,
    opacity: 0.8,
  },
  glowOrbTopLeft: {
    top: -200,
    left: -180,
  },
  glowOrbBottomRight: {
    bottom: -240,
    right: -200,
  },
  heroScroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.xxl,
  },
  heroLogo: {
    marginBottom: spacing.lg,
  },
  wordmark: {
    width: '100%',
    maxWidth: 520,
    fontSize: isTV ? 56 : 40,
    fontWeight: '900',
    letterSpacing: -1.2,
    lineHeight: isTV ? 60 : 44,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  wordmarkPrimary: {
    color: colors.brandOrange,
  },
  wordmarkSecondary: {
    color: colors.text,
  },
  tagline: {
    ...typography.headline,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  description: {
    ...typography.body,
    color: colors.textDim,
    textAlign: 'center',
    maxWidth: 520,
    marginBottom: spacing.xxl,
  },
  sectionEyebrow: {
    ...typography.eyebrow,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  currentProviderText: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  profilesBlock: {
    width: '100%',
    maxWidth: 520,
    alignItems: 'stretch',
  },
  profileVirtualListContent: {
    width: '100%',
    alignItems: 'center',
  },
  profileListItem: {
    width: '100%',
    maxWidth: 520,
  },
  profileActionsBlock: {
    width: '100%',
    maxWidth: 520,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
    marginBottom: spacing.sm + 2,
  },
  profileIconPlate: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    ...typography.subtitle,
    color: colors.text,
  },
  profileSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  heroCta: {
    alignSelf: 'stretch',
    marginTop: spacing.lg,
  },
  ctaRow: {
    marginTop: spacing.md,
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  platformPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.xxl + spacing.sm,
  },
  platformPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
  },
  platformPillText: {
    ...typography.eyebrow,
    color: colors.textMuted,
    fontSize: 10,
  },

  // Add form (onboarding)
  formRoot: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  formScroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.xxl,
    alignItems: 'center',
  },
  formCard: {
    width: '100%',
    maxWidth: 560,
    backgroundColor: colors.surface,
    borderRadius: radii.xxl,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: spacing.xxl,
    ...shadows.card,
  },
  formHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  backChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.sunken,
  },
  backChipText: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '600',
  },
  formTitle: {
    ...typography.headline,
    color: colors.text,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  formSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  formSubtitle: {
    ...typography.caption,
    color: colors.textDim,
    flexShrink: 1,
  },

  segmented: {
    flexDirection: isTV ? 'row' : 'column',
    backgroundColor: colors.sunken,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: spacing.xs,
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  segmentedItem: {
    flex: isTV ? 1 : undefined,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentedItemText: {
    ...typography.caption,
    fontWeight: '700',
    fontSize: 13,
  },

  field: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    ...typography.caption,
    color: colors.textDim,
    fontWeight: '600',
    marginBottom: spacing.xs + 2,
  },
  textInput: {
    textAlign: 'left',
    paddingHorizontal: spacing.lg,
    paddingVertical: isTV ? spacing.md + 2 : spacing.md,
    borderRadius: radii.md,
    fontSize: isTV ? 18 : 15,
    minHeight: isTV ? 60 : 50,
    marginBottom: 0,
  },

  iconPickerLabel: {
    ...typography.caption,
    color: colors.textDim,
    fontWeight: '600',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  iconTile: {
    width: 52,
    height: 52,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.sunken,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconTileCheck: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },

  errorBanner: {
    backgroundColor: 'rgba(255,69,58,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,69,58,0.45)',
    borderRadius: radii.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.caption,
    color: colors.danger,
  },

  submitButton: {
    marginTop: spacing.md,
  },
});

export default WelcomeScreen;
