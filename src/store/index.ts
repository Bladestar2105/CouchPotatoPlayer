import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PlayerConfig, Category, LiveChannel } from '../types/iptv';

interface AppState {
  config: PlayerConfig | null;
  categories: Category[];
  channels: LiveChannel[];
  epgData: Record<string, any[]>;
  pin: string | null;
  showAdult: boolean;
  setConfig: (config: PlayerConfig) => void;
  setCategories: (categories: Category[]) => void;
  setChannels: (channels: LiveChannel[]) => void;
  setEpgData: (epgData: Record<string, any[]>) => void;
  setPin: (pin: string | null) => void;
  setShowAdult: (showAdult: boolean) => void;
  clearState: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      config: null,
      categories: [],
      channels: [],
      epgData: {},
      pin: null,
      showAdult: false,
      setConfig: (config) => set({ config }),
      setCategories: (categories) => set({ categories }),
      setChannels: (channels) => set({ channels }),
      setEpgData: (epgData) => set({ epgData }),
      setPin: (pin) => set({ pin }),
      setShowAdult: (showAdult) => set({ showAdult }),
      clearState: () => set({ config: null, categories: [], channels: [], epgData: {}, pin: null, showAdult: false }),
    }),
    {
      name: 'cpp-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        config: state.config,
        categories: state.categories,
        channels: state.channels,
        pin: state.pin,
        showAdult: state.showAdult,
        // Do not persist epgData since it can be very large
      }),
    }
  )
);
