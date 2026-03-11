import { XtreamService } from '../services/xtream';
import { PlayerConfig } from '../types/iptv';

export interface HealthResult {
  id: string;
  status: 'online' | 'offline' | 'checking';
  latencyMs: number | null;
  error?: string;
}

/**
 * Check if an Xtream provider is reachable and measure latency.
 */
export const checkProviderHealth = async (config: PlayerConfig): Promise<HealthResult> => {
  const start = Date.now();
  try {
    if (config.type === 'xtream') {
      const xtream = new XtreamService(config);
      await xtream.authenticate();
      const latencyMs = Date.now() - start;
      return { id: config.id, status: 'online', latencyMs };
    } else if (config.type === 'm3u') {
      // For M3U, try to fetch the playlist URL
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const response = await fetch(config.serverUrl, {
        method: 'HEAD',
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const latencyMs = Date.now() - start;
      return {
        id: config.id,
        status: response.ok ? 'online' : 'offline',
        latencyMs,
      };
    }
    return { id: config.id, status: 'offline', latencyMs: null, error: 'Unknown config type' };
  } catch (error: any) {
    return {
      id: config.id,
      status: 'offline',
      latencyMs: null,
      error: error.message || 'Connection failed',
    };
  }
};

/**
 * Get a color based on latency
 */
export const getLatencyColor = (latencyMs: number | null): string => {
  if (latencyMs === null) return '#FF453A'; // red = offline
  if (latencyMs < 500) return '#34C759';    // green = fast
  if (latencyMs < 1500) return '#FF9F0A';   // orange = moderate
  return '#FF453A';                          // red = slow
};

/**
 * Format latency for display
 */
export const formatLatency = (latencyMs: number | null): string => {
  if (latencyMs === null) return 'Offline';
  if (latencyMs < 1000) return `${latencyMs}ms`;
  return `${(latencyMs / 1000).toFixed(1)}s`;
};