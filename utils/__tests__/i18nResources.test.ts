import { describe, expect, test } from 'bun:test';
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
      for (const [key, value] of entries) {
        expect(typeof value).toBe('string');
        expect(value.trim().length).toBeGreaterThan(0);
      }
    }
  });
});
