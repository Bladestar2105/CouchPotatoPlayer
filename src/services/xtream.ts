import axios from 'axios';
import { Category, LiveChannel, PlayerConfig, XtreamShortEpgResponse } from '../types/iptv';

export class XtreamService {
  private config: PlayerConfig;
  private baseUrl: string;

  constructor(config: PlayerConfig) {
    this.config = config;
    // ensure server url ends with a slash, or rather remove it to standardize
    const trimmedUrl = config.serverUrl.trim();
    this.baseUrl = trimmedUrl.endsWith('/')
      ? trimmedUrl.slice(0, -1)
      : trimmedUrl;
  }

  private buildUrl(action: string, extraParams: Record<string, string | number> = {}) {
    const username = encodeURIComponent(this.config.username.trim());
    const password = encodeURIComponent((this.config.password || '').trim());
    let url = `${this.baseUrl}/player_api.php?username=${username}&password=${password}&action=${encodeURIComponent(action)}`;

    const entries = Object.entries(extraParams);
    if (entries.length > 0) {
      url += '&' + entries.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join('&');
    }

    return url;
  }

  async authenticate() {
    try {
      const username = encodeURIComponent(this.config.username.trim());
      const password = encodeURIComponent((this.config.password || '').trim());
      const url = `${this.baseUrl}/player_api.php?username=${username}&password=${password}`;
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      console.error('Xtream Auth Error:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  async getLiveCategories(): Promise<Category[]> {
    try {
      const response = await axios.get(this.buildUrl('get_live_categories'));
      return response.data;
    } catch (error) {
      console.error('Xtream Get Categories Error:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  async getLiveStreams(categoryId?: string): Promise<LiveChannel[]> {
    try {
      const params: Record<string, string | number> = categoryId ? { category_id: categoryId } : {};
      const response = await axios.get(this.buildUrl('get_live_streams', params));
      return response.data;
    } catch (error) {
      console.error('Xtream Get Streams Error:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  async getShortEpg(streamId: number): Promise<XtreamShortEpgResponse> {
    try {
      const response = await axios.get(this.buildUrl('get_short_epg', { stream_id: streamId, limit: 10 }));
      return response.data;
    } catch (error) {
      console.error('Xtream Get Short EPG Error:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  getLiveStreamUrl(streamId: number, extension: string = 'ts'): string {
    const username = encodeURIComponent(this.config.username.trim());
    const password = encodeURIComponent((this.config.password || '').trim());
    return `${this.baseUrl}/live/${username}/${password}/${streamId}.${extension}`;
  }
}
