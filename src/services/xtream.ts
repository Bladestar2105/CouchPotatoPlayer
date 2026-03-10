import axios from 'axios';
import { Platform } from 'react-native';
import { Category, LiveChannel, PlayerConfig, XtreamShortEpgResponse } from '../types/iptv';

export class XtreamService {
  private config: PlayerConfig;
  private baseUrl: string;

  constructor(config: PlayerConfig) {
    this.config = config;
    // ensure server url ends with a slash, or rather remove it to standardize
    let trimmedUrl = config.serverUrl.trim();
    trimmedUrl = trimmedUrl.endsWith('/')
      ? trimmedUrl.slice(0, -1)
      : trimmedUrl;

    this.baseUrl = trimmedUrl;
  }

  private proxyUrl(url: string): string {
    if (Platform.OS === 'web') {
      let cleanUrl = url;
      while (cleanUrl.startsWith('/') || cleanUrl.startsWith('proxy')) {
        cleanUrl = cleanUrl.replace(/^\/+/, '').replace(/^proxy\/?/, '');
      }
      return `/proxy/${cleanUrl}`;
    }
    return url;
  }

  private buildUrl(action: string, extraParams: Record<string, string | number> = {}) {
    const params = new URLSearchParams({
      username: this.config.username.trim(),
      password: (this.config.password || '').trim(),
      action: action,
      ...extraParams,
    } as Record<string, string>);

    const rawUrl = `${this.baseUrl}/player_api.php?${params.toString()}`;
    return this.proxyUrl(rawUrl);
  }

  async checkCompatibility(): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/player_api.php?action=cpp`;
      const response = await axios.get(this.proxyUrl(url), { timeout: 5000 });
      return response.data === true;
    } catch {
      return false;
    }
  }

  async authenticate() {
    try {
      const username = encodeURIComponent(this.config.username.trim());
      const password = encodeURIComponent((this.config.password || '').trim());
      const url = `${this.baseUrl}/player_api.php?username=${username}&password=${password}`;
      const response = await axios.get(this.proxyUrl(url));
      return response.data;
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Unknown error';
      console.error('Xtream Auth Error:', msg);
      throw new Error(msg);
    }
  }

  async getLiveCategories(): Promise<Category[]> {
    try {
      const response = await axios.get(this.buildUrl('get_live_categories'));
      return response.data;
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Unknown error';
      console.error('Xtream Get Categories Error:', msg);
      throw new Error(msg);
    }
  }

  async getLiveStreams(categoryId?: string): Promise<LiveChannel[]> {
    try {
      const params: Record<string, string | number> = categoryId ? { category_id: categoryId } : {};
      const response = await axios.get(this.buildUrl('get_live_streams', params));
      return response.data;
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Unknown error';
      console.error('Xtream Get Streams Error:', msg);
      throw new Error(msg);
    }
  }

  async getShortEpg(streamId: number): Promise<XtreamShortEpgResponse> {
    try {
      const response = await axios.get(this.buildUrl('get_short_epg', { stream_id: streamId, limit: 10 }));
      return response.data;
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Unknown error';
      console.error('Xtream Get Short EPG Error:', msg);
      throw new Error(msg);
    }
  }

  getLiveStreamUrl(streamId: number, extension: string = 'ts'): string {
    const username = encodeURIComponent(this.config.username.trim());
    const password = encodeURIComponent((this.config.password || '').trim());
    const url = `${this.baseUrl}/live/${username}/${password}/${streamId}.${extension}`;
    return this.proxyUrl(url);
  }

  async getVodCategories(): Promise<Category[]> {
    try {
      const response = await axios.get(this.buildUrl('get_vod_categories'));
      return response.data;
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Unknown error';
      console.error('Xtream Get VOD Categories Error:', msg);
      throw new Error(msg);
    }
  }

  async getVodStreams(categoryId?: string): Promise<LiveChannel[]> {
    try {
      const params: Record<string, string | number> = categoryId ? { category_id: categoryId } : {};
      const response = await axios.get(this.buildUrl('get_vod_streams', params));
      return response.data;
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Unknown error';
      console.error('Xtream Get VOD Streams Error:', msg);
      throw new Error(msg);
    }
  }

  async getSeriesCategories(): Promise<Category[]> {
    try {
      const response = await axios.get(this.buildUrl('get_series_categories'));
      return response.data;
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Unknown error';
      console.error('Xtream Get Series Categories Error:', msg);
      throw new Error(msg);
    }
  }

  async getSeries(categoryId?: string): Promise<LiveChannel[]> {
    try {
      const params: Record<string, string | number> = categoryId ? { category_id: categoryId } : {};
      const response = await axios.get(this.buildUrl('get_series', params));
      return response.data;
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Unknown error';
      console.error('Xtream Get Series Error:', msg);
      throw new Error(msg);
    }
  }

  async getSeriesInfo(seriesId: number): Promise<any> {
    try {
      const response = await axios.get(this.buildUrl('get_series_info', { series_id: seriesId }));
      return response.data;
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Unknown error';
      console.error('Xtream Get Series Info Error:', msg);
      throw new Error(msg);
    }
  }

  getXmltvUrl(): string {
    const username = encodeURIComponent(this.config.username.trim());
    const password = encodeURIComponent((this.config.password || '').trim());
    const url = `${this.baseUrl}/xmltv.php?username=${username}&password=${password}`;
    return this.proxyUrl(url);
  }

  getVodStreamUrl(streamId: number, extension: string = 'mp4'): string {
    const username = encodeURIComponent(this.config.username.trim());
    const password = encodeURIComponent((this.config.password || '').trim());
    const url = `${this.baseUrl}/movie/${username}/${password}/${streamId}.${extension}`;
    return this.proxyUrl(url);
  }

  getSeriesStreamUrl(streamId: number, extension: string = 'mp4'): string {
    const username = encodeURIComponent(this.config.username.trim());
    const password = encodeURIComponent((this.config.password || '').trim());
    const url = `${this.baseUrl}/series/${username}/${password}/${streamId}.${extension}`;
    return this.proxyUrl(url);
  }
}
