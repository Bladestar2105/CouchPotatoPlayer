import { describe, expect, test, mock, afterEach } from './bunTestCompat';
import { vi } from 'vitest';

// Mock react-native so the hook module can resolve `Platform` / `useCallback`.
mock.module('react-native', () => ({
  Platform: { OS: 'ios', isTV: false },
}));

// The hook pulls two IPTV slices — we stub the whole module to drive the
// inputs deterministically without spinning up the full provider.
type MockState = {
  isUpdating: boolean;
  currentProfile: { id: string } | null;
  loadProfile: ReturnType<typeof vi.fn>;
};

let state: MockState;

mock.module('../../context/IPTVContext', () => ({
  useIPTVAppState: () => ({ isUpdating: state.isUpdating }),
  useIPTVProfiles: () => ({
    currentProfile: state.currentProfile,
    loadProfile: state.loadProfile,
  }),
}));

// Minimal React stub: record useCallback factory, return its closure verbatim.
mock.module('react', () => ({
  useCallback: (cb: any) => cb,
}));

async function loadHook() {
  return await import('../../hooks/usePullToRefresh');
}

describe('usePullToRefresh', () => {
  afterEach(() => {
    vi.resetModules();
  });

  test('calls loadProfile(currentProfile, true) on refresh', async () => {
    state = {
      isUpdating: false,
      currentProfile: { id: 'prof-1' },
      loadProfile: vi.fn().mockResolvedValue(undefined),
    };
    const { usePullToRefresh } = await loadHook();
    const { refreshing, onRefresh } = usePullToRefresh();
    expect(refreshing).toBe(false);
    onRefresh();
    expect(state.loadProfile).toHaveBeenCalledTimes(1);
    expect(state.loadProfile).toHaveBeenCalledWith({ id: 'prof-1' }, true);
  });

  test('does nothing when a refresh is already in flight', async () => {
    state = {
      isUpdating: true,
      currentProfile: { id: 'prof-1' },
      loadProfile: vi.fn(),
    };
    const { usePullToRefresh } = await loadHook();
    const { refreshing, onRefresh } = usePullToRefresh();
    expect(refreshing).toBe(true);
    onRefresh();
    expect(state.loadProfile).not.toHaveBeenCalled();
  });

  test('does nothing when there is no active profile', async () => {
    state = {
      isUpdating: false,
      currentProfile: null,
      loadProfile: vi.fn(),
    };
    const { usePullToRefresh } = await loadHook();
    const { onRefresh } = usePullToRefresh();
    onRefresh();
    expect(state.loadProfile).not.toHaveBeenCalled();
  });
});
