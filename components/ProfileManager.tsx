import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useIPTV } from '../context/IPTVContext';
import { checkProviderHealth, HealthResult, getLatencyColor, formatLatency } from '../utils/providerHealth';
import { Settings, LogOut, Check, Activity } from 'lucide-react-native';

export const ProfileManager = ({ onManageProviders }: { onManageProviders: () => void }) => {
  const { t } = useTranslation();
  const { profiles, currentProfile, loadProfile } = useIPTV();
  const [checking, setChecking] = useState(false);
  const [healthResults, setHealthResults] = useState<Record<string, HealthResult>>({});

  const runHealthCheck = async () => {
    setChecking(true);
    const results: Record<string, HealthResult> = {};
    for (const p of profiles) {
      results[p.id] = { id: p.id, status: 'checking', latencyMs: null };
      setHealthResults({ ...results });

      const config = {
        id: p.id,
        name: p.name,
        type: p.type as 'xtream' | 'm3u',
        serverUrl: p.type === 'xtream' ? (p as any).serverUrl : (p as any).url,
        username: (p as any).username,
        password: (p as any).password,
      };

      const res = await checkProviderHealth(config);
      results[p.id] = res;
      setHealthResults({ ...results });
    }
    setChecking(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('profiles', 'Profiles')}</Text>
        <TouchableOpacity style={styles.actionBtn} onPress={runHealthCheck} disabled={checking}>
          {checking ? <ActivityIndicator size="small" color="#007AFF" /> : <Activity color="#007AFF" size={20} />}
        </TouchableOpacity>
      </View>

      {profiles.map(p => {
        const h = healthResults[p.id];
        return (
          <TouchableOpacity
            key={p.id}
            style={[styles.profileCard, currentProfile?.id === p.id && styles.activeCard]}
            onPress={() => loadProfile(p as any)}
            activeOpacity={0.8}
          >
            <View style={styles.cardInfo}>
              <View style={styles.nameRow}>
                {h && <View style={[styles.dot, { backgroundColor: getLatencyColor(h.latencyMs) }]} />}
                <Text style={styles.profileName}>{p.name}</Text>
              </View>
              <Text style={styles.profileType}>{p.type === 'xtream' ? 'Xtream Codes' : 'M3U'}</Text>
              {h && <Text style={[styles.latency, { color: getLatencyColor(h.latencyMs) }]}>{formatLatency(h.latencyMs)}</Text>}
            </View>
            {currentProfile?.id === p.id && <Check color="#4CD964" size={24} />}
          </TouchableOpacity>
        );
      })}

      <TouchableOpacity style={styles.manageBtn} onPress={onManageProviders}>
        <Settings color="#CCC" size={20} />
        <Text style={styles.manageBtnText}>{t('manageProviders', 'Manage Providers')}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  actionBtn: { padding: 8 },
  profileCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1C1C1E', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#2C2C2E' },
  activeCard: { borderColor: '#007AFF', backgroundColor: 'rgba(0,122,255,0.1)' },
  cardInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  profileName: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  profileType: { color: '#888', fontSize: 13 },
  latency: { fontSize: 12, marginTop: 4 },
  manageBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#2C2C2E', padding: 16, borderRadius: 12, marginTop: 8 },
  manageBtnText: { color: '#CCC', fontSize: 16, fontWeight: '600' }
});
