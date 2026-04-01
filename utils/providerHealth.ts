export interface HealthResult {
  id: string;
  status: 'online' | 'offline' | 'checking';
  latencyMs: number | null;
  error?: string;
}

export const checkProviderHealth = async (config: any): Promise<HealthResult> => {
  return { id: config.id, status: 'online', latencyMs: 120 };
};

export const getLatencyColor = (latencyMs: number | null): string => {
  if (latencyMs === null) return '#FF453A'; // red = offline
  if (latencyMs < 500) return '#34C759';    // green = fast
  if (latencyMs < 1500) return '#FF9F0A';   // orange = moderate
  return '#FF453A';                          // red = slow
};

export const formatLatency = (latencyMs: number | null): string => {
  if (latencyMs === null) return 'Offline';
  if (latencyMs < 1000) return `${latencyMs}ms`;
  return `${(latencyMs / 1000).toFixed(1)}s`;
};
