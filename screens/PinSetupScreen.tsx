import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Text, Alert, Platform, KeyboardAvoidingView, ScrollView } from 'react-native';
import { useIPTVParental } from '../context/IPTVContext';
import bcrypt from 'bcryptjs';
import { useSettings } from '../context/SettingsContext';
import { spacing, typography } from '../theme/tokens';
import ThemedButton from '../components/ui/ThemedButton';
import ThemedTextInput from '../components/ui/ThemedTextInput';
import { useTranslation } from 'react-i18next';

const PinSetupScreen = () => {
  const { pin, setPinCode, unlockAdultContent, isAdultUnlocked, lockAdultContent } = useIPTVParental();
  const { colors } = useSettings();
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
      // Unlock adult content for session
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
      // Manage existing PIN (Change or Remove)
      if (pin && !bcrypt.compareSync(input, pin)) {
         Alert.alert(t('error'), t('pin.error.incorrect'));
         return;
      }

      if (confirm.length === 0) {
         // Remove PIN
         await setPinCode(null);
         lockAdultContent(); // Reset adult lock if PIN is removed
         setSetupMode(true);
         setUnlockMode(false);
         setInputValue('');
         setConfirmValue('');
         inputValueRef.current = '';
         confirmValueRef.current = '';
         Alert.alert(t('success'), t('pin.success.removed'));
      } else {
         // Change PIN
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
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? spacing.xl : 0}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
      <Text style={[styles.title, { color: colors.text }]}>
         {setupMode ? t('pin.title.setup') : unlockMode ? t('pin.title.unlockAdult') : t('pin.title.manage')}
      </Text>

      <Text style={[styles.subtitle, { marginBottom: spacing.xl, color: colors.textSecondary }]}>
         {setupMode
            ? t('pin.subtitle.setup')
            : unlockMode
              ? t('pin.subtitle.unlockAdult')
              : t('pin.subtitle.manage')}
      </Text>

      <ThemedTextInput
        backgroundColor={colors.card}
        borderColor={colors.divider}
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
        placeholderTextColor="#888"
        accessibilityLabel={setupMode ? t('pin.new') : unlockMode ? t('pin.code') : t('pin.current')}
        tvFocusable={true}
        autoFocus={!Platform.isTV}
      />

      {!unlockMode && (
        <ThemedTextInput
          backgroundColor={colors.card}
          borderColor={colors.divider}
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
          placeholderTextColor="#888"
          accessibilityLabel={setupMode ? t('pin.confirm') : t('pin.newOptional')}
          tvFocusable={true}
        />
      )}

      <ThemedButton
        label={unlockMode ? t('unlock') : t('save')}
        backgroundColor={colors.primary}
        onPress={handleAction}
        accessibilityLabel={unlockMode ? t('pin.a11y.unlockAdult') : t('pin.a11y.savePin')}
      />

      {!setupMode && !unlockMode && isAdultUnlocked && (
        <ThemedButton
          label={t('pin.lockAdultContent')}
          style={[styles.clearButton, { marginTop: spacing.sm + 2 }]}
          backgroundColor={colors.surfaceSecondary}
          textColor={colors.text}
          onPress={() => {
             lockAdultContent();
             setUnlockMode(true);
             Alert.alert(t('success'), t('pin.success.adultLocked'));
          }}
          accessibilityLabel={t('pin.a11y.lockAdult')}
        />
      )}

      {!setupMode && unlockMode && (
        <ThemedButton
          label={t('pin.manageSettings')}
          style={[styles.clearButton, { marginTop: spacing.sm + 2 }]}
          backgroundColor={colors.surfaceSecondary}
          textColor={colors.text}
          onPress={() => {
             setUnlockMode(false);
          }}
          accessibilityLabel={t('pin.a11y.manageSettings')}
        />
      )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
    paddingBottom: spacing.xl * 2,
  },
  title: {
    ...typography.title,
    marginBottom: spacing.sm + 2,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.caption,
    fontSize: 14,
    textAlign: 'center',
  },
  clearButton: {
    marginTop: spacing.sm + 2,
  },
});

export default PinSetupScreen;
