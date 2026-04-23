import { useEffect } from 'react';
import { Alert, BackHandler, TVEventControl, NativeModules } from 'react-native';

import type { HomeContentRef, TabId } from '../components/home/types';


interface UseHomeBackHandlerParams {
  isFocused: boolean;
  isTV: boolean;
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  getActiveContentRef: () => React.RefObject<HomeContentRef | null>;
  t: (key: string) => string;
}

export const useHomeBackHandler = ({
  isFocused,
  isTV,
  activeTab,
  setActiveTab,
  getActiveContentRef,
  t,
}: UseHomeBackHandlerParams) => {
  useEffect(() => {
    if (!isFocused) return;

    if (isTV && TVEventControl?.enableTVMenuKey) {
      TVEventControl.enableTVMenuKey();
    }

    const onBack = () => {
      if (getActiveContentRef().current?.handleBack?.()) {
        return true;
      }

      if (activeTab !== 'channels') {
        setActiveTab('channels');
        return true;
      }

      Alert.alert(
        t('exitAppTitle'),
        t('exitAppMessage'),
        [
          { text: t('no'), style: 'cancel' },
          {
            text: t('yes'),
            style: 'destructive',
            onPress: () => {
              if (isTV && TVEventControl?.disableTVMenuKey) {
                TVEventControl.disableTVMenuKey();
              }

              const rnExitApp = (NativeModules as any)?.RNExitApp;
              if (rnExitApp?.exitApp) {
                try {
                  rnExitApp.exitApp();
                } catch (_) {}
              }

              try {
                BackHandler.exitApp();
              } catch (_) {}
            },
          },
        ],
        { cancelable: false },
      );

      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', onBack);

    return () => {
      if (isTV && TVEventControl?.disableTVMenuKey) {
        TVEventControl.disableTVMenuKey();
      }
      backHandler.remove();
    };
  }, [isFocused, isTV, activeTab, setActiveTab, getActiveContentRef, t]);
};
