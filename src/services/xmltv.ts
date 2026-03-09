import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';

export class XMLTVParser {
  private url: string;

  constructor(url: string) {
    this.url = url;
  }

  async fetchAndParseEPG(): Promise<any> {
    try {
      const response = await axios.get(this.url, { responseType: 'text' });
      const xmlData = response.data;

      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "@_"
      });

      const parsedData = parser.parse(xmlData);

      if (!parsedData || !parsedData.tv) {
        throw new Error('Invalid XMLTV format');
      }

      const channels = Array.isArray(parsedData.tv.channel)
        ? parsedData.tv.channel
        : [parsedData.tv.channel];

      const programmes = Array.isArray(parsedData.tv.programme)
        ? parsedData.tv.programme
        : [parsedData.tv.programme];

      return { channels, programmes };
    } catch (error) {
      console.error('Failed to parse XMLTV:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  getChannelProgrammes(programmes: any[], channelId: string) {
    if (!programmes) return [];
    return programmes.filter(p => p['@_channel'] === channelId);
  }
}
