import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PlayerConfig, Category, LiveChannel } from '../types/iptv';

interface AppState {
  config: PlayerConfig | null;
  categories: Category[];
  channels: LiveChannel[];
  epgData: Record<string, any[]>;
  setConfig: (config: PlayerConfig) => void;
  setCategories: (categories: Category[]) => void;
  setChannels: (channels: LiveChannel[]) => void;
  setEpgData: (epgData: Record<string, any[]>) => void;
  clearState: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      config: null,
      categories: [],
      channels: [],
      epgData: {},
      setConfig: (config) => set({ config }),
      setCategories: (categories) => set({ categories }),
      setChannels: (channels) => set({ channels }),
      setEpgData: (epgData) => set({ epgData }),
      clearState: () => set({ config: null, categories: [], channels: [], epgData: {} }),
    }),
    {
      name: 'cpp-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        config: state.config,
        categories: state.categories,
        channels: state.channels,
        // Do not persist epgData since it can be very large
      }),
    }
  )
);
