import { describe, test, expect } from './bunTestCompat';
import { checkProviderHealth, getLatencyColor, formatLatency } from "../providerHealth";

describe("providerHealth", () => {
  describe("checkProviderHealth", () => {
    test("should return health result for a given config", async () => {
      const config = { id: "test-provider", url: "http://example.com" };
      const result = await checkProviderHealth(config);
      expect(result).toEqual({
        id: "test-provider",
        status: "online",
        latencyMs: 120,
      });
    });
  });

  describe("getLatencyColor", () => {
    test.each([
      { latency: null, expected: "#FF453A", description: "null (offline)" },
      { latency: -100, expected: "#34C759", description: "negative value (treated as fast)" },
      { latency: 0, expected: "#34C759", description: "0ms (fast)" },
      { latency: 499, expected: "#34C759", description: "499ms (fast)" },
      { latency: 500, expected: "#FF9F0A", description: "500ms (moderate)" },
      { latency: 1000, expected: "#FF9F0A", description: "1000ms (moderate)" },
      { latency: 1499, expected: "#FF9F0A", description: "1499ms (moderate)" },
      { latency: 1500, expected: "#FF453A", description: "1500ms (slow)" },
      { latency: 2000, expected: "#FF453A", description: "2000ms (slow)" },
    ])("should return $expected for $description", ({ latency, expected }) => {
      expect(getLatencyColor(latency)).toBe(expected);
    });
  });

  describe("formatLatency", () => {
    test.each([
      { latency: null, expected: "Offline", description: "null" },
      { latency: -500, expected: "-500ms", description: "negative value" },
      { latency: 0, expected: "0ms", description: "0ms" },
      { latency: 120, expected: "120ms", description: "120ms" },
      { latency: 999, expected: "999ms", description: "999ms" },
      { latency: 1000, expected: "1.0s", description: "1000ms" },
      { latency: 1500, expected: "1.5s", description: "1500ms" },
      { latency: 2500, expected: "2.5s", description: "2500ms" },
    ])("should return $expected for $description", ({ latency, expected }) => {
      expect(formatLatency(latency)).toBe(expected);
    });
  });
});
