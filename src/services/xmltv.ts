import axios from 'axios';
import { Platform } from 'react-native';
import { XMLParser } from 'fast-xml-parser';

export function parseXmltvDate(dateStr: string): number {
  if (!dateStr || dateStr.length < 14) return 0;
  // Format: YYYYMMDDHHmmss [TZ]
  const yyyy = dateStr.substring(0, 4);
  const mm = dateStr.substring(4, 6);
  const dd = dateStr.substring(6, 8);
  const hh = dateStr.substring(8, 10);
  const min = dateStr.substring(10, 12);
  const ss = dateStr.substring(12, 14);

  let offsetMs = 0;
  const tzMatch = dateStr.match(/([+-])(\d{2})(\d{2})/);
  if (tzMatch) {
    const sign = tzMatch[1] === '+' ? 1 : -1;
    const tzHours = parseInt(tzMatch[2], 10);
    const tzMins = parseInt(tzMatch[3], 10);
    offsetMs = sign * ((tzHours * 60) + tzMins) * 60 * 1000;
  }

  // Treat parsed as UTC and adjust
  const dateStrUTC = `${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}Z`;
  const dateMs = new Date(dateStrUTC).getTime();

  if (isNaN(dateMs)) return 0;
  return dateMs - offsetMs;
}

export function formatProgramTime(timestamp: number): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const hh = date.getHours().toString().padStart(2, '0');
  const mm = date.getMinutes().toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

export class XMLTVParser {
  private url: string;

  constructor(url: string) {
    this.url = url;
  }

  private proxyUrl(url: string): string {
    if (Platform.OS === 'web') {
      return `/proxy/${url}`;
    }
    return url;
  }

  async fetchAndParseEPG(): Promise<any> {
    try {
      const response = await axios.get(this.proxyUrl(this.url), { responseType: 'text' });
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
