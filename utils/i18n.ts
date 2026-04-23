import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import { resources } from './i18nResources';
import { resolveLanguageFromLocales } from './resolveLanguage';

type SupportedLanguage = keyof typeof resources;

export const resolveLanguage = (locales = Localization.getLocales()): SupportedLanguage =>
  resolveLanguageFromLocales(locales, resources) as SupportedLanguage;

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
