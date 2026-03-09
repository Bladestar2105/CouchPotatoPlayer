import { useAppStore } from '../index';
import { PlayerConfig, Category, LiveChannel } from '../../types/iptv';

describe('useAppStore', () => {
  const mockConfig: PlayerConfig = {
    serverUrl: 'http://test.com',
    username: 'testuser',
    password: 'testpassword',
    type: 'xtream',
  };

  const mockCategories: Category[] = [
    { category_id: '1', category_name: 'Test Category', parent_id: 0 },
  ];

  const mockChannels: LiveChannel[] = [
    {
      num: 1,
      name: 'Test Channel',
      stream_type: 'live',
      stream_id: 123,
      stream_icon: '',
      epg_channel_id: 'test',
      added: '0',
      category_id: '1',
      custom_sid: '',
      tv_archive: 0,
      direct_source: '',
      tv_archive_duration: 0,
    },
  ];

  beforeEach(() => {
    // Clear the store state before each test
    useAppStore.getState().clearState();
  });

  it('should have correct initial state', () => {
    const state = useAppStore.getState();
    expect(state.config).toBeNull();
    expect(state.categories).toEqual([]);
    expect(state.channels).toEqual([]);
  });

  it('should set config', () => {
    useAppStore.getState().setConfig(mockConfig);
    const state = useAppStore.getState();
    expect(state.config).toEqual(mockConfig);
  });

  it('should set categories', () => {
    useAppStore.getState().setCategories(mockCategories);
    const state = useAppStore.getState();
    expect(state.categories).toEqual(mockCategories);
  });

  it('should set channels', () => {
    useAppStore.getState().setChannels(mockChannels);
    const state = useAppStore.getState();
    expect(state.channels).toEqual(mockChannels);
  });

  it('should clear state', () => {
    // First set some state
    useAppStore.getState().setConfig(mockConfig);
    useAppStore.getState().setCategories(mockCategories);
    useAppStore.getState().setChannels(mockChannels);

    // Verify state is set
    expect(useAppStore.getState().config).not.toBeNull();
    expect(useAppStore.getState().categories).not.toHaveLength(0);

    // Clear state
    useAppStore.getState().clearState();

    // Verify it's back to initial state
    const state = useAppStore.getState();
    expect(state.config).toBeNull();
    expect(state.categories).toEqual([]);
    expect(state.channels).toEqual([]);
  });
});
