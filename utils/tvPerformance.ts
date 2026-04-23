import Logger from './logger';

declare const __DEV__: boolean;

type TvPerfDetails = Record<string, unknown> | undefined;

const isTvPerfDevEnabled = (): boolean => {
  if (typeof __DEV__ === 'undefined' || !__DEV__) return false;
  try {
    const runtimeFlag = (globalThis as any).__CP_TV_PERF__ as boolean | undefined;
    return runtimeFlag !== false;
  } catch {
    return true;
  }
};

export const nowMs = (): number => {
  const perfNow = (globalThis as any)?.performance?.now;
  if (typeof perfNow === 'function') return perfNow.call((globalThis as any).performance);
  return Date.now();
};

export const isTvPerfLoggingEnabled = (isTV: boolean): boolean => {
  return isTV && isTvPerfDevEnabled();
};

export const logTvPerfMetric = (name: string, durationMs: number, details?: TvPerfDetails) => {
  if (!isTvPerfDevEnabled()) return;
  const normalizedDuration = Math.max(0, Math.round(durationMs * 10) / 10);
  if (details && Object.keys(details).length > 0) {
    Logger.log(`[TVPerf] ${name}: ${normalizedDuration}ms`, details);
    return;
  }
  Logger.log(`[TVPerf] ${name}: ${normalizedDuration}ms`);
};
