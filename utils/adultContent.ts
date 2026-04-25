import type { Channel, Movie, RecentlyWatchedItem, Series } from '../types';

type AdultLookup = {
  channels: Channel[];
  movies: Movie[];
  series: Series[];
};

const hasEntries = ({ channels, movies, series }: AdultLookup) =>
  channels.length > 0 || movies.length > 0 || series.length > 0;

export const isAdultRecentlyWatchedItem = (
  item: RecentlyWatchedItem,
  lookup: AdultLookup,
): boolean => {
  if (item.isAdult) return true;

  switch (item.type) {
    case 'live':
      return lookup.channels.some((channel) => channel.id === item.id && channel.isAdult);
    case 'vod':
      return lookup.movies.some((movie) => movie.id === item.id && movie.isAdult);
    case 'series': {
      const ids = new Set([item.id, item.seriesId].filter(Boolean).map(String));
      if (ids.size === 0) return false;
      return lookup.series.some((entry) => ids.has(String(entry.id)) && entry.isAdult);
    }
    default:
      return false;
  }
};

export const filterNonAdultRecentlyWatched = (
  items: RecentlyWatchedItem[],
  lookup: AdultLookup,
): RecentlyWatchedItem[] => {
  if (!hasEntries(lookup)) {
    return items.filter((item) => !item.isAdult);
  }

  return items.filter((item) => !isAdultRecentlyWatchedItem(item, lookup));
};
