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
         Alert.alert('Erreur', 'Le code PIN doit contenir au moins 4 chiffres.');
         return;
      }
      await setPinCode(inputValue);
      setInputValue('');
      setSetupMode(false);
      Alert.alert('Succès', 'Code PIN configuré avec succès.');
    } else {
       if (isAdultUnlocked) {
          lockAdultContent();
          Alert.alert('Succès', 'Contenu adulte verrouillé.');
       } else {
          const unlocked = unlockAdultContent(inputValue);
          if (unlocked) {
             Alert.alert('Succès', 'Contenu adulte déverrouillé pour cette session.');
             setInputValue('');
          } else {
             Alert.alert('Erreur', 'Code PIN incorrect.');
          }
       }
    }
  };

  const handleClearPin = async () => {
     await setPinCode(null);
     setSetupMode(true);
     setInputValue('');
     Alert.alert('Succès', 'Code PIN supprimé.');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
         {setupMode ? 'Configurer le Code PIN' : isAdultUnlocked ? 'Contenu Adulte Déverrouillé' : 'Saisir le Code PIN'}
      </Text>

      {!isAdultUnlocked && (
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          secureTextEntry
          maxLength={4}
          value={inputValue}
          onChangeText={setInputValue}
          placeholder={setupMode ? "Nouveau code (4 chiffres)" : "Code PIN"}
          placeholderTextColor="#888"
        />
      )}

      <TouchableOpacity style={styles.button} onPress={handleAction}>
        <Text style={styles.buttonText}>
           {setupMode ? 'Enregistrer' : isAdultUnlocked ? 'Verrouiller' : 'Déverrouiller'}
        </Text>
      </TouchableOpacity>

      {!setupMode && (
         <TouchableOpacity style={[styles.button, styles.clearButton]} onPress={handleClearPin}>
            <Text style={styles.buttonText}>Supprimer le Code PIN</Text>
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