import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '../store';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { ArrowLeft } from 'lucide-react-native';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Settings'>;

export const SettingsScreen = () => {
  const pin = useAppStore(state => state.pin);
  const showAdult = useAppStore(state => state.showAdult);
  const setAppPin = useAppStore(state => state.setPin);
  const setShowAdult = useAppStore(state => state.setShowAdult);

  const [enteredPin, setEnteredPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [unlockAdult, setUnlockAdult] = useState(false);
  const [changingPin, setChangingPin] = useState(false);

  const navigation = useNavigation<NavigationProp>();

  const handleToggleAdult = () => {
    if (showAdult) {
      setShowAdult(false);
      setSuccess('Adult categories hidden.');
      setUnlockAdult(false);
      setEnteredPin('');
    } else {
      setUnlockAdult(true);
      setChangingPin(false);
      setError('');
      setSuccess('');
    }
  };

  const handleUnlockAdultSubmit = () => {
    if (enteredPin === pin) {
      setShowAdult(true);
      setUnlockAdult(false);
      setEnteredPin('');
      setSuccess('Adult categories are now visible.');
      setError('');
    } else {
      setError('Incorrect PIN');
    }
  };

  const handleChangePin = () => {
    setChangingPin(true);
    setUnlockAdult(false);
    setError('');
    setSuccess('');
    setEnteredPin('');
  };

  const handleChangePinSubmit = () => {
    if (enteredPin !== pin) {
      setError('Current PIN is incorrect');
      return;
    }

    if (!newPin || !confirmPin) {
      setError('Please enter new PIN and confirm it');
      return;
    }

    if (newPin.length < 4) {
      setError('New PIN must be at least 4 digits');
      return;
    }

    if (newPin !== confirmPin) {
      setError('New PINs do not match');
      return;
    }

    setAppPin(newPin);
    setChangingPin(false);
    setEnteredPin('');
    setNewPin('');
    setConfirmPin('');
    setSuccess('PIN changed successfully.');
    setError('');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hasTVPreferredFocus
        >
          <ArrowLeft color="#FFF" size={24} />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
      </View>

      <View style={styles.card}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {success ? <Text style={styles.success}>{success}</Text> : null}

        {!unlockAdult && !changingPin && (
          <>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleToggleAdult}
            >
              <Text style={styles.menuItemText}>
                {showAdult ? 'Hide Adult Categories' : 'Show Adult Categories'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleChangePin}
            >
              <Text style={styles.menuItemText}>Change PIN</Text>
            </TouchableOpacity>
          </>
        )}

        {unlockAdult && (
          <View>
            <Text style={styles.subtitle}>Enter PIN to show adult categories:</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter PIN"
              placeholderTextColor="#888"
              value={enteredPin}
              onChangeText={setEnteredPin}
              autoCapitalize="none"
              keyboardType="number-pad"
              secureTextEntry
              maxLength={8}
            />
            <TouchableOpacity style={styles.button} onPress={handleUnlockAdultSubmit}>
              <Text style={styles.buttonText}>Submit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={() => { setUnlockAdult(false); setError(''); }}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {changingPin && (
          <View>
            <Text style={styles.subtitle}>Change your PIN:</Text>
            <TextInput
              style={styles.input}
              placeholder="Current PIN"
              placeholderTextColor="#888"
              value={enteredPin}
              onChangeText={setEnteredPin}
              autoCapitalize="none"
              keyboardType="number-pad"
              secureTextEntry
              maxLength={8}
            />
            <TextInput
              style={styles.input}
              placeholder="New PIN"
              placeholderTextColor="#888"
              value={newPin}
              onChangeText={setNewPin}
              autoCapitalize="none"
              keyboardType="number-pad"
              secureTextEntry
              maxLength={8}
            />
            <TextInput
              style={styles.input}
              placeholder="Confirm New PIN"
              placeholderTextColor="#888"
              value={confirmPin}
              onChangeText={setConfirmPin}
              autoCapitalize="none"
              keyboardType="number-pad"
              secureTextEntry
              maxLength={8}
            />
            <TouchableOpacity style={styles.button} onPress={handleChangePinSubmit}>
              <Text style={styles.buttonText}>Save New PIN</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={() => { setChangingPin(false); setError(''); }}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    padding: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#3C3C3E',
  },
  backButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFF',
    marginLeft: 30,
  },
  card: {
    backgroundColor: '#1C1C1E',
    padding: 40,
    borderRadius: 20,
    width: '100%',
    maxWidth: 600,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
    alignSelf: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#AAA',
    marginBottom: 20,
  },
  menuItem: {
    backgroundColor: '#2C2C2E',
    padding: 20,
    borderRadius: 10,
    marginBottom: 15,
  },
  menuItemText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
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
    textAlign: 'center',
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
  cancelButton: {
    backgroundColor: '#3C3C3E',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  cancelButtonText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  error: {
    color: '#FF453A',
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 16,
  },
  success: {
    color: '#32D74B',
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 16,
  }
});
