import { describe, test, expect } from './bunTestCompat';
import { deriveRuntimePlatformInfo, adaptiveValueFor, gridColumnsFor } from '../platform';

describe('platform utils', () => {
  test('detects iOS correctly', () => {
    const info = deriveRuntimePlatformInfo({ os: 'ios', isTVFlag: false, width: 390, height: 844 });
    expect(info.isIOS).toBe(true);
    expect(info.isAndroid).toBe(false);
    expect(info.isWeb).toBe(false);
    expect(info.isTV).toBe(false);
    expect(info.isMobile).toBe(true);
  });

  test('detects Android correctly', () => {
    const info = deriveRuntimePlatformInfo({ os: 'android', isTVFlag: false, width: 360, height: 800 });
    expect(info.isIOS).toBe(false);
    expect(info.isAndroid).toBe(true);
    expect(info.isWeb).toBe(false);
    expect(info.isTV).toBe(false);
    expect(info.isMobile).toBe(true);
  });

  test('detects Web correctly', () => {
    const info = deriveRuntimePlatformInfo({ os: 'web', isTVFlag: false, width: 1920, height: 1080 });
    expect(info.isWeb).toBe(true);
    expect(info.isTV).toBe(false);
    expect(info.isMobile).toBe(false);
  });

  test('detects tvOS as TV', () => {
    const info = deriveRuntimePlatformInfo({ os: 'tvos', isTVFlag: true, width: 1920, height: 1080 });
    expect(info.isTV).toBe(true);
    expect(info.isMobile).toBe(false);
  });

  test('detects Android TV via isTV flag', () => {
    const info = deriveRuntimePlatformInfo({ os: 'android', isTVFlag: true, width: 1920, height: 1080 });
    expect(info.isTV).toBe(true);
    expect(info.isMobile).toBe(false);
  });

  test('detects Android TV via large screen heuristic', () => {
    const info = deriveRuntimePlatformInfo({ os: 'android', isTVFlag: false, width: 1000, height: 1000 });
    expect(info.isTV).toBe(true);
    expect(info.isMobile).toBe(false);
  });

  test('adaptiveValue returns correct values', () => {
    const opts = { tv: 'tv-val', mobile: 'mobile-val', web: 'web-val' };
    expect(adaptiveValueFor(opts, { isTV: true, isWeb: false })).toBe('tv-val');
    expect(adaptiveValueFor(opts, { isTV: false, isWeb: true })).toBe('web-val');
    expect(adaptiveValueFor(opts, { isTV: false, isWeb: false })).toBe('mobile-val');
  });

  test('adaptiveValue handles edge cases and falsy values', () => {
    expect(adaptiveValueFor({ tv: 'tv', mobile: 'mobile' }, { isTV: false, isWeb: true })).toBe('mobile');
    expect(adaptiveValueFor({ tv: 1, mobile: 2, web: 0 }, { isTV: false, isWeb: true })).toBe(0);
    expect(adaptiveValueFor({ tv: '', mobile: 'mobile' }, { isTV: true, isWeb: false })).toBe('');
    expect(adaptiveValueFor({ tv: true, mobile: false }, { isTV: false, isWeb: false })).toBe(false);
    expect(adaptiveValueFor({ tv: {}, mobile: null }, { isTV: false, isWeb: false })).toBe(null);
  });

  test('gridColumns returns correct values', () => {
    expect(gridColumnsFor({ isTV: true, isWeb: false, width: 1920, height: 1080 })).toBe(3);
    expect(gridColumnsFor({ isTV: false, isWeb: true, width: 1920, height: 1080 })).toBe(4);
    expect(gridColumnsFor({ isTV: false, isWeb: false, width: 390, height: 844 })).toBe(2);
    expect(gridColumnsFor({ isTV: false, isWeb: false, width: 844, height: 390 })).toBe(3);
  });
});
