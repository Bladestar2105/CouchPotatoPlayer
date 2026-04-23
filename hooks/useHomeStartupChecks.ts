import { useEffect } from 'react';
import { Alert, Platform } from 'react-native';
import type { IPTVProfile } from '../types';

interface UseHomeStartupChecksParams {
  isInitializing: boolean;
  isLoading: boolean;
  currentProfile: IPTVProfile | null;
  pin: string | null;
  hasAdultContent: boolean;
  hasCheckedOnStartup: boolean;
  setHasCheckedOnStartup: (checked: boolean) => void;
  loadProfile: (profile: IPTVProfile, forceUpdate?: boolean) => Promise<void>;
  loadEPG: (forceUpdate?: boolean, options?: { preferCache?: boolean }) => Promise<void>;
  navigateToPinSetup: () => void;
}

export const useHomeStartupChecks = ({
  isInitializing,
  isLoading,
  currentProfile,
  pin,
  hasAdultContent,
  hasCheckedOnStartup,
  setHasCheckedOnStartup,
  loadProfile,
  loadEPG,
  navigateToPinSetup,
}: UseHomeStartupChecksParams) => {
  useEffect(() => {
    if (!isInitializing && !isLoading && currentProfile && !pin && hasAdultContent) {
      navigateToPinSetup();
    }
  }, [isInitializing, isLoading, currentProfile, hasAdultContent, pin, navigateToPinSetup]);

  useEffect(() => {
    if (currentProfile && !isInitializing && !isLoading && !hasCheckedOnStartup) {
      setHasCheckedOnStartup(true);
      setTimeout(() => {
        if (!Platform.isTV) {
          void loadEPG(false, { preferCache: true });
          return;
        }
        Alert.alert(
          'Playlist aktualisieren?',
          'Möchten Sie die Playlist und das EPG jetzt aktualisieren?',
          [
            { text: 'Nein', style: 'cancel', onPress: () => { void loadEPG(false, { preferCache: true }); } },
            { text: 'Ja', onPress: () => loadProfile(currentProfile, true) },
          ],
          { cancelable: true },
        );
      }, 500);
    }
  }, [currentProfile, isInitializing, isLoading, hasCheckedOnStartup, setHasCheckedOnStartup, loadProfile, loadEPG]);
};
