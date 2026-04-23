import { describe, expect, test } from './bunTestCompat';
import { resolveSeriesSeasonCount } from '../seriesMetadata';

describe('seriesMetadata', () => {
  test('parses explicit numeric season count fields', () => {
    expect(resolveSeriesSeasonCount({ seasons_count: 4 })).toBe(4);
    expect(resolveSeriesSeasonCount({ season_count: '7' })).toBe(7);
  });

  test('parses season count from mixed string values', () => {
    expect(resolveSeriesSeasonCount({ seasons_count: '12 Seasons' })).toBe(12);
    expect(resolveSeriesSeasonCount({ season_count: 'S03' })).toBe(3);
  });

  test('falls back to seasons container length when explicit fields are missing', () => {
    expect(resolveSeriesSeasonCount({ seasons: [{}, {}, {}] })).toBe(3);
    expect(resolveSeriesSeasonCount({ seasons: { '1': [], '2': [] } })).toBe(2);
  });

  test('returns 0 when no usable season metadata is available', () => {
    expect(resolveSeriesSeasonCount({})).toBe(0);
    expect(resolveSeriesSeasonCount({ season_count: 'unknown', seasons: null })).toBe(0);
  });
});
