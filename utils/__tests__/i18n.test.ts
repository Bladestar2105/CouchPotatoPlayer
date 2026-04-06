import { describe, test, expect, mock } from "bun:test";

let mockLanguageCode = 'en';

mock.module('expo-localization', () => {
  return {
    getLocales: () => [{ languageCode: mockLanguageCode }]
  };
});

import i18n, { resolveLanguage } from '../i18n';

describe('i18n', () => {
  test('should fallback to en when locale is not supported', async () => {
    expect(i18n.language).toBe('en');
  });

  test('should resolve language from languageCode', () => {
    expect(resolveLanguage([{ languageCode: 'de' } as any])).toBe('de');
  });

  test('should resolve language from languageTag when languageCode is unavailable', () => {
    expect(resolveLanguage([{ languageTag: 'de-DE' } as any])).toBe('de');
  });

  test('should have English translations', () => {
    expect(i18n.t('appTitle', { lng: 'en' })).toBe('My IPTV Profiles');
    expect(i18n.t('error', { lng: 'en' })).toBe('Error');
  });

  test('should have German translations', () => {
    expect(i18n.t('appTitle', { lng: 'de' })).toBe('Meine IPTV-Profile');
    expect(i18n.t('error', { lng: 'de' })).toBe('Fehler');
  });

  test('should have French translations', () => {
    expect(i18n.t('appTitle', { lng: 'fr' })).toBe('Mes Profils IPTV');
    expect(i18n.t('error', { lng: 'fr' })).toBe('Erreur');
  });

  test('should return translation key if translation is missing', () => {
    expect(i18n.t('nonexistentKey', { lng: 'en' })).toBe('nonexistentKey');
  });

  test('should correctly interpolate variables in translations', () => {
     expect(i18n.t('networkError', { lng: 'en', status: '404' })).toBe('Network error: 404');
     expect(i18n.t('profileUpdated', { lng: 'fr', name: 'MyProfile' })).toBe('Profil "MyProfile" mis à jour.');
  });

  test('should handle fallback to fallbackLng (en) correctly from within i18next', () => {
     i18n.addResourceBundle('en', 'translation', { 'fallbackTestKey': 'Fallback Value' }, true, true);
     expect(i18n.t('fallbackTestKey', { lng: 'fr' })).toBe('Fallback Value');
  });
});
