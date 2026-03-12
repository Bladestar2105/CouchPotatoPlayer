import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Radio, Check, Plus, ChevronDown, Wifi, X } from 'lucide-react-native';
import { useAppStore } from '../store';
import { showToast } from './Toast';
import { isMobile, isTV } from '../utils/platform';

interface ProviderSwitcherProps {
  compact?: boolean;
}

export const ProviderSwitcher: React.FC<ProviderSwitcherProps> = ({ compact = false }) => {
  const [showPicker, setShowPicker] = useState(false);
  const providers = useAppStore(state => state.providers);
  const activeConfig = useAppStore(state => state.config);
  const setConfig = useAppStore(state => state.setConfig);
  const setCategories = useAppStore(state => state.setCategories);
  const setChannels = useAppStore(state => state.setChannels);

  if (providers.length <= 1) return null;

  const activeProvider = providers.find(p => 
    activeConfig && (
      (activeConfig.type === 'xtream' && p.type === 'xtream' && p.serverUrl === activeConfig.serverUrl && p.username === activeConfig.username) ||
      (activeConfig.type === 'm3u' && p.type === 'm3u' && p.serverUrl === activeConfig.serverUrl)
    )
  );

  const getProviderLabel = (p: any): string => {
    if (p.type === 'xtream') {
      try {
        const hostname = new URL(p.serverUrl).hostname;
        return `${p.username}@${hostname}`;
      } catch {
        return p.username || 'Xtream';
      }
    }
    return p.name || 'M3U Playlist';
  };

  const switchProvider = (provider: any) => {
    // Clear current data
    setCategories([], true);
    setChannels([], true);
    // Switch config
    setConfig(provider);
    setShowPicker(false);
    showToast(`Switched to ${getProviderLabel(provider)}`, 'success');
  };

  if (compact) {
    return (
      <>
        <TouchableOpacity 
          style={styles.compactButton} 
          onPress={() => setShowPicker(true)}
          activeOpacity={0.7}
        >
          <Radio color="#007AFF" size={16} />
          <Text style={styles.compactLabel} numberOfLines={1}>
            {activeProvider ? getProviderLabel(activeProvider) : 'Provider'}
          </Text>
          <ChevronDown color="#666" size={14} />
        </TouchableOpacity>

        <Modal
          visible={showPicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowPicker(false)}
        >
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowPicker(false)}>
            <View style={styles.pickerContainer}>
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>Switch Provider</Text>
                <TouchableOpacity onPress={() => setShowPicker(false)}>
                  <X color="#999" size={22} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.pickerList}>
                {providers.map((provider, idx) => {
                  const isActive = activeConfig && (
                    (activeConfig.type === 'xtream' && provider.type === 'xtream' && provider.serverUrl === activeConfig.serverUrl && provider.username === activeConfig.username) ||
                    (activeConfig.type === 'm3u' && provider.type === 'm3u' && provider.serverUrl === activeConfig.serverUrl)
                  );
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.providerItem, isActive && styles.providerItemActive]}
                      onPress={() => !isActive && switchProvider(provider)}
                      activeOpacity={isActive ? 1 : 0.7}
                    >
                      <Wifi color={isActive ? '#007AFF' : '#666'} size={20} />
                      <View style={styles.providerInfo}>
                        <Text style={[styles.providerName, isActive && styles.providerNameActive]}>
                          {getProviderLabel(provider)}
                        </Text>
                        <Text style={styles.providerType}>
                          {provider.type === 'xtream' ? 'Xtream Codes' : 'M3U Playlist'}
                        </Text>
                      </View>
                      {isActive && <Check color="#007AFF" size={20} />}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
      </>
    );
  }

  // Full-size provider switcher (for settings)
  return (
    <View style={styles.fullContainer}>
      <Text style={styles.fullTitle}>Active Provider</Text>
      {providers.map((provider, idx) => {
        const isActive = activeConfig && (
          (activeConfig.type === 'xtream' && provider.type === 'xtream' && provider.serverUrl === activeConfig.serverUrl && provider.username === activeConfig.username) ||
          (activeConfig.type === 'm3u' && provider.type === 'm3u' && provider.serverUrl === activeConfig.serverUrl)
        );
        return (
          <TouchableOpacity
            key={idx}
            style={[styles.fullItem, isActive && styles.fullItemActive]}
            onPress={() => !isActive && switchProvider(provider)}
            activeOpacity={isActive ? 1 : 0.7}
          >
            <Radio color={isActive ? '#007AFF' : '#555'} size={20} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.fullItemName, isActive && { color: '#007AFF' }]}>
                {getProviderLabel(provider)}
              </Text>
              <Text style={styles.fullItemType}>
                {provider.type === 'xtream' ? 'Xtream Codes' : 'M3U Playlist'}
              </Text>
            </View>
            {isActive && <Check color="#4CD964" size={20} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  // Compact (header bar)
  compactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,122,255,0.1)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
    maxWidth: isMobile ? 180 : 250,
  },
  compactLabel: {
    color: '#007AFF',
    fontSize: isMobile ? 12 : 14,
    fontWeight: '600',
    flex: 1,
  },
  // Modal
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  pickerContainer: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '50%',
    paddingBottom: 30,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  pickerTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  pickerList: {
    maxHeight: 300,
  },
  providerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 12,
  },
  providerItemActive: {
    backgroundColor: 'rgba(0,122,255,0.1)',
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    color: '#CCC',
    fontSize: 16,
    fontWeight: '600',
  },
  providerNameActive: {
    color: '#007AFF',
  },
  providerType: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
  },
  // Full-size
  fullContainer: {
    marginBottom: 16,
  },
  fullTitle: {
    color: '#888',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  fullItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#1C1C1E',
    borderRadius: 10,
    marginBottom: 6,
  },
  fullItemActive: {
    backgroundColor: 'rgba(0,122,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0,122,255,0.3)',
  },
  fullItemName: {
    color: '#CCC',
    fontSize: 15,
    fontWeight: '600',
  },
  fullItemType: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
  },
});