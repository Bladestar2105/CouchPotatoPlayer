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

  it('should handle multiple channels and programmes and return them as arrays', async () => {
    const mockXml = `
      <tv>
        <channel id="channel1">
          <display-name>Channel 1</display-name>
        </channel>
        <channel id="channel2">
          <display-name>Channel 2</display-name>
        </channel>
        <programme channel="channel1" start="20230101000000" stop="20230101010000">
          <title>Program 1</title>
        </programme>
        <programme channel="channel2" start="20230101000000" stop="20230101010000">
          <title>Program 2</title>
        </programme>
      </tv>
    `;
    mockedAxios.get.mockResolvedValueOnce({ data: mockXml });

    const result = await parser.fetchAndParseEPG();
    expect(Array.isArray(result.channels)).toBe(true);
    expect(Array.isArray(result.programmes)).toBe(true);
    expect(result.channels).toHaveLength(2);
    expect(result.programmes).toHaveLength(2);
  });

  it('should throw error for invalid XMLTV format (missing <tv> tag)', async () => {
    const mockXml = '<invalid></invalid>';
    mockedAxios.get.mockResolvedValueOnce({ data: mockXml });

    await expect(parser.fetchAndParseEPG()).rejects.toThrow('Invalid XMLTV format');
  });

  it('should throw error for invalid XML data (parser failure)', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: undefined });

    await expect(parser.fetchAndParseEPG()).rejects.toThrow();
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

  it('should handle non-Error exceptions being thrown', async () => {
    mockedAxios.get.mockRejectedValueOnce('String Error');

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(parser.fetchAndParseEPG()).rejects.toEqual('String Error');

    expect(consoleSpy).toHaveBeenCalledWith('Failed to parse XMLTV:', 'Unknown error');
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

  it('should return empty array if undefined provided to getChannelProgrammes', () => {
    expect(parser.getChannelProgrammes(undefined as any, 'channel1')).toEqual([]);
  });

  it('should return empty array if empty array provided to getChannelProgrammes', () => {
    expect(parser.getChannelProgrammes([], 'channel1')).toEqual([]);
  });

  it('should return empty array if no programmes match the channel ID', () => {
    const programmes = [
      { '@_channel': 'channel2', title: 'P2' },
      { '@_channel': 'channel3', title: 'P3' },
    ];
    const result = parser.getChannelProgrammes(programmes, 'channel1');
    expect(result).toEqual([]);
  });

  it('should handle programme objects missing the @_channel attribute', () => {
    const programmes = [
      { title: 'P1' }, // Missing @_channel
      { '@_channel': 'channel1', title: 'P2' },
    ];
    const result = parser.getChannelProgrammes(programmes, 'channel1');
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('P2');
  });
});
