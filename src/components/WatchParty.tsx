import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, Share, Platform, Clipboard } from 'react-native';
import { Users, Link, Copy, Play, Pause, X, Radio } from 'lucide-react-native';
import { showToast } from './Toast';
import { isMobile } from '../utils/platform';

interface WatchPartyProps {
  channelName: string;
  channelId: string | number;
  type: 'live' | 'vod' | 'series';
  currentTime: number;
  isPlaying: boolean;
  onSeek?: (time: number) => void;
  onTogglePlay?: () => void;
}

interface PartyState {
  isHost: boolean;
  roomId: string;
  viewers: number;
  syncTime: number;
  isActive: boolean;
}

// Simple room ID generator
const generateRoomId = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const WatchParty: React.FC<WatchPartyProps> = ({
  channelName,
  channelId,
  type,
  currentTime,
  isPlaying,
  onSeek,
  onTogglePlay,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [party, setParty] = useState<PartyState | null>(null);
  const [joinCode, setJoinCode] = useState('');

  const createParty = useCallback(() => {
    const roomId = generateRoomId();
    setParty({
      isHost: true,
      roomId,
      viewers: 1,
      syncTime: currentTime,
      isActive: true,
    });
    showToast(`Watch Party created: ${roomId}`, 'success');
  }, [currentTime]);

  const joinParty = useCallback(() => {
    if (joinCode.length < 4) {
      showToast('Enter a valid room code', 'error');
      return;
    }
    setParty({
      isHost: false,
      roomId: joinCode.toUpperCase(),
      viewers: 2,
      syncTime: 0,
      isActive: true,
    });
    showToast(`Joined party: ${joinCode.toUpperCase()}`, 'success');
    setJoinCode('');
  }, [joinCode]);

  const leaveParty = useCallback(() => {
    setParty(null);
    showToast('Left Watch Party', 'info');
  }, []);

  const sharePartyLink = useCallback(async () => {
    if (!party) return;
    const message = `🎬 Join my Watch Party on CouchPotato Player!\n\nWatching: ${channelName}\nRoom Code: ${party.roomId}\n\nOpen CouchPotato Player and enter the code to watch together!`;
    
    try {
      if (Platform.OS === 'web') {
        // Web clipboard
        if (typeof globalThis !== 'undefined' && (globalThis as any).navigator?.clipboard) {
          await (globalThis as any).navigator.clipboard.writeText(message);
          showToast('Party link copied!', 'success');
        }
      } else {
        await Share.share({ message, title: 'Watch Party Invite' });
      }
    } catch (e) {
      showToast('Could not share', 'error');
    }
  }, [party, channelName]);

  // Simulated sync pulse (in a real app this would use WebSocket)
  useEffect(() => {
    if (!party?.isActive) return;
    const interval = setInterval(() => {
      setParty(prev => prev ? {
        ...prev,
        syncTime: currentTime,
        viewers: prev.isHost ? Math.max(1, prev.viewers) : prev.viewers,
      } : null);
    }, 5000);
    return () => clearInterval(interval);
  }, [party?.isActive, currentTime]);

  return (
    <>
      {/* Party indicator badge */}
      {party?.isActive && (
        <TouchableOpacity style={styles.partyBadge} onPress={() => setShowModal(true)}>
          <Users color="#FF2D55" size={14} />
          <Text style={styles.partyBadgeText}>{party.viewers}</Text>
          <View style={styles.partyPulse} />
        </TouchableOpacity>
      )}

      {/* Trigger button (used externally) */}
      <TouchableOpacity
        style={styles.triggerButton}
        onPress={() => setShowModal(true)}
        activeOpacity={0.7}
      >
        <Users color={party?.isActive ? '#FF2D55' : '#FFF'} size={20} />
        <Text style={[styles.triggerText, party?.isActive && { color: '#FF2D55' }]}>
          {party?.isActive ? `Party (${party.viewers})` : 'Party'}
        </Text>
      </TouchableOpacity>

      {/* Watch Party Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setShowModal(false)}>
          <View style={styles.modalContainer} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Users color="#FF2D55" size={24} />
              <Text style={styles.modalTitle}>Watch Party</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <X color="#999" size={22} />
              </TouchableOpacity>
            </View>

            {!party?.isActive ? (
              // Not in a party - show create/join options
              <View style={styles.modalBody}>
                <Text style={styles.watchingLabel}>
                  Currently watching: {channelName}
                </Text>

                {/* Create Party */}
                <TouchableOpacity style={styles.createButton} onPress={createParty}>
                  <Radio color="#FFF" size={20} />
                  <Text style={styles.createButtonText}>Create Watch Party</Text>
                </TouchableOpacity>

                {/* Join Party */}
                <View style={styles.joinSection}>
                  <Text style={styles.joinLabel}>Or join an existing party:</Text>
                  <View style={styles.joinRow}>
                    <TextInput
                      style={styles.joinInput}
                      placeholder="Enter room code"
                      placeholderTextColor="#666"
                      value={joinCode}
                      onChangeText={setJoinCode}
                      autoCapitalize="characters"
                      maxLength={6}
                    />
                    <TouchableOpacity
                      style={[styles.joinButton, joinCode.length < 4 && styles.joinButtonDisabled]}
                      onPress={joinParty}
                      disabled={joinCode.length < 4}
                    >
                      <Text style={styles.joinButtonText}>Join</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ) : (
              // In a party - show party info
              <View style={styles.modalBody}>
                <View style={styles.partyInfo}>
                  <View style={styles.roomCodeBox}>
                    <Text style={styles.roomCodeLabel}>Room Code</Text>
                    <Text style={styles.roomCode}>{party.roomId}</Text>
                  </View>
                  
                  <View style={styles.partyStats}>
                    <View style={styles.partyStat}>
                      <Users color="#FF2D55" size={18} />
                      <Text style={styles.partyStatText}>{party.viewers} watching</Text>
                    </View>
                    <View style={styles.partyStat}>
                      <Text style={styles.partyStatLabel}>
                        {party.isHost ? '👑 You are the host' : '👀 Viewer'}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.watchingLabel}>
                    Watching: {channelName}
                  </Text>
                </View>

                {/* Share button */}
                <TouchableOpacity style={styles.shareButton} onPress={sharePartyLink}>
                  <Link color="#FFF" size={18} />
                  <Text style={styles.shareButtonText}>Share Invite</Text>
                </TouchableOpacity>

                {/* Leave button */}
                <TouchableOpacity style={styles.leaveButton} onPress={leaveParty}>
                  <Text style={styles.leaveButtonText}>
                    {party.isHost ? 'End Party' : 'Leave Party'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  // Party badge (shown in player)
  partyBadge: {
    position: 'absolute',
    top: isMobile ? 50 : 20,
    right: isMobile ? 60 : 80,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,45,85,0.2)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
    zIndex: 100,
  },
  partyBadgeText: {
    color: '#FF2D55',
    fontSize: 12,
    fontWeight: 'bold',
  },
  partyPulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF2D55',
  },
  // Trigger button (for toolbar)
  triggerButton: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    minWidth: 48,
  },
  triggerText: {
    color: '#FFF',
    fontSize: 10,
    marginTop: 3,
    fontWeight: '600',
  },
  // Modal
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContainer: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    gap: 10,
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
  },
  modalBody: {
    padding: 20,
  },
  watchingLabel: {
    color: '#999',
    fontSize: 14,
    marginBottom: 20,
  },
  // Create
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF2D55',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 10,
    marginBottom: 24,
  },
  createButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Join
  joinSection: {
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingTop: 20,
  },
  joinLabel: {
    color: '#999',
    fontSize: 14,
    marginBottom: 12,
  },
  joinRow: {
    flexDirection: 'row',
    gap: 10,
  },
  joinInput: {
    flex: 1,
    backgroundColor: '#2C2C2E',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#FFF',
    fontSize: 18,
    letterSpacing: 4,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  joinButton: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  joinButtonDisabled: {
    opacity: 0.4,
  },
  joinButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Party Info
  partyInfo: {
    marginBottom: 20,
  },
  roomCodeBox: {
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  roomCodeLabel: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  roomCode: {
    color: '#FFF',
    fontSize: 36,
    fontWeight: 'bold',
    letterSpacing: 6,
    marginTop: 4,
  },
  partyStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  partyStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  partyStatText: {
    color: '#CCC',
    fontSize: 14,
    fontWeight: '600',
  },
  partyStatLabel: {
    color: '#CCC',
    fontSize: 14,
  },
  // Share
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 10,
    marginBottom: 12,
  },
  shareButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Leave
  leaveButton: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  leaveButtonText: {
    color: '#FF453A',
    fontSize: 16,
    fontWeight: '600',
  },
});