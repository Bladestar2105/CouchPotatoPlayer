import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import { resources } from './i18nResources';

type SupportedLanguage = keyof typeof resources;

export const resolveLanguage = (locales = Localization.getLocales()): SupportedLanguage => {
  for (const locale of locales) {
    const normalizedLanguageCode = locale.languageCode?.toLowerCase();
    const normalizedLanguageTag = locale.languageTag?.toLowerCase();
    const fromLanguageTag = normalizedLanguageTag?.split('-')[0];

    const candidates = [normalizedLanguageCode, fromLanguageTag];
    for (const candidate of candidates) {
      if (candidate && resources[candidate as SupportedLanguage]) {
        return candidate as SupportedLanguage;
      }
    }
  }

  return 'en';
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: resolveLanguage(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
