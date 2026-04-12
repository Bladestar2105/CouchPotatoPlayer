import { XMLParser } from 'fast-xml-parser';
import Logger from './logger';

export interface ParsedProgram {
  start: number;
  end: number;
  title: string;
  description: string;
  channelId: string;
}

/**
 * Parse XMLTV data from a string (already fetched)
 * This is the main parsing function that takes XML string as input
 */
export const parseXMLTVFromString = (xmlData: string): Record<string, ParsedProgram[]> => {
  const epgData: Record<string, ParsedProgram[]> = {};

  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      processEntities: false,
      parseAttributeValue: false, // Prevent converting large number strings (like '20260321140000') into numbers
    });

    const parsed = parser.parse(xmlData);

    if (!parsed || !parsed.tv || !parsed.tv.programme) {
      Logger.log('[EPG Parser] No programme data found in XMLTV');
      return epgData;
    }

    const programmes = Array.isArray(parsed.tv.programme) ? parsed.tv.programme : [parsed.tv.programme];
    Logger.log(`[EPG Parser] Found ${programmes.length} programmes`);

    programmes.forEach((prog: any) => {
      const channelId = prog['@_channel'];
      const startStr = prog['@_start'];
      const stopStr = prog['@_stop'];

      if (!channelId || !startStr || !stopStr) return;

      const title = prog.title ? (typeof prog.title === 'string' ? prog.title : prog.title['#text'] || 'Unknown') : 'Unknown Title';
      const description = prog.desc ? (typeof prog.desc === 'string' ? prog.desc : prog.desc['#text'] || '') : '';

      const start = parseXMLDate(startStr);
      const end = parseXMLDate(stopStr);

      if (!start || !end) return;

      if (!epgData[channelId]) {
        epgData[channelId] = [];
      }

      epgData[channelId].push({
        start,
        end,
        title,
        description,
        channelId,
      });
    });

    // Sort chronologically for optimal binary searching
    Object.keys(epgData).forEach(key => {
      epgData[key].sort((a, b) => a.start - b.start);
    });

    Logger.log(`[EPG Parser] Grouped into ${Object.keys(epgData).length} channels`);
    return epgData;

  } catch (error) {
    Logger.error("[EPG Parser] Error parsing XMLTV:", error);
    return epgData;
  }
};

/**
 * Parse XMLTV from URL (fetches internally - use only when CORS is not an issue)
 * @deprecated Use parseXMLTVFromString with fetched data instead
 */
export const parseXMLTV = async (url: string): Promise<Record<string, ParsedProgram[]>> => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch XMLTV: ${response.status}`);
    }
    const xmlData = await response.text();
    return parseXMLTVFromString(xmlData);
  } catch (error) {
    Logger.error("Error fetching/parsing XMLTV:", error);
    return {};
  }
};

const parseXMLDateCache = new Map<string, number>();
const MAX_CACHE_SIZE = 10000;

const parseXMLDate = (inputDateString: string | number): number | null => {
  const dateString = String(inputDateString);
  if (dateString.length < 14) return null;

  let timestamp = parseXMLDateCache.get(dateString);
  if (timestamp !== undefined) return timestamp;

  try {
    const year = +dateString.substring(0, 4);
    const monthIdx = +dateString.substring(4, 6) - 1; // JS months are 0-indexed
    const day = +dateString.substring(6, 8);
    const hour = +dateString.substring(8, 10);
    const min = +dateString.substring(10, 12);
    const sec = +dateString.substring(12, 14);

    // Basic range validation to prevent auto-rollover
    if (monthIdx < 0 || monthIdx > 11 || day < 1 || day > 31 || hour < 0 || hour > 23 || min < 0 || min > 59 || sec < 0 || sec > 59) {
      return null;
    }

    timestamp = Date.UTC(year, monthIdx, day, hour, min, sec);

    if (dateString.length >= 19) {
      const offsetSign = dateString.substring(15, 16);
      const offsetHour = +dateString.substring(16, 18);
      const offsetMin = +dateString.substring(18, 20);

      const offsetTotalMs = ((offsetHour * 60) + offsetMin) * 60000;

      if (offsetSign === '+') {
        timestamp -= offsetTotalMs;
      } else if (offsetSign === '-') {
        timestamp += offsetTotalMs;
      }
    }

    if (isNaN(timestamp)) {
      return null;
    }

    if (parseXMLDateCache.size >= MAX_CACHE_SIZE) {
      const firstKey = parseXMLDateCache.keys().next().value;
      if (firstKey !== undefined) {
        parseXMLDateCache.delete(firstKey);
      }
    }
    parseXMLDateCache.set(dateString, timestamp);

    return timestamp;
  } catch (e) {
    return null;
  }
};

export const _test_parseXMLDate = parseXMLDate;
