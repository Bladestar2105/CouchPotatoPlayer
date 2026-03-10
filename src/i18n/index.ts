import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { Platform, NativeModules } from 'react-native';

const en = {
  translation: {
    sidebar: {
      live: 'Live TV',
      movies: 'Movies',
      series: 'Series',
      search: 'Search',
      settings: 'Settings'
    },
    home: {
      recentlyWatched: 'Recently Watched',
      nothingToSeeHere: 'Nothing to see here...',
      noChannels: 'No channels found...'
    },
    login: {
      iptvManagerOnly: 'This app is only compatible with the IPTV-Manager.'
    }
  }
};

const de = {
  translation: {
    sidebar: {
      live: 'Live TV',
      movies: 'Filme',
      series: 'Serien',
      search: 'Suche',
      settings: 'Einstellungen'
    },
    home: {
      recentlyWatched: 'Zuletzt gesehen',
      nothingToSeeHere: 'Hier gibt es nichts zu sehen...',
      noChannels: 'Keine Kanäle gefunden...'
    },
    login: {
      iptvManagerOnly: 'Die App ist nur mit dem IPTV-Manager kompatibel.'
    }
  }
};

const getSystemLanguage = () => {
  let locale = 'en';
  if (Platform.OS === 'ios') {
    locale = NativeModules.SettingsManager?.settings?.AppleLocale ||
             NativeModules.SettingsManager?.settings?.AppleLanguages[0] ||
             'en';
  } else if (Platform.OS === 'android') {
    locale = NativeModules.I18nManager?.localeIdentifier || 'en';
  } else if (Platform.OS === 'web') {
    locale = navigator.language || 'en';
  }
  return locale.split(/[-_]/)[0].toLowerCase();
};

i18n
  .use(initReactI18next)
  .init({
    resources: { en, de },
    lng: getSystemLanguage(),
    fallbackLng: 'en',
    interpolation: { escapeValue: false }
  });

export default i18n;
