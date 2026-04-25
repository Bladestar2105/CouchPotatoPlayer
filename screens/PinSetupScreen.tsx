import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Text, Alert, Platform, KeyboardAvoidingView, ScrollView } from 'react-native';
import { useIPTVParental } from '../context/IPTVContext';
import bcrypt from 'bcryptjs';
import { useTheme } from '../context/ThemeContext';
import { colors, radii, spacing, typography } from '../theme/tokens';
import { FocusableButton } from '../components/Focusable';
import ThemedTextInput from '../components/ui/ThemedTextInput';
import { useTranslation } from 'react-i18next';
import { Shield } from 'lucide-react-native';

const PinSetupScreen = () => {
  const { pin, setPinCode, unlockAdultContent, isAdultUnlocked, lockAdultContent } = useIPTVParental();
  const { accent } = useTheme();
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState('');
  const [confirmValue, setConfirmValue] = useState('');
  const [setupMode, setSetupMode] = useState(!pin);

  const [unlockMode, setUnlockMode] = useState(!!pin && !isAdultUnlocked);
  const inputValueRef = useRef('');
  const confirmValueRef = useRef('');

  useEffect(() => {
    setSetupMode(!pin);
    setUnlockMode(!!pin && !isAdultUnlocked);
  }, [pin, isAdultUnlocked]);

  const handleAction = async () => {
    const isStrict4Digits = (val: string) => /^\d{4}$/.test(val);
    const input = inputValueRef.current;
    const confirm = confirmValueRef.current;

    if (setupMode) {
      if (!isStrict4Digits(input)) {
        Alert.alert(t('error'), t('pin.error.exactDigits'));
        return;
      }
      if (input !== confirm) {
        Alert.alert(t('error'), t('pin.error.mismatch'));
        return;
      }
      await setPinCode(input);
      setInputValue('');
      setConfirmValue('');
      inputValueRef.current = '';
      confirmValueRef.current = '';
      setSetupMode(false);
      setUnlockMode(false);
      Alert.alert(t('success'), t('pin.success.configured'));
    } else if (unlockMode) {
      const unlocked = unlockAdultContent(input);
      if (unlocked) {
        Alert.alert(t('success'), t('pin.success.adultUnlockedSession'));
        setInputValue('');
        inputValueRef.current = '';
        setUnlockMode(false);
      } else {
        Alert.alert(t('error'), t('pin.error.incorrect'));
      }
    } else {
      if (pin && !bcrypt.compareSync(input, pin)) {
        Alert.alert(t('error'), t('pin.error.incorrect'));
        return;
      }

      if (confirm.length === 0) {
        await setPinCode(null);
        lockAdultContent();
        setSetupMode(true);
        setUnlockMode(false);
        setInputValue('');
        setConfirmValue('');
        inputValueRef.current = '';
        confirmValueRef.current = '';
        Alert.alert(t('success'), t('pin.success.removed'));
      } else {
        if (!isStrict4Digits(confirm)) {
          Alert.alert(t('error'), t('pin.error.newExactDigits'));
          return;
        }
        await setPinCode(confirm);
        setInputValue('');
        setConfirmValue('');
        inputValueRef.current = '';
        confirmValueRef.current = '';
        Alert.alert(t('success'), t('pin.success.updated'));
      }
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? spacing.xl : 0}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={[styles.shieldPlate, { backgroundColor: `${accent}1F`, borderColor: accent }]}>
            <Shield size={28} color={accent} />
          </View>

          <Text style={styles.title}>
            {setupMode ? t('pin.title.setup') : unlockMode ? t('pin.title.unlockAdult') : t('pin.title.manage')}
          </Text>

          <Text style={styles.subtitle}>
            {setupMode
              ? t('pin.subtitle.setup')
              : unlockMode
                ? t('pin.subtitle.unlockAdult')
                : t('pin.subtitle.manage')}
          </Text>

          <ThemedTextInput
            backgroundColor={colors.sunken}
            borderColor={colors.border}
            focusedBorderColor={accent}
            textColor={colors.text}
            keyboardType="number-pad"
            inputMode="numeric"
            secureTextEntry
            maxLength={4}
            value={inputValue}
            onChangeText={(text) => {
              const sanitized = text.replace(/[^0-9]/g, '');
              inputValueRef.current = sanitized;
              setInputValue(sanitized);
            }}
            placeholder={setupMode ? t('pin.new') : unlockMode ? t('pin.code') : t('pin.current')}
            placeholderTextColor={colors.textMuted}
            selectionColor={accent}
            accessibilityLabel={setupMode ? t('pin.new') : unlockMode ? t('pin.code') : t('pin.current')}
            tvFocusable={true}
            autoFocus={!Platform.isTV}
            style={styles.pinInput}
          />

          {!unlockMode && (
            <ThemedTextInput
              backgroundColor={colors.sunken}
              borderColor={colors.border}
              focusedBorderColor={accent}
              textColor={colors.text}
              keyboardType="number-pad"
              inputMode="numeric"
              secureTextEntry
              maxLength={4}
              value={confirmValue}
              onChangeText={(text) => {
                const sanitized = text.replace(/[^0-9]/g, '');
                confirmValueRef.current = sanitized;
                setConfirmValue(sanitized);
              }}
              placeholder={setupMode ? t('pin.confirm') : t('pin.newOptional')}
              placeholderTextColor={colors.textMuted}
              selectionColor={accent}
              accessibilityLabel={setupMode ? t('pin.confirm') : t('pin.newOptional')}
              tvFocusable={true}
              style={styles.pinInput}
            />
          )}

          <FocusableButton
            variant="primary"
            label={unlockMode ? t('unlock') : t('save')}
            onPress={handleAction}
            fullWidth
            accessibilityLabel={unlockMode ? t('pin.a11y.unlockAdult') : t('pin.a11y.savePin')}
            style={styles.primaryButton}
          />

          {!setupMode && !unlockMode && isAdultUnlocked && (
            <FocusableButton
              variant="ghost"
              label={t('pin.lockAdultContent')}
              onPress={() => {
                lockAdultContent();
                setUnlockMode(true);
                Alert.alert(t('success'), t('pin.success.adultLocked'));
              }}
              fullWidth
              style={styles.secondaryButton}
              accessibilityLabel={t('pin.a11y.lockAdult')}
            />
          )}

          {!setupMode && unlockMode && (
            <FocusableButton
              variant="ghost"
              label={t('pin.manageSettings')}
              onPress={() => setUnlockMode(false)}
              fullWidth
              style={styles.secondaryButton}
              accessibilityLabel={t('pin.a11y.manageSettings')}
            />
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxxl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xxl,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: spacing.xxl,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 480,
    alignItems: 'stretch',
  },
  shieldPlate: {
    alignSelf: 'center',
    width: 56,
    height: 56,
    borderRadius: radii.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.headline,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textDim,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  pinInput: {
    textAlign: 'center',
    letterSpacing: 8,
    fontSize: 22,
    fontWeight: '700',
    borderRadius: radii.md,
    marginBottom: spacing.md,
  },
  primaryButton: {
    marginTop: spacing.md,
  },
  secondaryButton: {
    marginTop: spacing.sm,
  },
});

export default PinSetupScreen;
