import { describe, test, expect, mock, afterEach } from "bun:test";

/**
 * Helper to re-import the platform module for each test case.
 * In Bun, imports are cached by default. Using a unique query parameter
 * forces Bun to re-evaluate the module with the currently active mocks.
 */
async function getPlatformUtils() {
  return await import("../platform?" + Math.random());
}

describe("platform utils", () => {
  const originalPlatform = require('react-native').Platform;
  const originalDimensions = require('react-native').Dimensions;

  afterEach(() => {
    // Reset mocks between tests to ensure no leakage
    mock.module("react-native", () => ({
      Platform: originalPlatform,
      Dimensions: originalDimensions,
    }));
  });

  test("detects iOS correctly", async () => {
    mock.module("react-native", () => ({
      Platform: { OS: 'ios', isTV: false },
      Dimensions: { get: () => ({ width: 390, height: 844 }) }
    }));

    const { isIOS, isAndroid, isWeb, isTV, isMobile } = await getPlatformUtils();
    expect(isIOS).toBe(true);
    expect(isAndroid).toBe(false);
    expect(isWeb).toBe(false);
    expect(isTV).toBe(false);
    expect(isMobile).toBe(true);
  });

  test("detects Android correctly", async () => {
    mock.module("react-native", () => ({
      Platform: { OS: 'android', isTV: false },
      Dimensions: { get: () => ({ width: 360, height: 800 }) }
    }));

    const { isIOS, isAndroid, isWeb, isTV, isMobile } = await getPlatformUtils();
    expect(isIOS).toBe(false);
    expect(isAndroid).toBe(true);
    expect(isWeb).toBe(false);
    expect(isTV).toBe(false);
    expect(isMobile).toBe(true);
  });

  test("detects Web correctly", async () => {
    mock.module("react-native", () => ({
      Platform: { OS: 'web', isTV: false },
      Dimensions: { get: () => ({ width: 1920, height: 1080 }) }
    }));

    const { isIOS, isAndroid, isWeb, isTV, isMobile } = await getPlatformUtils();
    expect(isWeb).toBe(true);
    expect(isTV).toBe(false);
    expect(isMobile).toBe(false);
  });

  test("detects tvOS as TV", async () => {
    mock.module("react-native", () => ({
      Platform: { OS: 'tvos', isTV: true },
      Dimensions: { get: () => ({ width: 1920, height: 1080 }) }
    }));

    const { isTV, isMobile } = await getPlatformUtils();
    expect(isTV).toBe(true);
    expect(isMobile).toBe(false);
  });

  test("detects Android TV via isTV flag", async () => {
    mock.module("react-native", () => ({
      Platform: { OS: 'android', isTV: true },
      Dimensions: { get: () => ({ width: 1920, height: 1080 }) }
    }));

    const { isTV, isMobile } = await getPlatformUtils();
    expect(isTV).toBe(true);
    expect(isMobile).toBe(false);
  });

  test("detects Android TV via large screen heuristic", async () => {
    mock.module("react-native", () => ({
      Platform: { OS: 'android', isTV: false },
      Dimensions: { get: () => ({ width: 1000, height: 1000 }) }
    }));

    const { isTV, isMobile } = await getPlatformUtils();
    expect(isTV).toBe(true);
    expect(isMobile).toBe(false);
  });

  test("adaptiveValue returns correct values", async () => {
    const opts = { tv: 'tv-val', mobile: 'mobile-val', web: 'web-val' };

    // Test TV
    mock.module("react-native", () => ({
      Platform: { OS: 'ios', isTV: true },
      Dimensions: { get: () => ({ width: 1920, height: 1080 }) }
    }));
    let utils = await getPlatformUtils();
    expect(utils.adaptiveValue(opts)).toBe('tv-val');

    // Test Web
    mock.module("react-native", () => ({
      Platform: { OS: 'web', isTV: false },
      Dimensions: { get: () => ({ width: 1920, height: 1080 }) }
    }));
    utils = await getPlatformUtils();
    expect(utils.adaptiveValue(opts)).toBe('web-val');

    // Test Mobile
    mock.module("react-native", () => ({
      Platform: { OS: 'ios', isTV: false },
      Dimensions: { get: () => ({ width: 390, height: 844 }) }
    }));
    utils = await getPlatformUtils();
    expect(utils.adaptiveValue(opts)).toBe('mobile-val');
  });

  test("gridColumns returns correct values", async () => {
    // TV
    mock.module("react-native", () => ({
      Platform: { OS: 'ios', isTV: true },
      Dimensions: { get: () => ({ width: 1920, height: 1080 }) }
    }));
    let utils = await getPlatformUtils();
    expect(utils.gridColumns()).toBe(3);

    // Web
    mock.module("react-native", () => ({
      Platform: { OS: 'web', isTV: false },
      Dimensions: { get: () => ({ width: 1920, height: 1080 }) }
    }));
    utils = await getPlatformUtils();
    expect(utils.gridColumns()).toBe(4);

    // Mobile Portrait
    mock.module("react-native", () => ({
      Platform: { OS: 'ios', isTV: false },
      Dimensions: { get: () => ({ width: 390, height: 844 }) }
    }));
    utils = await getPlatformUtils();
    expect(utils.gridColumns()).toBe(2);

    // Mobile Landscape
    mock.module("react-native", () => ({
      Platform: { OS: 'ios', isTV: false },
      Dimensions: { get: () => ({ width: 844, height: 390 }) }
    }));
    utils = await getPlatformUtils();
    expect(utils.gridColumns()).toBe(3);
  });
});
