const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p'; // TMDB image base URL

export interface TMDBConfig {
  apiKey: string;
  language?: string;
}

export interface TMDBSearchResult {
  id: number;
  title: string;
  originalTitle: string;
  overview: string;
  posterUrl: string | null;
  backdropUrl: string | null;
  rating: number;
  releaseDate: string;
  genres: string[];
  mediaType: 'movie' | 'tv';
  popularity: number;
}

const MOVIE_GENRES: Record<number, string> = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
  99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
  27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Science Fiction',
  10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western',
};

const TV_GENRES: Record<number, string> = {
  10759: 'Action & Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
  99: 'Documentary', 18: 'Drama', 10751: 'Family', 10762: 'Kids', 9648: 'Mystery',
  10763: 'News', 10764: 'Reality', 10765: 'Sci-Fi & Fantasy', 10766: 'Soap',
  10767: 'Talk', 10768: 'War & Politics', 37: 'Western',
};

type TMDBItem = {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number;
  release_date?: string;
  first_air_date?: string;
  genre_ids?: number[];
  popularity?: number;
  media_type?: string;
};

function cleanTitle(title: string): string {
  return title
    .replace(/\s*\[.*?\]\s*/g, '')
    .replace(/\s*\(.*?\)\s*/g, '')
    .replace(/\s*(?:HD|FHD|4K|UHD|SD|720p|1080p|2160p)\s*/gi, '')
    .replace(/\s*(?:VOSE|VO|DUAL|LAT|ESP|ENG|GER|DEU)\s*/gi, '')
    .replace(/\s*[-–|:]\s*S\d+E\d+.*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractYear(title: string): number | null {
  const match = title.match(/\((\d{4})\)/);
  if (match) return parseInt(match[1], 10);
  return null;
}

const searchCache = new Map<string, TMDBSearchResult[]>();
const detailCache = new Map<string, TMDBSearchResult>();
const CACHE_TTL = 1000 * 60 * 60;
const cacheTimestamps = new Map<string, number>();

function getCached<T>(cache: Map<string, T>, key: string): T | null {
  const ts = cacheTimestamps.get(key);
  if (ts && Date.now() - ts < CACHE_TTL) {
    return cache.get(key) ?? null;
  }
  cache.delete(key);
  cacheTimestamps.delete(key);
  return null;
}

function setCache<T>(cache: Map<string, T>, key: string, value: T): void {
  cache.set(key, value);
  cacheTimestamps.set(key, Date.now());
  if (cache.size > 200) {
    const oldest = cache.keys().next().value;
    if (oldest) { cache.delete(oldest); cacheTimestamps.delete(oldest); }
  }
}

function buildTmdbImageUrl(size: string, path: string | null | undefined): string | null {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

function mapTmdbItemToSearchResult(item: TMDBItem, type: 'movie' | 'tv'): TMDBSearchResult {
  const genreMap = type === 'movie' ? MOVIE_GENRES : TV_GENRES;

  return {
    id: item.id,
    title: type === 'movie' ? (item.title || item.name || '') : (item.name || item.title || ''),
    originalTitle: type === 'movie' ? (item.original_title || '') : (item.original_name || ''),
    overview: item.overview || '',
    posterUrl: buildTmdbImageUrl(type === 'movie' ? 'w342' : 'w500', item.poster_path),
    backdropUrl: buildTmdbImageUrl(type === 'movie' ? 'w780' : 'w1280', item.backdrop_path),
    rating: item.vote_average || 0,
    releaseDate: type === 'movie' ? (item.release_date || '') : (item.first_air_date || ''),
    genres: (item.genre_ids || []).map((id: number) => genreMap[id] || 'Unknown'),
    mediaType: type,
    popularity: item.popularity || 0,
  };
}

export class TMDBService {
  private apiKey: string;
  private language: string;

  constructor(config: TMDBConfig) {
    this.apiKey = config.apiKey;
    this.language = config.language || 'en-US';
  }

  isAvailable(): boolean {
    return !!this.apiKey && this.apiKey.length > 10;
  }

  async search(title: string, type: 'movie' | 'tv' = 'movie'): Promise<TMDBSearchResult[]> {
    if (!this.isAvailable()) return [];

    const cleaned = cleanTitle(title);
    const year = extractYear(title);
    const cacheKey = `search:${type}:${cleaned}:${year || ''}`;

    const cached = getCached(searchCache, cacheKey);
    if (cached) return cached;

    try {
      const params = new URLSearchParams({
        api_key: this.apiKey,
        query: cleaned,
        language: this.language,
        page: '1',
      });
      if (year) {
        params.set(type === 'movie' ? 'year' : 'first_air_date_year', String(year));
      }

      const url = `${TMDB_BASE}/search/${type}?${params}`;
      const res = await fetch(url);
      if (!res.ok) return [];

      const data = await res.json();
      const results: TMDBSearchResult[] = (data.results || [])
        .slice(0, 5)
        .map((item: TMDBItem) => mapTmdbItemToSearchResult(item, type));

      setCache(searchCache, cacheKey, results);
      return results;
    } catch (err) {
      console.warn('[TMDB] Search error:', err);
      return [];
    }
  }

  async enrichTitle(title: string, type: 'movie' | 'tv' = 'movie'): Promise<TMDBSearchResult | null> {
    const results = await this.search(title, type);
    if (results.length === 0) return null;
    return results[0];
  }

  async getTrending(type: 'movie' | 'tv' | 'all' = 'all', timeWindow: 'day' | 'week' = 'week'): Promise<TMDBSearchResult[]> {
    if (!this.isAvailable()) return [];
    const cacheKey = `trending:${type}:${timeWindow}`;
    const cached = getCached(searchCache, cacheKey);
    if (cached) return cached;

    try {
      const params = new URLSearchParams({
        api_key: this.apiKey,
        language: this.language,
      });

      const url = `${TMDB_BASE}/trending/${type}/${timeWindow}?${params}`;
      const res = await fetch(url);
      if (!res.ok) return [];

      const data = await res.json();
      const results: TMDBSearchResult[] = (data.results || []).slice(0, 10).map((item: TMDBItem) => {
        const mType = item.media_type === 'tv' ? 'tv' : 'movie';
        return mapTmdbItemToSearchResult(item, mType as 'movie' | 'tv');
      });

      setCache(searchCache, cacheKey, results);
      return results;
    } catch (err) {
      console.warn('[TMDB] Trending error:', err);
      return [];
    }
  }
}
