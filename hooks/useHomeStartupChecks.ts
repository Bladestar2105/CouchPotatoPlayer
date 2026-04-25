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
  t: (key: string) => string;
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
  t,
}: UseHomeStartupChecksParams) => {
  useEffect(() => {
    if (!isInitializing && !isLoading && currentProfile && !pin && hasAdultContent) {
      navigateToPinSetup();
    }
  }, [isInitializing, isLoading, currentProfile, hasAdultContent, pin, navigateToPinSetup]);

  useEffect(() => {
    if (!(currentProfile && !isInitializing && !isLoading && !hasCheckedOnStartup)) return;

    setHasCheckedOnStartup(true);
    const timeoutId = setTimeout(() => {
      if (!Platform.isTV) {
        void loadProfile(currentProfile, true);
        return;
      }
      Alert.alert(
        t('startupRefreshTitle'),
        t('startupRefreshMessage'),
        [
          { text: t('no'), style: 'cancel', onPress: () => { void loadEPG(false, { preferCache: true }); } },
          { text: t('yes'), onPress: () => loadProfile(currentProfile, true) },
        ],
        { cancelable: true },
      );
    }, 500);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [currentProfile, isInitializing, isLoading, hasCheckedOnStartup, setHasCheckedOnStartup, loadProfile, loadEPG, t]);
};
