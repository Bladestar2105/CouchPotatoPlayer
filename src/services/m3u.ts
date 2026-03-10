import axios from 'axios';
import { Platform } from 'react-native';
import { Category, LiveChannel, PlayerConfig } from '../types/iptv';

export class M3UService {
  private config: PlayerConfig;

  constructor(config: PlayerConfig) {
    this.config = config;
  }

  private proxyUrl(url: string): string {
    if (Platform.OS === 'web') {
      return url.startsWith('/proxy/') ? url : `/proxy/${url}`;
    }
    return url;
  }

  async checkCompatibility(): Promise<boolean> {
    try {
      const urlObj = new URL(this.config.serverUrl);
      const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
      const checkUrl = `${baseUrl}/cpp`;
      const response = await axios.get(this.proxyUrl(checkUrl), { timeout: 5000 });
      return response.data === true;
    } catch (error) {
      return false;
    }
  }

  async parsePlaylist(): Promise<{ categories: Category[], channels: LiveChannel[] }> {
    try {
      const response = await axios.get(this.proxyUrl(this.config.serverUrl), { responseType: 'text' });
      const m3uData = response.data as string;

      const lines = m3uData.split('\n');
      const categoriesMap = new Map<string, Category>();
      const channels: LiveChannel[] = [];
      let currentChannel: Partial<LiveChannel> | null = null;
      let categoryCounter = 1;
      let streamCounter = 1;

      for (let line of lines) {
        line = line.trim();
        if (!line) continue;

        if (line.startsWith('#EXTINF:')) {
          currentChannel = {};

          const matchTvgName = line.match(/tvg-name="([^"]+)"/);
          const matchTvgId = line.match(/tvg-id="([^"]+)"/);
          const matchTvgLogo = line.match(/tvg-logo="([^"]+)"/);
          const matchGroupTitle = line.match(/group-title="([^"]+)"/);

          const nameParts = line.split(',');
          const channelName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : 'Unknown Channel';

          let categoryName = 'Uncategorized';
          if (matchGroupTitle && matchGroupTitle[1]) {
            categoryName = matchGroupTitle[1];
          }

          let categoryId = '';
          const existingCategory = categoriesMap.get(categoryName);
          if (existingCategory) {
            categoryId = existingCategory.category_id;
          } else {
            categoryId = `m3u_cat_${categoryCounter++}`;
            categoriesMap.set(categoryName, {
              category_id: categoryId,
              category_name: categoryName,
              parent_id: 0
            });
          }

          const channelObj: Partial<LiveChannel> = {
            num: streamCounter,
            name: matchTvgName ? matchTvgName[1] : channelName,
            stream_type: 'live',
            stream_id: streamCounter++,
            stream_icon: matchTvgLogo ? matchTvgLogo[1] : '',
            epg_channel_id: matchTvgId ? matchTvgId[1] : '',
            added: new Date().toISOString(),
            category_id: categoryId,
            custom_sid: '',
            tv_archive: 0,
            direct_source: '',
            tv_archive_duration: 0
          };
          currentChannel = channelObj;
        } else if (!line.startsWith('#') && currentChannel) {
          currentChannel.direct_source = line;
          channels.push(currentChannel as LiveChannel);
          currentChannel = null;
        }
      }

      return {
        categories: Array.from(categoriesMap.values()),
        channels
      };

    } catch (error) {
      console.error('M3U Parsing Error:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }
}
