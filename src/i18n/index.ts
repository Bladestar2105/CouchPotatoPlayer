import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

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
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources: { en, de },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false }
  });

export default i18n;
