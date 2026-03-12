import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, Animated } from 'react-native';
import { Lock, X, Shield } from 'lucide-react-native';
import { isMobile } from '../utils/platform';
import { useAppStore } from '../store';

interface ParentalLockProps {
  visible: boolean;
  onSuccess: () => void;
  onCancel: () => void;
  title?: string;
}

export const ParentalLock: React.FC<ParentalLockProps> = ({
  visible,
  onSuccess,
  onCancel,
  title = 'Parental Lock',
}) => {
  const [pin, setPin] = useState(['', '', '', '']);
  const [error, setError] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const storedPin = useAppStore(state => state.pin);

  useEffect(() => {
    if (visible) {
      setPin(['', '', '', '']);
      setError(false);
      setTimeout(() => inputRefs.current[0]?.focus(), 300);
    }
  }, [visible]);

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 15, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -15, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handlePinInput = (value: string, index: number) => {
    if (value.length > 1) return;
    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);
    setError(false);

    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    // Check PIN when all 4 digits entered
    if (value && index === 3) {
      const fullPin = newPin.join('');
      // Default PIN is 0000, or stored PIN from settings
      const correctPin = storedPin || '0000';
      if (fullPin === correctPin) {
        onSuccess();
      } else {
        setError(true);
        setAttempts(prev => prev + 1);
        shake();
        setTimeout(() => {
          setPin(['', '', '', '']);
          inputRefs.current[0]?.focus();
        }, 500);
      }
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      const newPin = [...pin];
      newPin[index - 1] = '';
      setPin(newPin);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.container}>
          <TouchableOpacity style={styles.closeBtn} onPress={onCancel}>
            <X color="#999" size={22} />
          </TouchableOpacity>

          <Shield color="#007AFF" size={48} />
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>Enter your 4-digit PIN to continue</Text>

          <Animated.View style={[styles.pinRow, { transform: [{ translateX: shakeAnim }] }]}>
            {pin.map((digit, i) => (
              <TextInput
                key={i}
                ref={(ref) => { inputRefs.current[i] = ref; }}
                style={[styles.pinInput, error && styles.pinInputError, digit ? styles.pinInputFilled : {}]}
                value={digit}
                onChangeText={(v) => handlePinInput(v, i)}
                onKeyPress={(e) => handleKeyPress(e, i)}
                keyboardType="number-pad"
                maxLength={1}
                secureTextEntry
                selectTextOnFocus
                caretHidden
              />
            ))}
          </Animated.View>

          {error && (
            <Text style={styles.errorText}>
              Wrong PIN {attempts >= 3 ? `(${attempts} attempts)` : ''}
            </Text>
          )}

          <Text style={styles.hint}>Default PIN: 0000</Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#1C1C1E',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    width: '85%',
    maxWidth: 340,
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 6,
  },
  title: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 16,
  },
  subtitle: {
    color: '#999',
    fontSize: 14,
    marginTop: 8,
    marginBottom: 24,
  },
  pinRow: {
    flexDirection: 'row',
    gap: 12,
  },
  pinInput: {
    width: 52,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#2C2C2E',
    borderWidth: 2,
    borderColor: '#3A3A3C',
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  pinInputFilled: {
    borderColor: '#007AFF',
    backgroundColor: 'rgba(0,122,255,0.1)',
  },
  pinInputError: {
    borderColor: '#FF453A',
    backgroundColor: 'rgba(255,69,58,0.1)',
  },
  errorText: {
    color: '#FF453A',
    fontSize: 14,
    marginTop: 16,
    fontWeight: '600',
  },
  hint: {
    color: '#666',
    fontSize: 12,
    marginTop: 20,
  },
});