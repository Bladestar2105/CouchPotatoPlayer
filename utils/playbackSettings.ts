export const MIN_OVERLAY_AUTO_HIDE_SECONDS = 1;
export const MAX_OVERLAY_AUTO_HIDE_SECONDS = 10;
export const DEFAULT_OVERLAY_AUTO_HIDE_SECONDS = 6;

export const OVERLAY_AUTO_HIDE_SECONDS_OPTIONS = Array.from(
  { length: MAX_OVERLAY_AUTO_HIDE_SECONDS - MIN_OVERLAY_AUTO_HIDE_SECONDS + 1 },
  (_unused, index) => MIN_OVERLAY_AUTO_HIDE_SECONDS + index,
);

export function normalizeOverlayAutoHideSeconds(value: unknown): number {
  const numericValue = typeof value === 'number'
    ? value
    : typeof value === 'string'
      ? Number.parseInt(value, 10)
      : Number.NaN;

  if (!Number.isFinite(numericValue)) return DEFAULT_OVERLAY_AUTO_HIDE_SECONDS;
  return Math.min(MAX_OVERLAY_AUTO_HIDE_SECONDS, Math.max(MIN_OVERLAY_AUTO_HIDE_SECONDS, Math.round(numericValue)));
}
