import { describe, test, expect } from './bunTestCompat';
import i18next from 'i18next';
import { resources } from '../i18nResources';
import { resolveLanguageFromLocales } from '../resolveLanguage';

describe('i18n', () => {
  test('should fallback to en when locale is not supported', async () => {
    expect(resolveLanguageFromLocales([{ languageCode: 'jp' }], resources)).toBe('en');
  });

  test('should resolve language from languageCode', () => {
    expect(resolveLanguageFromLocales([{ languageCode: 'de' }], resources)).toBe('de');
  });

  test('should resolve language from languageTag when languageCode is unavailable', () => {
    expect(resolveLanguageFromLocales([{ languageTag: 'de-DE' }], resources)).toBe('de');
  });

  test('should have English translations', () => {
    expect(resources.en.translation.appTitle).toBe('My IPTV Profiles');
    expect(resources.en.translation.error).toBe('Error');
  });

  test('should have German translations', () => {
    expect(resources.de.translation.appTitle).toBe('Meine IPTV-Profile');
    expect(resources.de.translation.error).toBe('Fehler');
  });

  test('should have French translations', () => {
    expect(resources.fr.translation.appTitle).toBe('Mes Profils IPTV');
    expect(resources.fr.translation.error).toBe('Erreur');
  });

  test('should return translation key if translation is missing', async () => {
    const isolatedI18n = i18next.createInstance();
    await isolatedI18n.init({
      lng: 'en',
      resources,
      fallbackLng: 'en',
      interpolation: { escapeValue: false },
    });
    expect(isolatedI18n.t('nonexistentKey')).toBe('nonexistentKey');
  });

  test('should correctly interpolate variables in translations', () => {
    expect(resources.en.translation.networkError).toContain('{{status}}');
    expect(resources.fr.translation.profileUpdated).toContain('{{name}}');
  });

  test('should handle fallback to fallbackLng (en) correctly from within i18next', async () => {
    const isolatedI18n = i18next.createInstance();
    await isolatedI18n.init({
      lng: 'fr',
      fallbackLng: 'en',
      resources: {
        en: { translation: { fallbackTestKey: 'Fallback Value' } },
        fr: { translation: {} },
      },
    });
    expect(isolatedI18n.t('fallbackTestKey', { lng: 'fr' })).toBe('Fallback Value');
  });
});
