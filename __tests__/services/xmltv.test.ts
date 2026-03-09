import axios from 'axios';
import { XMLTVParser } from '../../src/services/xmltv';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('XMLTVParser', () => {
  const mockUrl = 'http://example.com/epg.xml';
  const parser = new XMLTVParser(mockUrl);

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch and parse valid XMLTV data', async () => {
    const mockXml = `
      <tv>
        <channel id="channel1">
          <display-name>Channel 1</display-name>
        </channel>
        <programme channel="channel1" start="20230101000000" stop="20230101010000">
          <title>Program 1</title>
        </programme>
      </tv>
    `;
    mockedAxios.get.mockResolvedValueOnce({ data: mockXml });

    const result = await parser.fetchAndParseEPG();

    expect(mockedAxios.get).toHaveBeenCalledWith(mockUrl, { responseType: 'text' });
    expect(result.channels).toBeDefined();
    expect(result.programmes).toBeDefined();
    expect(result.channels[0]['@_id']).toBe('channel1');
    expect(result.programmes[0]['@_channel']).toBe('channel1');
  });

  it('should handle single channel and programme and return them as arrays', async () => {
    const mockXml = `
      <tv>
        <channel id="channel1">
          <display-name>Channel 1</display-name>
        </channel>
        <programme channel="channel1" start="20230101000000" stop="20230101010000">
          <title>Program 1</title>
        </programme>
      </tv>
    `;
    mockedAxios.get.mockResolvedValueOnce({ data: mockXml });

    const result = await parser.fetchAndParseEPG();
    expect(Array.isArray(result.channels)).toBe(true);
    expect(Array.isArray(result.programmes)).toBe(true);
    expect(result.channels).toHaveLength(1);
    expect(result.programmes).toHaveLength(1);
  });

  it('should throw error for invalid XMLTV format (missing <tv> tag)', async () => {
    const mockXml = '<invalid></invalid>';
    mockedAxios.get.mockResolvedValueOnce({ data: mockXml });

    await expect(parser.fetchAndParseEPG()).rejects.toThrow('Invalid XMLTV format');
  });

  it('should throw error for empty response', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: '' });

    await expect(parser.fetchAndParseEPG()).rejects.toThrow('Invalid XMLTV format');
  });

  it('should throw error when axios request fails', async () => {
    const networkError = new Error('Network Error');
    mockedAxios.get.mockRejectedValueOnce(networkError);

    // Silencing console.error for this test to keep output clean
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(parser.fetchAndParseEPG()).rejects.toThrow('Network Error');

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should filter programmes by channel ID', () => {
    const programmes = [
      { '@_channel': 'channel1', title: 'P1' },
      { '@_channel': 'channel2', title: 'P2' },
    ];
    const result = parser.getChannelProgrammes(programmes, 'channel1');
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('P1');
  });

  it('should return empty array if no programmes provided to getChannelProgrammes', () => {
    expect(parser.getChannelProgrammes(null as any, 'channel1')).toEqual([]);
  });
});
