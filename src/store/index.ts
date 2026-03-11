import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PlayerConfig, Category, LiveChannel } from '../types/iptv';
import { saveLargeData, loadLargeData, clearLargeData } from '../utils/storage';

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
  isDiskDataLoaded: boolean;
  setConfig: (config: PlayerConfig | null) => void;
  addProvider: (provider: PlayerConfig) => void;
  removeProvider: (id: string) => void;
  setUpdateIntervalHours: (hours: number) => void;
  setLastProviderUpdate: (time: number) => void;
  setLastEpgUpdate: (time: number) => void;
  setCategories: (categories: Category[], skipSave?: boolean) => void;
  setChannels: (channels: LiveChannel[], skipSave?: boolean) => void;
  setEpgData: (epgData: Record<string, any[]>, skipSave?: boolean) => void;
  setPin: (pin: string | null) => void;
  setShowAdult: (showAdult: boolean) => void;
  setDiskDataLoaded: (loaded: boolean) => void;
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
      isDiskDataLoaded: false,
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
      setCategories: (categories, skipSave) => {
        set({ categories });
        if (!skipSave) saveLargeData('categories.json', categories);
      },
      setChannels: (channels, skipSave) => {
        set({ channels });
        if (!skipSave) saveLargeData('channels.json', channels);
      },
      setEpgData: (epgData, skipSave) => {
        set({ epgData });
        if (!skipSave) saveLargeData('epgData.json', epgData);
      },
      setPin: (pin) => set({ pin }),
      setShowAdult: (showAdult) => set({ showAdult }),
      setDiskDataLoaded: (loaded) => set({ isDiskDataLoaded: loaded }),
      clearState: () => {
        set({ config: null, providers: [], categories: [], channels: [], epgData: {}, pin: null, showAdult: false, lastProviderUpdate: 0, lastEpgUpdate: 0 });
        clearLargeData('categories.json');
        clearLargeData('channels.json');
        clearLargeData('epgData.json');
      },
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
        pin: state.pin,
        showAdult: state.showAdult,
        // Do not persist large lists in AsyncStorage
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          Promise.all([
            loadLargeData('categories.json'),
            loadLargeData('channels.json'),
            loadLargeData('epgData.json')
          ]).then(([cats, chans, epg]) => {
            if (cats) state.setCategories(cats, true);
            if (chans) state.setChannels(chans, true);
            if (epg) state.setEpgData(epg, true);
            state.setDiskDataLoaded(true);
          }).catch((err) => {
            console.error('Failed to load disk data during rehydration:', err);
            state.setDiskDataLoaded(true); // Always set to true so app can start
          });
        }
      }
    }
  )
);
