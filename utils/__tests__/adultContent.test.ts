import { describe, expect, test } from 'vitest';
import { filterNonAdultRecentlyWatched, isAdultRecentlyWatchedItem } from '../adultContent';
import type { Channel, Movie, RecentlyWatchedItem, Series } from '../../types';

const lookup = {
  channels: [{ id: 'adult-live', name: 'Live', url: 'u', group: 'g', isAdult: true }] as Channel[],
  movies: [{ id: 'adult-vod', name: 'Vod', streamUrl: 'u', group: 'g', isAdult: true }] as Movie[],
  series: [{ id: 'adult-series', name: 'Series', group: 'g', seasons: [], isAdult: true }] as Series[],
};

describe('adult content recently watched filtering', () => {
  test('detects adult content from stored flag and current library metadata', () => {
    expect(isAdultRecentlyWatchedItem({ id: 'x', type: 'live', name: 'x', lastWatchedAt: 1, isAdult: true }, lookup)).toBe(true);
    expect(isAdultRecentlyWatchedItem({ id: 'adult-live', type: 'live', name: 'x', lastWatchedAt: 1 }, lookup)).toBe(true);
    expect(isAdultRecentlyWatchedItem({ id: 'adult-vod', type: 'vod', name: 'x', lastWatchedAt: 1 }, lookup)).toBe(true);
    expect(isAdultRecentlyWatchedItem({ id: 'episode-1', seriesId: 'adult-series', type: 'series', name: 'x', lastWatchedAt: 1 }, lookup)).toBe(true);
  });

  test('filters adult entries out of recently watched lists', () => {
    const items: RecentlyWatchedItem[] = [
      { id: 'adult-live', type: 'live', name: 'hidden', lastWatchedAt: 1 },
      { id: 'safe-live', type: 'live', name: 'visible', lastWatchedAt: 2 },
    ];

    expect(filterNonAdultRecentlyWatched(items, lookup)).toEqual([
      { id: 'safe-live', type: 'live', name: 'visible', lastWatchedAt: 2 },
    ]);
  });
});
