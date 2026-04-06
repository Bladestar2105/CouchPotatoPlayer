import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Text, TextInput, TouchableOpacity, Alert, Platform } from 'react-native';
import { useIPTV } from '../context/IPTVContext';
import bcrypt from 'bcryptjs';

const PinSetupScreen = () => {
  const { pin, setPinCode, unlockAdultContent, isAdultUnlocked, lockAdultContent } = useIPTV();
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
         Alert.alert('Error', 'The PIN code must be exactly 4 digits (0-9).');
         return;
      }
      if (input !== confirm) {
         Alert.alert('Error', 'PINs do not match.');
         return;
      }
      await setPinCode(input);
      setInputValue('');
      setConfirmValue('');
      inputValueRef.current = '';
      confirmValueRef.current = '';
      setSetupMode(false);
      setUnlockMode(false);
      Alert.alert('Success', 'PIN code configured successfully.');
    } else if (unlockMode) {
      // Unlock adult content for session
      const unlocked = unlockAdultContent(input);
      if (unlocked) {
         Alert.alert('Success', 'Adult content unlocked for this session.');
         setInputValue('');
         inputValueRef.current = '';
         setUnlockMode(false);
      } else {
         Alert.alert('Error', 'Incorrect PIN code.');
      }
    } else {
      // Manage existing PIN (Change or Remove)
      if (pin && !bcrypt.compareSync(input, pin)) {
         Alert.alert('Error', 'Incorrect PIN code.');
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
         Alert.alert('Success', 'PIN code removed.');
      } else {
         // Change PIN
         if (!isStrict4Digits(confirm)) {
            Alert.alert('Error', 'New PIN must be exactly 4 digits (0-9).');
            return;
         }
         await setPinCode(confirm);
         setInputValue('');
         setConfirmValue('');
         inputValueRef.current = '';
         confirmValueRef.current = '';
         Alert.alert('Success', 'PIN code updated successfully.');
      }
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
         {setupMode ? 'Set New PIN' : unlockMode ? 'Unlock Adult Content' : 'Manage PIN'}
      </Text>

      <Text style={[styles.subtitle, { marginBottom: 20 }]}>
         {setupMode
            ? 'Enter a 4-digit PIN to restrict adult content.'
            : unlockMode
              ? 'Enter your PIN to view adult content.'
              : 'Enter your current PIN to remove or change it. Leave new PIN empty to remove.'}
      </Text>

      <TextInput
        style={styles.input}
        keyboardType="number-pad"
        secureTextEntry
        maxLength={4}
        value={inputValue}
        onChangeText={(text) => {
          const sanitized = text.replace(/[^0-9]/g, '');
          inputValueRef.current = sanitized;
          setInputValue(sanitized);
        }}
        placeholder={setupMode ? "New PIN" : unlockMode ? "PIN Code" : "Current PIN"}
        placeholderTextColor="#888"
        accessibilityLabel={setupMode ? "New PIN" : unlockMode ? "PIN Code" : "Current PIN"}
        tvFocusable={true}
        autoFocus={!Platform.isTV}
      />

      {!unlockMode && (
        <TextInput
          style={styles.input}
          keyboardType="number-pad"
          secureTextEntry
          maxLength={4}
          value={confirmValue}
          onChangeText={(text) => {
            const sanitized = text.replace(/[^0-9]/g, '');
            confirmValueRef.current = sanitized;
            setConfirmValue(sanitized);
          }}
          placeholder={setupMode ? "Confirm PIN" : "New PIN (Optional)"}
          placeholderTextColor="#888"
          accessibilityLabel={setupMode ? "Confirm PIN" : "New PIN (Optional)"}
          tvFocusable={true}
        />
      )}

      <TouchableOpacity style={styles.button} onPress={handleAction}>
        <Text style={styles.buttonText}>
           {unlockMode ? 'Unlock' : 'Save'}
        </Text>
      </TouchableOpacity>

      {!setupMode && !unlockMode && isAdultUnlocked && (
        <TouchableOpacity style={[styles.button, styles.clearButton, { marginTop: 10 }]} onPress={() => {
           lockAdultContent();
           setUnlockMode(true);
           Alert.alert('Success', 'Adult content locked.');
        }}>
          <Text style={styles.buttonText}>Lock Adult Content</Text>
        </TouchableOpacity>
      )}

      {!setupMode && unlockMode && (
        <TouchableOpacity style={[styles.button, styles.clearButton, { marginTop: 10 }]} onPress={() => {
           setUnlockMode(false);
        }}>
          <Text style={styles.buttonText}>Manage PIN Settings</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#1E1E1E',
    color: '#FFF',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    textAlign: 'center',
    fontSize: 18,
    borderWidth: 1,
    borderColor: '#333',
  },
  button: {
    backgroundColor: '#E50914',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  clearButton: {
    marginTop: 10,
    backgroundColor: '#333',
  },
  buttonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  }
});

export default PinSetupScreen;
