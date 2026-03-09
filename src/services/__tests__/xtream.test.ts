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
      expect(url).toBe('http://example.com/live/user%2Fname/pass%26word/123.m3u8');
    });

    it('should use "ts" as the default extension if not provided', () => {
      const url = service.getLiveStreamUrl(456);
      expect(url).toBe('http://example.com/live/user%2Fname/pass%26word/456.ts');
    });

    it('should properly trim whitespace from username and password before encoding', () => {
      const dirtyConfig: PlayerConfig = {
        serverUrl: 'http://example.com/',
        username: '  user/name  ',
        password: '  pass&word  ',
        type: 'xtream'
      };
      const dirtyService = new XtreamService(dirtyConfig);
      const url = dirtyService.getLiveStreamUrl(789, 'mp4');
      expect(url).toBe('http://example.com/live/user%2Fname/pass%26word/789.mp4');
    });

    it('should handle undefined passwords gracefully by falling back to empty string', () => {
      const noPasswordConfig: PlayerConfig = {
        serverUrl: 'http://example.com/',
        username: 'user/name',
        type: 'xtream'
      } as PlayerConfig;
      const noPasswordService = new XtreamService(noPasswordConfig);
      const url = noPasswordService.getLiveStreamUrl(101, 'mkv');
      expect(url).toBe('http://example.com/live/user%2Fname//101.mkv');
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
