import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PlayerConfig, Category, LiveChannel } from '../types/iptv';

interface AppState {
  config: PlayerConfig | null;
  categories: Category[];
  channels: LiveChannel[];
  setConfig: (config: PlayerConfig) => void;
  setCategories: (categories: Category[]) => void;
  setChannels: (channels: LiveChannel[]) => void;
  clearState: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      config: null,
      categories: [],
      channels: [],
      setConfig: (config) => set({ config }),
      setCategories: (categories) => set({ categories }),
      setChannels: (channels) => set({ channels }),
      clearState: () => set({ config: null, categories: [], channels: [] }),
    }),
    {
      name: 'cpp-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
