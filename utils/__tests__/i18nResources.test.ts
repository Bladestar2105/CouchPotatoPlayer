import { describe, expect, test } from './bunTestCompat';
import { resources, SUPPORTED_LOCALES } from '../i18nResources';

const localeKeys = SUPPORTED_LOCALES.map(locale => Object.keys(resources[locale].translation));
const referenceKeys = localeKeys[0];

describe('i18n resources consistency', () => {
  test('supported locale list matches bundled resources', () => {
    expect(Object.keys(resources).sort()).toEqual([...SUPPORTED_LOCALES].sort());
  });

  test('all locales expose the same translation keys', () => {
    for (const keys of localeKeys) {
      expect(keys.sort()).toEqual([...referenceKeys].sort());
    }
  });

  test('no translation value is an empty string', () => {
    for (const locale of SUPPORTED_LOCALES) {
      const entries = Object.entries(resources[locale].translation);
      for (const [_key, value] of entries) {
        expect(typeof value).toBe('string');
        expect(value.trim().length).toBeGreaterThan(0);
      }
    }
  });

  test('TV startup refresh prompt is translated in every locale', () => {
    // `useHomeStartupChecks` shows a platform-native Alert on TV at app launch
    // and previously hard-coded the German strings, leaving English / French /
    // Greek users with a German prompt. Guarantee every locale provides the
    // required keys so the regression cannot silently return.
    for (const locale of SUPPORTED_LOCALES) {
      const t = resources[locale].translation as Record<string, string>;
      expect(t.startupRefreshTitle, `${locale} must translate startupRefreshTitle`).toBeTruthy();
      expect(t.startupRefreshMessage, `${locale} must translate startupRefreshMessage`).toBeTruthy();
    }
  });
});
