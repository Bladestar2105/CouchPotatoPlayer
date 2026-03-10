import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PlayerConfig, Category, LiveChannel } from '../types/iptv';

interface AppState {
  config: PlayerConfig | null;
  providers: PlayerConfig[];
  updateIntervalHours: number;
  lastProviderUpdate: number;
  lastEpgUpdate: number;
  categories: Category[];
  channels: LiveChannel[];
  epgData: Record<string, any[]>;
  pin: string | null;
  showAdult: boolean;
  setConfig: (config: PlayerConfig | null) => void;
  addProvider: (provider: PlayerConfig) => void;
  removeProvider: (id: string) => void;
  setUpdateIntervalHours: (hours: number) => void;
  setLastProviderUpdate: (time: number) => void;
  setLastEpgUpdate: (time: number) => void;
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
      providers: [],
      updateIntervalHours: 24,
      lastProviderUpdate: 0,
      lastEpgUpdate: 0,
      categories: [],
      channels: [],
      epgData: {},
      pin: null,
      showAdult: false,
      setConfig: (config) => set({ config }),
      addProvider: (provider) => set((state) => {
        const existingIndex = state.providers.findIndex(p => p.id === provider.id);
        if (existingIndex >= 0) {
          const newProviders = [...state.providers];
          newProviders[existingIndex] = provider;
          return { providers: newProviders };
        }
        return { providers: [...state.providers, provider] };
      }),
      removeProvider: (id) => set((state) => ({
        providers: state.providers.filter(p => p.id !== id),
        config: state.config?.id === id ? null : state.config
      })),
      setUpdateIntervalHours: (hours) => set({ updateIntervalHours: hours }),
      setLastProviderUpdate: (time) => set({ lastProviderUpdate: time }),
      setLastEpgUpdate: (time) => set({ lastEpgUpdate: time }),
      setCategories: (categories) => set({ categories }),
      setChannels: (channels) => set({ channels }),
      setEpgData: (epgData) => set({ epgData }),
      setPin: (pin) => set({ pin }),
      setShowAdult: (showAdult) => set({ showAdult }),
      clearState: () => set({ config: null, providers: [], categories: [], channels: [], epgData: {}, pin: null, showAdult: false, lastProviderUpdate: 0, lastEpgUpdate: 0 }),
    }),
    {
      name: 'cpp-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        config: state.config,
        providers: state.providers,
        updateIntervalHours: state.updateIntervalHours,
        lastProviderUpdate: state.lastProviderUpdate,
        lastEpgUpdate: state.lastEpgUpdate,
        categories: state.categories,
        channels: state.channels,
        pin: state.pin,
        showAdult: state.showAdult,
        // Do not persist epgData since it can be very large
      }),
    }
  )
);
