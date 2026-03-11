import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '../store';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { isTV, isMobile } from '../utils/platform';
import { SafeAreaView } from 'react-native-safe-area-context';
import { VideoQualityPreset, BufferSizePreset, VideoViewType } from '../types/iptv';
import { getQualityLabel, getBufferLabel } from '../utils/streamingConfig';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Settings'>;

export const SettingsScreen = () => {
  const pin = useAppStore(state => state.pin);
  const showAdult = useAppStore(state => state.showAdult);
  const setAppPin = useAppStore(state => state.setPin);
  const setShowAdult = useAppStore(state => state.setShowAdult);
  const updateIntervalHours = useAppStore(state => state.updateIntervalHours);
  const setUpdateIntervalHours = useAppStore(state => state.setUpdateIntervalHours);
  const providers = useAppStore(state => state.providers);
  const activeConfig = useAppStore(state => state.config);
  const setConfig = useAppStore(state => state.setConfig);
  const removeProvider = useAppStore(state => state.removeProvider);
  const clearState = useAppStore(state => state.clearState);

  const [enteredPin, setEnteredPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const streamingSettings = useAppStore(state => state.streamingSettings);
  const setStreamingSettings = useAppStore(state => state.setStreamingSettings);

  const [unlockAdult, setUnlockAdult] = useState(false);
  const [changingPin, setChangingPin] = useState(false);
  const [managingProviders, setManagingProviders] = useState(false);
  const [intervalSetting, setIntervalSetting] = useState(false);
  const [streamingQuality, setStreamingQuality] = useState(false);
  const [streamingBuffer, setStreamingBuffer] = useState(false);
  const [streamingAdvanced, setStreamingAdvanced] = useState(false);

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

  const handleSetInterval = (hours: number) => {
    setUpdateIntervalHours(hours);
    setIntervalSetting(false);
    setSuccess(`Update interval set to ${hours} hours.`);
  };

  const handleSwitchProvider = (providerId: string) => {
    const provider = providers.find(p => p.id === providerId);
    if (provider) {
      setConfig(provider);
      setManagingProviders(false);
      setSuccess(`Switched to provider: ${provider.name}`);
    }
  };

  const handleDeleteProvider = (providerId: string) => {
    removeProvider(providerId);
    if (activeConfig?.id === providerId) {
      clearState();
      navigation.replace('Welcome');
    }
  };

  // ═══════════════════════════════════════════════════════════════
  //  MOBILE LAYOUT
  // ═══════════════════════════════════════════════════════════════
  if (isMobile) {
    return (
      <SafeAreaView style={mStyles.container} edges={['top']}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={mStyles.header}>
            <Text style={mStyles.headerTitle}>Settings</Text>
          </View>

          {error ? <Text style={mStyles.error}>{error}</Text> : null}
          {success ? <Text style={mStyles.success}>{success}</Text> : null}

          {/* Main menu */}
          {!unlockAdult && !changingPin && !managingProviders && !intervalSetting && !streamingQuality && !streamingBuffer && !streamingAdvanced && (
            <View style={mStyles.section}>
              <Text style={mStyles.sectionTitle}>General</Text>

              <TouchableOpacity style={mStyles.menuItem} onPress={() => setManagingProviders(true)} activeOpacity={0.7}>
                <Text style={mStyles.menuItemText}>Manage Providers</Text>
                <ChevronRight size={18} color="#666" />
              </TouchableOpacity>

              <TouchableOpacity style={mStyles.menuItem} onPress={() => setIntervalSetting(true)} activeOpacity={0.7}>
                <Text style={mStyles.menuItemText}>Update Interval</Text>
                <View style={mStyles.menuItemRight}>
                  <Text style={mStyles.menuItemValue}>{updateIntervalHours}h</Text>
                  <ChevronRight size={18} color="#666" />
                </View>
              </TouchableOpacity>

              <Text style={[mStyles.sectionTitle, { marginTop: 24 }]}>Privacy</Text>

              <TouchableOpacity style={mStyles.menuItem} onPress={handleToggleAdult} activeOpacity={0.7}>
                <Text style={mStyles.menuItemText}>
                  {showAdult ? 'Hide Adult Categories' : 'Show Adult Categories'}
                </Text>
                <ChevronRight size={18} color="#666" />
              </TouchableOpacity>

              <TouchableOpacity style={mStyles.menuItem} onPress={handleChangePin} activeOpacity={0.7}>
                <Text style={mStyles.menuItemText}>Change PIN</Text>
                <ChevronRight size={18} color="#666" />
              </TouchableOpacity>

              <Text style={[mStyles.sectionTitle, { marginTop: 24 }]}>Streaming</Text>

              <TouchableOpacity style={mStyles.menuItem} onPress={() => setStreamingQuality(true)} activeOpacity={0.7}>
                <Text style={mStyles.menuItemText}>Video-Qualität</Text>
                <View style={mStyles.menuItemRight}>
                  <Text style={mStyles.menuItemValue}>{getQualityLabel(streamingSettings.videoQuality)}</Text>
                  <ChevronRight size={18} color="#666" />
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={mStyles.menuItem} onPress={() => setStreamingBuffer(true)} activeOpacity={0.7}>
                <Text style={mStyles.menuItemText}>Buffer-Größe</Text>
                <View style={mStyles.menuItemRight}>
                  <Text style={mStyles.menuItemValue}>{getBufferLabel(streamingSettings.bufferSize)}</Text>
                  <ChevronRight size={18} color="#666" />
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={mStyles.menuItem} onPress={() => setStreamingAdvanced(true)} activeOpacity={0.7}>
                <Text style={mStyles.menuItemText}>Erweiterte Einstellungen</Text>
                <ChevronRight size={18} color="#666" />
              </TouchableOpacity>
            </View>
          )}

          {/* Streaming: Quality selection */}
          {streamingQuality && (
            <View style={mStyles.section}>
              <Text style={mStyles.sectionTitle}>Video-Qualität auswählen</Text>
              <Text style={mStyles.hintText}>Auto nutzt Adaptive Bitrate (ABR) – die beste Wahl für die meisten Nutzer.</Text>
              {(['auto', 'max', '1080p', '720p', '480p'] as VideoQualityPreset[]).map((quality) => (
                <TouchableOpacity
                  key={quality}
                  style={[mStyles.menuItem, streamingSettings.videoQuality === quality && mStyles.menuItemSelected]}
                  onPress={() => {
                    setStreamingSettings({ videoQuality: quality });
                    setStreamingQuality(false);
                    setSuccess(`Video-Qualität: ${getQualityLabel(quality)}`);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={mStyles.menuItemText}>{getQualityLabel(quality)}</Text>
                  {streamingSettings.videoQuality === quality && <Text style={mStyles.checkmark}>✓</Text>}
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={mStyles.cancelBtn} onPress={() => setStreamingQuality(false)} activeOpacity={0.7}>
                <Text style={mStyles.cancelBtnText}>Zurück</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Streaming: Buffer size selection */}
          {streamingBuffer && (
            <View style={mStyles.section}>
              <Text style={mStyles.sectionTitle}>Buffer-Größe auswählen</Text>
              <Text style={mStyles.hintText}>Größerer Buffer = stabileres Streaming, aber längere Startzeit.</Text>
              {(['normal', 'large', 'maximum'] as BufferSizePreset[]).map((buffer) => (
                <TouchableOpacity
                  key={buffer}
                  style={[mStyles.menuItem, streamingSettings.bufferSize === buffer && mStyles.menuItemSelected]}
                  onPress={() => {
                    setStreamingSettings({ bufferSize: buffer });
                    setStreamingBuffer(false);
                    setSuccess(`Buffer-Größe: ${getBufferLabel(buffer)}`);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={mStyles.menuItemText}>{getBufferLabel(buffer)}</Text>
                  {streamingSettings.bufferSize === buffer && <Text style={mStyles.checkmark}>✓</Text>}
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={mStyles.cancelBtn} onPress={() => setStreamingBuffer(false)} activeOpacity={0.7}>
                <Text style={mStyles.cancelBtnText}>Zurück</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Streaming: Advanced settings */}
          {streamingAdvanced && (
            <View style={mStyles.section}>
              <Text style={mStyles.sectionTitle}>Erweiterte Streaming-Einstellungen</Text>

              <Text style={[mStyles.hintText, { marginTop: 12 }]}>Video-Rendering (Android)</Text>
              <TouchableOpacity
                style={[mStyles.menuItem, streamingSettings.viewType === 'surfaceView' && mStyles.menuItemSelected]}
                onPress={() => {
                  setStreamingSettings({ viewType: 'surfaceView' });
                  setSuccess('SurfaceView aktiviert (Hardware-beschleunigt)');
                }}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  <Text style={mStyles.menuItemText}>SurfaceView (empfohlen)</Text>
                  <Text style={mStyles.menuItemDesc}>HW-beschleunigt, bessere Bildqualität</Text>
                </View>
                {streamingSettings.viewType === 'surfaceView' && <Text style={mStyles.checkmark}>✓</Text>}
              </TouchableOpacity>

              <TouchableOpacity
                style={[mStyles.menuItem, streamingSettings.viewType === 'textureView' && mStyles.menuItemSelected]}
                onPress={() => {
                  setStreamingSettings({ viewType: 'textureView' });
                  setSuccess('TextureView aktiviert (kompatibel)');
                }}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  <Text style={mStyles.menuItemText}>TextureView</Text>
                  <Text style={mStyles.menuItemDesc}>Fallback bei Darstellungsproblemen</Text>
                </View>
                {streamingSettings.viewType === 'textureView' && <Text style={mStyles.checkmark}>✓</Text>}
              </TouchableOpacity>

              <TouchableOpacity style={mStyles.cancelBtn} onPress={() => setStreamingAdvanced(false)} activeOpacity={0.7}>
                <Text style={mStyles.cancelBtnText}>Zurück</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Interval selection */}
          {intervalSetting && (
            <View style={mStyles.section}>
              <Text style={mStyles.sectionTitle}>Select Update Interval</Text>
              {[1, 6, 12, 24, 48].map((hours) => (
                <TouchableOpacity
                  key={hours}
                  style={[mStyles.menuItem, updateIntervalHours === hours && mStyles.menuItemSelected]}
                  onPress={() => handleSetInterval(hours)}
                  activeOpacity={0.7}
                >
                  <Text style={mStyles.menuItemText}>Every {hours} hours</Text>
                  {updateIntervalHours === hours && <Text style={mStyles.checkmark}>✓</Text>}
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={mStyles.cancelBtn} onPress={() => setIntervalSetting(false)} activeOpacity={0.7}>
                <Text style={mStyles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Provider management */}
          {managingProviders && (
            <View style={mStyles.section}>
              <Text style={mStyles.sectionTitle}>Your Providers</Text>
              {providers.map((provider) => (
                <View key={provider.id} style={mStyles.providerRow}>
                  <TouchableOpacity
                    style={[mStyles.providerItem, activeConfig?.id === provider.id && mStyles.providerItemActive]}
                    onPress={() => handleSwitchProvider(provider.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={mStyles.providerName}>{provider.name}</Text>
                    {activeConfig?.id === provider.id && <Text style={mStyles.providerBadge}>Active</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity style={mStyles.providerDeleteBtn} onPress={() => handleDeleteProvider(provider.id)}>
                    <Text style={mStyles.providerDeleteText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity
                style={mStyles.addBtn}
                onPress={() => { setManagingProviders(false); navigation.navigate('Welcome'); }}
                activeOpacity={0.7}
              >
                <Text style={mStyles.addBtnText}>+ Add New Provider</Text>
              </TouchableOpacity>
              <TouchableOpacity style={mStyles.cancelBtn} onPress={() => setManagingProviders(false)} activeOpacity={0.7}>
                <Text style={mStyles.cancelBtnText}>Back</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Unlock adult */}
          {unlockAdult && (
            <View style={mStyles.section}>
              <Text style={mStyles.sectionTitle}>Enter PIN to show adult categories</Text>
              <TextInput
                style={mStyles.input}
                placeholder="Enter PIN"
                placeholderTextColor="#888"
                value={enteredPin}
                onChangeText={setEnteredPin}
                keyboardType="number-pad"
                secureTextEntry
                maxLength={8}
              />
              <TouchableOpacity style={mStyles.addBtn} onPress={handleUnlockAdultSubmit} activeOpacity={0.7}>
                <Text style={mStyles.addBtnText}>Submit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={mStyles.cancelBtn} onPress={() => { setUnlockAdult(false); setError(''); }} activeOpacity={0.7}>
                <Text style={mStyles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Change PIN */}
          {changingPin && (
            <View style={mStyles.section}>
              <Text style={mStyles.sectionTitle}>Change your PIN</Text>
              <TextInput
                style={mStyles.input}
                placeholder="Current PIN"
                placeholderTextColor="#888"
                value={enteredPin}
                onChangeText={setEnteredPin}
                keyboardType="number-pad"
                secureTextEntry
                maxLength={8}
              />
              <TextInput
                style={mStyles.input}
                placeholder="New PIN"
                placeholderTextColor="#888"
                value={newPin}
                onChangeText={setNewPin}
                keyboardType="number-pad"
                secureTextEntry
                maxLength={8}
              />
              <TextInput
                style={mStyles.input}
                placeholder="Confirm New PIN"
                placeholderTextColor="#888"
                value={confirmPin}
                onChangeText={setConfirmPin}
                keyboardType="number-pad"
                secureTextEntry
                maxLength={8}
              />
              <TouchableOpacity style={mStyles.addBtn} onPress={handleChangePinSubmit} activeOpacity={0.7}>
                <Text style={mStyles.addBtnText}>Save New PIN</Text>
              </TouchableOpacity>
              <TouchableOpacity style={mStyles.cancelBtn} onPress={() => { setChangingPin(false); setError(''); }} activeOpacity={0.7}>
                <Text style={mStyles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  //  TV LAYOUT (original – 100% preserved)
  // ═══════════════════════════════════════════════════════════════
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

        {!unlockAdult && !changingPin && !managingProviders && !intervalSetting && !streamingQuality && !streamingBuffer && !streamingAdvanced && (
          <>
            <TouchableOpacity style={styles.menuItem} onPress={() => setManagingProviders(true)}>
              <Text style={styles.menuItemText}>Manage Providers</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => setIntervalSetting(true)}>
              <Text style={styles.menuItemText}>Update Interval ({updateIntervalHours}h)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={handleToggleAdult}>
              <Text style={styles.menuItemText}>
                {showAdult ? 'Hide Adult Categories' : 'Show Adult Categories'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={handleChangePin}>
              <Text style={styles.menuItemText}>Change PIN</Text>
            </TouchableOpacity>
            <Text style={[styles.subtitle, { marginTop: 20 }]}>Streaming Settings</Text>
            <TouchableOpacity style={styles.menuItem} onPress={() => setStreamingQuality(true)}>
              <Text style={styles.menuItemText}>Video Quality: {getQualityLabel(streamingSettings.videoQuality)}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => setStreamingBuffer(true)}>
              <Text style={styles.menuItemText}>Buffer Size: {getBufferLabel(streamingSettings.bufferSize)}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => setStreamingAdvanced(true)}>
              <Text style={styles.menuItemText}>Advanced Settings</Text>
            </TouchableOpacity>
          </>
        )}

        {intervalSetting && (
          <View>
            <Text style={styles.subtitle}>Select Update Interval:</Text>
            {[1, 6, 12, 24, 48].map((hours) => (
              <TouchableOpacity
                key={hours}
                style={[styles.menuItem, updateIntervalHours === hours && styles.menuItemSelected]}
                onPress={() => handleSetInterval(hours)}
              >
                <Text style={styles.menuItemText}>Every {hours} hours</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.cancelButton} onPress={() => setIntervalSetting(false)}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {managingProviders && (
          <View>
            <Text style={styles.subtitle}>Your Providers:</Text>
            {providers.map((provider) => (
              <View key={provider.id} style={styles.providerItem}>
                <TouchableOpacity
                  style={[styles.providerSelectBtn, activeConfig?.id === provider.id && styles.providerActiveBtn]}
                  onPress={() => handleSwitchProvider(provider.id)}
                >
                  <Text style={styles.menuItemText}>
                    {provider.name} {activeConfig?.id === provider.id ? '(Active)' : ''}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.providerDeleteBtn} onPress={() => handleDeleteProvider(provider.id)}>
                  <Text style={styles.providerDeleteText}>Delete</Text>
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity
              style={styles.button}
              onPress={() => { setManagingProviders(false); navigation.navigate('Welcome'); }}
            >
              <Text style={styles.buttonText}>Add New Provider</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setManagingProviders(false)}>
              <Text style={styles.cancelButtonText}>Back</Text>
            </TouchableOpacity>
          </View>
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

        {/* TV: Video Quality Selection */}
        {streamingQuality && (
          <View>
            <Text style={styles.subtitle}>Select Video Quality:</Text>
            {(['auto', 'max', '1080p', '720p', '480p'] as VideoQualityPreset[]).map((quality) => (
              <TouchableOpacity
                key={quality}
                style={[styles.menuItem, streamingSettings.videoQuality === quality && styles.menuItemSelected]}
                onPress={() => {
                  setStreamingSettings({ videoQuality: quality });
                  setStreamingQuality(false);
                  setSuccess(`Video Quality: ${getQualityLabel(quality)}`);
                }}
              >
                <Text style={styles.menuItemText}>{getQualityLabel(quality)}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.cancelButton} onPress={() => setStreamingQuality(false)}>
              <Text style={styles.cancelButtonText}>Back</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* TV: Buffer Size Selection */}
        {streamingBuffer && (
          <View>
            <Text style={styles.subtitle}>Select Buffer Size:</Text>
            {(['normal', 'large', 'maximum'] as BufferSizePreset[]).map((buffer) => (
              <TouchableOpacity
                key={buffer}
                style={[styles.menuItem, streamingSettings.bufferSize === buffer && styles.menuItemSelected]}
                onPress={() => {
                  setStreamingSettings({ bufferSize: buffer });
                  setStreamingBuffer(false);
                  setSuccess(`Buffer Size: ${getBufferLabel(buffer)}`);
                }}
              >
                <Text style={styles.menuItemText}>{getBufferLabel(buffer)}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.cancelButton} onPress={() => setStreamingBuffer(false)}>
              <Text style={styles.cancelButtonText}>Back</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* TV: Advanced Streaming Settings */}
        {streamingAdvanced && (
          <View>
            <Text style={styles.subtitle}>Video Rendering:</Text>
            <TouchableOpacity
              style={[styles.menuItem, streamingSettings.viewType === 'surfaceView' && styles.menuItemSelected]}
              onPress={() => {
                setStreamingSettings({ viewType: 'surfaceView' });
                setSuccess('SurfaceView enabled (HW-accelerated)');
              }}
            >
              <Text style={styles.menuItemText}>SurfaceView (recommended)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.menuItem, streamingSettings.viewType === 'textureView' && styles.menuItemSelected]}
              onPress={() => {
                setStreamingSettings({ viewType: 'textureView' });
                setSuccess('TextureView enabled (compatible)');
              }}
            >
              <Text style={styles.menuItemText}>TextureView (fallback)</Text>
            </TouchableOpacity>

            <Text style={[styles.subtitle, { marginTop: 20 }]}>Hardware Acceleration:</Text>
            <TouchableOpacity
              style={[styles.menuItem, streamingSettings.hardwareAcceleration && styles.menuItemSelected]}
              onPress={() => {
                setStreamingSettings({ hardwareAcceleration: !streamingSettings.hardwareAcceleration });
                setSuccess(streamingSettings.hardwareAcceleration ? 'HW Acceleration disabled' : 'HW Acceleration enabled');
              }}
            >
              <Text style={styles.menuItemText}>
                {streamingSettings.hardwareAcceleration ? 'Enabled ✓' : 'Disabled'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelButton} onPress={() => setStreamingAdvanced(false)}>
              <Text style={styles.cancelButtonText}>Back</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

// ── TV styles (original) ──────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A', padding: 40 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 40 },
  backButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1C1C1E', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, borderWidth: 2, borderColor: '#3C3C3E' },
  backButtonText: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginLeft: 10 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#FFF', marginLeft: 30 },
  card: { backgroundColor: '#1C1C1E', padding: 40, borderRadius: 20, width: '100%', maxWidth: 600, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 10, alignSelf: 'center' },
  subtitle: { fontSize: 18, color: '#AAA', marginBottom: 20 },
  menuItem: { backgroundColor: '#2C2C2E', padding: 20, borderRadius: 10, marginBottom: 15 },
  menuItemSelected: { borderColor: '#007AFF', borderWidth: 2 },
  menuItemText: { color: '#FFF', fontSize: 20, fontWeight: 'bold', textAlign: 'center' },
  providerItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  providerSelectBtn: { flex: 1, backgroundColor: '#2C2C2E', padding: 20, borderRadius: 10, marginRight: 10 },
  providerActiveBtn: { backgroundColor: '#007AFF' },
  providerDeleteBtn: { backgroundColor: '#FF453A', padding: 20, borderRadius: 10, justifyContent: 'center' },
  providerDeleteText: { color: '#FFF', fontWeight: 'bold' },
  input: { backgroundColor: '#2C2C2E', color: '#FFF', padding: 15, borderRadius: 10, fontSize: 18, marginBottom: 20, borderWidth: 1, borderColor: '#3C3C3E', textAlign: 'center' },
  button: { backgroundColor: '#007AFF', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  cancelButton: { backgroundColor: '#3C3C3E', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  cancelButtonText: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  error: { color: '#FF453A', textAlign: 'center', marginBottom: 20, fontSize: 16 },
  success: { color: '#32D74B', textAlign: 'center', marginBottom: 20, fontSize: 16 },
});

// ── Mobile styles ─────────────────────────────────────────────────
const mStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  headerTitle: { color: '#FFF', fontSize: 28, fontWeight: 'bold' },
  error: { color: '#FF453A', textAlign: 'center', marginHorizontal: 20, marginBottom: 8, fontSize: 14 },
  success: { color: '#32D74B', textAlign: 'center', marginHorizontal: 20, marginBottom: 8, fontSize: 14 },
  section: { paddingHorizontal: 20 },
  sectionTitle: { color: '#888', fontSize: 13, fontWeight: '600', textTransform: 'uppercase', marginBottom: 10, marginTop: 8 },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#1C1C1E', padding: 16, borderRadius: 12, marginBottom: 8,
  },
  menuItemSelected: { borderWidth: 2, borderColor: '#007AFF' },
  menuItemText: { color: '#FFF', fontSize: 16, fontWeight: '500' },
  menuItemRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  menuItemValue: { color: '#888', fontSize: 14 },
  checkmark: { color: '#007AFF', fontSize: 18, fontWeight: 'bold' },
  providerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  providerItem: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#1C1C1E', padding: 16, borderRadius: 12, marginRight: 8,
  },
  providerItemActive: { backgroundColor: '#007AFF' },
  providerName: { color: '#FFF', fontSize: 15, fontWeight: '500' },
  providerBadge: { color: '#FFF', fontSize: 12, fontWeight: 'bold', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  providerDeleteBtn: {
    backgroundColor: '#FF453A', width: 40, height: 40, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  providerDeleteText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  input: { backgroundColor: '#1C1C1E', color: '#FFF', padding: 14, borderRadius: 12, fontSize: 16, marginBottom: 12, borderWidth: 1, borderColor: '#2C2C2E', textAlign: 'center' },
  addBtn: { backgroundColor: '#007AFF', padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  addBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  cancelBtn: { backgroundColor: '#2C2C2E', padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  cancelBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  hintText: { color: '#888', fontSize: 13, marginBottom: 12, lineHeight: 18 },
  menuItemDesc: { color: '#888', fontSize: 12, marginTop: 4 },
});