import { XMLParser } from 'fast-xml-parser';

export interface ParsedProgram {
  start: Date;
  end: Date;
  title: string;
  description: string;
  channelId: string;
}

export const parseXMLTV = async (url: string): Promise<Record<string, ParsedProgram[]>> => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch XMLTV: ${response.status}`);
    }
    const xmlData = await response.text();

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      processEntities: false,
    });

    const parsed = parser.parse(xmlData);
    const epgData: Record<string, ParsedProgram[]> = {};

    if (!parsed || !parsed.tv || !parsed.tv.programme) {
      return epgData;
    }

    const programmes = Array.isArray(parsed.tv.programme) ? parsed.tv.programme : [parsed.tv.programme];

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
      epgData[key].sort((a, b) => a.start.getTime() - b.start.getTime());
    });

    return epgData;

  } catch (error) {
    console.error("Error parsing XMLTV:", error);
    return {};
  }
};

const parseXMLDate = (dateString: string): Date | null => {
  if (dateString.length < 14) return null;

  try {
    const year = parseInt(dateString.substring(0, 4), 10);
    const month = parseInt(dateString.substring(4, 6), 10) - 1; // JS months are 0-indexed
    const day = parseInt(dateString.substring(6, 8), 10);
    const hour = parseInt(dateString.substring(8, 10), 10);
    const min = parseInt(dateString.substring(10, 12), 10);
    const sec = parseInt(dateString.substring(12, 14), 10);

    let date = new Date(Date.UTC(year, month, day, hour, min, sec));

    if (dateString.length >= 19) {
      const offsetSign = dateString.substring(15, 16);
      const offsetHour = parseInt(dateString.substring(16, 18), 10);
      const offsetMin = parseInt(dateString.substring(18, 20), 10);

      const offsetTotalMs = ((offsetHour * 60) + offsetMin) * 60000;

      if (offsetSign === '+') {
        date = new Date(date.getTime() - offsetTotalMs);
      } else if (offsetSign === '-') {
        date = new Date(date.getTime() + offsetTotalMs);
      }
    }

    return date;
  } catch (e) {
    return null;
  }
};
