function countFromContainer(value: unknown): number {
  if (Array.isArray(value)) return value.length;
  if (value && typeof value === 'object') return Object.keys(value as Record<string, unknown>).length;
  return 0;
}

function parseCountCandidate(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.trunc(value));
  }

  if (typeof value === 'string') {
    const match = value.match(/\d+/);
    if (!match) return null;
    const parsed = Number.parseInt(match[0], 10);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : null;
  }

  const nestedCount = countFromContainer(value);
  return nestedCount > 0 ? nestedCount : null;
}

export function resolveSeriesSeasonCount(series: {
  seasonCount?: unknown;
  seasons_count?: unknown;
  season_count?: unknown;
  total_seasons?: unknown;
  num_seasons?: unknown;
  seasons?: unknown;
}): number {
  const explicitCandidates = [
    series.seasonCount,
    series.seasons_count,
    series.season_count,
    series.total_seasons,
    series.num_seasons,
  ];

  for (let i = 0; i < explicitCandidates.length; i++) {
    const parsed = parseCountCandidate(explicitCandidates[i]);
    if (parsed !== null) return parsed;
  }

  return countFromContainer(series.seasons);
}
