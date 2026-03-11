import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '../store';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { isTV, isMobile } from '../utils/platform';
import { SafeAreaView } from 'react-native-safe-area-context';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'PinSetup'>;

export const PinSetupScreen = () => {
  const [pin, setPinValue] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');

  const setAppPin = useAppStore(state => state.setPin);
  const navigation = useNavigation<NavigationProp>();

  const handleSetup = () => {
    const trimmedPin = pin.trim();
    const trimmedConfirmPin = confirmPin.trim();

    if (!trimmedPin || !trimmedConfirmPin) {
      setError('Please enter and confirm your PIN');
      return;
    }

    if (trimmedPin.length < 4) {
      setError('PIN must be at least 4 digits');
      return;
    }

    if (trimmedPin !== trimmedConfirmPin) {
      setError('PINs do not match');
      return;
    }

    setAppPin(trimmedPin);
    // Navigate to the correct home based on platform
    if (isMobile) {
      navigation.replace('MainTabs');
    } else {
      navigation.replace('Home');
    }
  };

  const content = (
    <View style={[styles.card, isMobile && mStyles.card]}>
      <Text style={[styles.title, isMobile && mStyles.title]}>Set up a PIN</Text>
      <Text style={[styles.subtitle, isMobile && mStyles.subtitle]}>This PIN is needed to display adult categories, which are invisible by default.</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TextInput
        style={[styles.input, isMobile && mStyles.input]}
        placeholder="Enter PIN"
        placeholderTextColor="#888"
        value={pin}
        onChangeText={setPinValue}
        autoCapitalize="none"
        keyboardType="number-pad"
        secureTextEntry
        maxLength={8}
      />

      <TextInput
        style={[styles.input, isMobile && mStyles.input]}
        placeholder="Confirm PIN"
        placeholderTextColor="#888"
        value={confirmPin}
        onChangeText={setConfirmPin}
        autoCapitalize="none"
        keyboardType="number-pad"
        secureTextEntry
        maxLength={8}
      />

      <TouchableOpacity
        style={[styles.button, isMobile && mStyles.button]}
        onPress={handleSetup}
        activeOpacity={0.8}
        {...(isTV ? { hasTVPreferredFocus: true } : {})}
      >
        <Text style={[styles.buttonText, isMobile && mStyles.buttonText]}>Save PIN</Text>
      </TouchableOpacity>
    </View>
  );

  if (isMobile) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={mStyles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {content}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      {content}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 20,
    color: '#AAA',
    textAlign: 'center',
    marginBottom: 20,
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
  error: {
    color: '#FF453A',
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 16,
  }
});

const mStyles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  card: {
    padding: 24,
    borderRadius: 16,
    maxWidth: undefined,
    width: '100%',
  },
  title: {
    fontSize: 28,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    marginBottom: 16,
  },
  input: {
    padding: 14,
    fontSize: 16,
    marginBottom: 14,
  },
  button: {
    padding: 14,
    marginTop: 8,
  },
  buttonText: {
    fontSize: 17,
  },
});