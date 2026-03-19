import React, { useState } from 'react';
import { View, StyleSheet, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useIPTV } from '../context/IPTVContext';

const PinSetupScreen = () => {
  const { pin, setPinCode, unlockAdultContent, isAdultUnlocked, lockAdultContent } = useIPTV();
  const [inputValue, setInputValue] = useState('');
  const [setupMode, setSetupMode] = useState(!pin);

  const handleAction = async () => {
    if (setupMode) {
      if (inputValue.length < 4) {
         Alert.alert('Error', 'The PIN code must contain at least 4 digits.');
         return;
      }
      await setPinCode(inputValue);
      setInputValue('');
      setSetupMode(false);
      Alert.alert('Success', 'PIN code configured successfully.');
    } else {
       if (isAdultUnlocked) {
          lockAdultContent();
          Alert.alert('Success', 'Adult content locked.');
       } else {
          const unlocked = unlockAdultContent(inputValue);
          if (unlocked) {
             Alert.alert('Success', 'Adult content unlocked for this session.');
             setInputValue('');
          } else {
             Alert.alert('Error', 'Incorrect PIN code.');
          }
       }
    }
  };

  const handleClearPin = async () => {
     await setPinCode(null);
     setSetupMode(true);
     setInputValue('');
     Alert.alert('Success', 'PIN code removed.');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
         {setupMode ? 'Configure PIN Code' : isAdultUnlocked ? 'Adult Content Unlocked' : 'Enter PIN Code'}
      </Text>

      {!isAdultUnlocked && (
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          secureTextEntry
          maxLength={4}
          value={inputValue}
          onChangeText={setInputValue}
          placeholder={setupMode ? "New code (4 digits)" : "PIN Code"}
          placeholderTextColor="#888"
          autoFocus={true}
        />
      )}

      <TouchableOpacity style={styles.button} onPress={handleAction}>
        <Text style={styles.buttonText}>
           {setupMode ? 'Save' : isAdultUnlocked ? 'Lock' : 'Unlock'}
        </Text>
      </TouchableOpacity>

      {!setupMode && (
         <TouchableOpacity style={[styles.button, styles.clearButton]} onPress={handleClearPin}>
            <Text style={styles.buttonText}>Remove PIN Code</Text>
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
    marginBottom: 20,
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