import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import { resources } from './i18nResources';

let language = Localization.getLocales()[0]?.languageCode || 'en';
// Default to English if the user language is not supported
if (!resources[language as keyof typeof resources]) {
  language = 'en';
}

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: language,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
