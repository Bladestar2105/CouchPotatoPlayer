import axios from 'axios';
import { XtreamService } from './xtream';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('XtreamService', () => {
  const config = {
    serverUrl: 'http://example.com',
    username: 'testuser',
    password: 'testpassword',
    type: 'xtream' as const,
  };

  let service: XtreamService;

  beforeEach(() => {
    service = new XtreamService(config);
    jest.clearAllMocks();
  });

  describe('buildUrl', () => {
    it('should build a basic URL without extra params', () => {
      // @ts-ignore - accessing private method for test
      const url = service.buildUrl('get_live_categories');
      expect(url).toBe('http://example.com/player_api.php?username=testuser&password=testpassword&action=get_live_categories');
    });

    it('should build a URL with extra params', () => {
      // @ts-ignore - accessing private method for test
      const url = service.buildUrl('get_live_streams', { category_id: '123', limit: 10 });
      expect(url).toBe('http://example.com/player_api.php?username=testuser&password=testpassword&action=get_live_streams&category_id=123&limit=10');
    });

    it('should handle trailing slash in serverUrl correctly', () => {
      const configWithSlash = { ...config, serverUrl: 'http://example.com/' };
      const serviceWithSlash = new XtreamService(configWithSlash);
      // @ts-ignore
      const url = serviceWithSlash.buildUrl('test');
      expect(url).toBe('http://example.com/player_api.php?username=testuser&password=testpassword&action=test');
    });
  });

  describe('getLiveCategories', () => {
    it('should call axios.get with correct URL', async () => {
      const mockData = [{ category_id: '1', category_name: 'Test' }];
      mockedAxios.get.mockResolvedValue({ data: mockData });

      const result = await service.getLiveCategories();

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'http://example.com/player_api.php?username=testuser&password=testpassword&action=get_live_categories'
      );
      expect(result).toEqual(mockData);
    });
  });

  describe('getLiveStreams', () => {
    it('should call axios.get with category_id if provided', async () => {
      mockedAxios.get.mockResolvedValue({ data: [] });

      await service.getLiveStreams('123');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'http://example.com/player_api.php?username=testuser&password=testpassword&action=get_live_streams&category_id=123'
      );
    });

    it('should call axios.get without category_id if not provided', async () => {
      mockedAxios.get.mockResolvedValue({ data: [] });

      await service.getLiveStreams();

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'http://example.com/player_api.php?username=testuser&password=testpassword&action=get_live_streams'
      );
    });
  });
});
