import axios from 'axios';
import { Category, LiveChannel, PlayerConfig, XtreamShortEpgResponse } from '../types/iptv';

export class XtreamService {
  private config: PlayerConfig;
  private baseUrl: string;

  constructor(config: PlayerConfig) {
    this.config = config;
    // ensure server url ends with a slash, or rather remove it to standardize
    this.baseUrl = config.serverUrl.endsWith('/')
      ? config.serverUrl.slice(0, -1)
      : config.serverUrl;
  }

  private buildUrl(action: string, extraParams: Record<string, string | number> = {}) {
    let url = `${this.baseUrl}/player_api.php?username=${this.config.username}&password=${this.config.password}&action=${action}`;

    for (const [key, value] of Object.entries(extraParams)) {
      url += `&${key}=${value}`;
    }

    return url;
  }

  async authenticate() {
    try {
      const url = `${this.baseUrl}/player_api.php?username=${this.config.username}&password=${this.config.password}`;
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      console.error('Xtream Auth Error:', error);
      throw error;
    }
  }

  async getLiveCategories(): Promise<Category[]> {
    try {
      const response = await axios.get(this.buildUrl('get_live_categories'));
      return response.data;
    } catch (error) {
      console.error('Xtream Get Categories Error:', error);
      throw error;
    }
  }

  async getLiveStreams(categoryId?: string): Promise<LiveChannel[]> {
    try {
      const params: Record<string, string | number> = categoryId ? { category_id: categoryId } : {};
      const response = await axios.get(this.buildUrl('get_live_streams', params));
      return response.data;
    } catch (error) {
      console.error('Xtream Get Streams Error:', error);
      throw error;
    }
  }

  async getShortEpg(streamId: number): Promise<XtreamShortEpgResponse> {
    try {
      const response = await axios.get(this.buildUrl('get_short_epg', { stream_id: streamId, limit: 10 }));
      return response.data;
    } catch (error) {
      console.error('Xtream Get Short EPG Error:', error);
      throw error;
    }
  }

  getLiveStreamUrl(streamId: number, extension: string = 'ts'): string {
    return `${this.baseUrl}/live/${this.config.username}/${this.config.password}/${streamId}.${extension}`;
  }
}
