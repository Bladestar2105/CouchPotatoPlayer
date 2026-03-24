import React, { useState } from 'react';
import { View, StyleSheet, Text, TextInput, TouchableOpacity, Alert, Platform } from 'react-native';
import { useIPTV } from '../context/IPTVContext';

const PinSetupScreen = () => {
  const { pin, setPinCode, unlockAdultContent, isAdultUnlocked, lockAdultContent } = useIPTV();
  const [inputValue, setInputValue] = useState('');
  const [confirmValue, setConfirmValue] = useState('');
  const [setupMode, setSetupMode] = useState(!pin);

  const [unlockMode, setUnlockMode] = useState(!!pin && !isAdultUnlocked);

  const handleAction = async () => {
    if (setupMode) {
      if (inputValue.length !== 4) {
         Alert.alert('Error', 'The PIN code must be 4 digits.');
         return;
      }
      if (inputValue !== confirmValue) {
         Alert.alert('Error', 'PINs do not match.');
         return;
      }
      await setPinCode(inputValue);
      setInputValue('');
      setConfirmValue('');
      setSetupMode(false);
      setUnlockMode(false);
      Alert.alert('Success', 'PIN code configured successfully.');
    } else if (unlockMode) {
      // Unlock adult content for session
      const unlocked = unlockAdultContent(inputValue);
      if (unlocked) {
         Alert.alert('Success', 'Adult content unlocked for this session.');
         setInputValue('');
         setUnlockMode(false);
      } else {
         Alert.alert('Error', 'Incorrect PIN code.');
      }
    } else {
      // Manage existing PIN (Change or Remove)
      if (inputValue !== pin) {
         Alert.alert('Error', 'Incorrect PIN code.');
         return;
      }

      if (confirmValue.length === 0) {
         // Remove PIN
         await setPinCode(null);
         lockAdultContent(); // Reset adult lock if PIN is removed
         setSetupMode(true);
         setUnlockMode(false);
         setInputValue('');
         setConfirmValue('');
         Alert.alert('Success', 'PIN code removed.');
      } else {
         // Change PIN
         if (confirmValue.length !== 4) {
            Alert.alert('Error', 'New PIN must be 4 digits.');
            return;
         }
         await setPinCode(confirmValue);
         setInputValue('');
         setConfirmValue('');
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
        keyboardType="numeric"
        secureTextEntry
        maxLength={4}
        value={inputValue}
        onChangeText={setInputValue}
        placeholder={setupMode ? "New PIN" : unlockMode ? "PIN Code" : "Current PIN"}
        placeholderTextColor="#888"
        tvFocusable={true}
        autoFocus={!Platform.isTV}
      />

      {!unlockMode && (
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          secureTextEntry
          maxLength={4}
          value={confirmValue}
          onChangeText={setConfirmValue}
          placeholder={setupMode ? "Confirm PIN" : "New PIN (Optional)"}
          placeholderTextColor="#888"
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