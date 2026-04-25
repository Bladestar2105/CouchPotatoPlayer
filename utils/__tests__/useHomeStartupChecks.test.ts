import { afterEach, beforeEach, describe, expect, mock, test } from './bunTestCompat';
import { vi } from 'vitest';

const alertSpy = vi.fn();
const platform = { OS: 'ios', isTV: false };
let registeredEffects: Array<() => void> = [];

mock.module('react', () => ({
  useEffect: (cb: () => void) => {
    registeredEffects.push(cb);
  },
}));

mock.module('react-native', () => ({
  Alert: { alert: alertSpy },
  Platform: platform,
}));

async function loadHook() {
  return await import('../../hooks/useHomeStartupChecks');
}

function runEffects() {
  registeredEffects.forEach((effect) => {
    effect();
  });
}

describe('useHomeStartupChecks', () => {
  const originalSetTimeout = global.setTimeout;
  const originalClearTimeout = global.clearTimeout;

  beforeEach(() => {
    registeredEffects = [];
    alertSpy.mockReset();
    platform.OS = 'ios';
    platform.isTV = false;
    vi.spyOn(global, 'setTimeout').mockImplementation(((fn: (...args: any[]) => void) => {
      fn();
      return 1 as unknown as ReturnType<typeof setTimeout>;
    }) as typeof setTimeout);
    vi.spyOn(global, 'clearTimeout').mockImplementation((() => undefined) as typeof clearTimeout);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    global.setTimeout = originalSetTimeout;
    global.clearTimeout = originalClearTimeout;
  });

  test('non-TV startup refresh triggers full profile reload', async () => {
    const loadProfile = vi.fn().mockResolvedValue(undefined);
    const loadEPG = vi.fn().mockResolvedValue(undefined);
    const currentProfile = { id: 'p1', type: 'm3u', name: 'Provider', url: 'https://example.com/list.m3u' } as any;
    const { useHomeStartupChecks } = await loadHook();

    useHomeStartupChecks({
      isInitializing: false,
      isLoading: false,
      currentProfile,
      pin: null,
      hasAdultContent: false,
      hasCheckedOnStartup: false,
      setHasCheckedOnStartup: vi.fn(),
      loadProfile,
      loadEPG,
      navigateToPinSetup: vi.fn(),
      t: (key: string) => key,
    });

    runEffects();

    expect(loadProfile).toHaveBeenCalledTimes(1);
    expect(loadProfile).toHaveBeenCalledWith(currentProfile, true);
    expect(loadEPG).not.toHaveBeenCalled();
  });

  test('TV startup prompt yes triggers full profile reload', async () => {
    platform.isTV = true;
    const loadProfile = vi.fn().mockResolvedValue(undefined);
    const loadEPG = vi.fn().mockResolvedValue(undefined);
    const currentProfile = { id: 'p1', type: 'm3u', name: 'Provider', url: 'https://example.com/list.m3u' } as any;
    const { useHomeStartupChecks } = await loadHook();

    useHomeStartupChecks({
      isInitializing: false,
      isLoading: false,
      currentProfile,
      pin: null,
      hasAdultContent: false,
      hasCheckedOnStartup: false,
      setHasCheckedOnStartup: vi.fn(),
      loadProfile,
      loadEPG,
      navigateToPinSetup: vi.fn(),
      t: (key: string) => key,
    });

    runEffects();

    expect(alertSpy).toHaveBeenCalledTimes(1);
    const buttons = alertSpy.mock.calls[0][2] as Array<{ onPress?: () => void }>;
    buttons[1]?.onPress?.();

    expect(loadProfile).toHaveBeenCalledTimes(1);
    expect(loadProfile).toHaveBeenCalledWith(currentProfile, true);
    expect(loadEPG).not.toHaveBeenCalled();
  });
});
