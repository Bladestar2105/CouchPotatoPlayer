import axios from 'axios';
import { XtreamService } from '../xtream';
import { PlayerConfig } from '../../types/iptv';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('XtreamService', () => {
  const config: PlayerConfig = {
    serverUrl: 'http://example.com/',
    username: 'user/name',
    password: 'pass&word',
    type: 'xtream'
  };

  let service: XtreamService;

  beforeEach(() => {
    service = new XtreamService(config);
    jest.clearAllMocks();
  });

  describe('getLiveStreamUrl', () => {
    it('should correctly encode username and password in stream URL', () => {
      const url = service.getLiveStreamUrl(123, 'm3u8');
      // Current implementation will fail this because it doesn't encode
      expect(url).toBe('http://example.com/live/user%2Fname/pass%26word/123.m3u8');
    });
  });

  describe('authenticate', () => {
    it('should correctly encode username and password in auth URL', async () => {
      mockedAxios.get.mockResolvedValue({ data: {} });
      await service.authenticate();

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'http://example.com/player_api.php?username=user%2Fname&password=pass%26word'
      );
    });
  });

  describe('buildUrl (via getLiveCategories)', () => {
    it('should correctly encode username and password in API URLs', async () => {
      mockedAxios.get.mockResolvedValue({ data: [] });
      await service.getLiveCategories();

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'http://example.com/player_api.php?username=user%2Fname&password=pass%26word&action=get_live_categories'
      );
    });
  });
});
