import { expect, test, describe } from "bun:test";
import { TMDBService } from "../tmdb";

describe("TMDBService", () => {
  const config = { apiKey: "test-api-key-long-enough" };

  test("isAvailable returns true when API key is long enough", () => {
    const service = new TMDBService(config);
    expect(service.isAvailable()).toBe(true);
  });

  test("isAvailable returns false when API key is too short", () => {
    const service = new TMDBService({ apiKey: "short" });
    expect(service.isAvailable()).toBe(false);
  });

  test("search returns results", async () => {
    const service = new TMDBService(config);
    const mockResponse = {
      results: [
        {
          id: 1,
          title: "Test Movie",
          overview: "Test Overview",
          poster_path: "/test.jpg",
          vote_average: 8.5,
          release_date: "2023-01-01",
          genre_ids: [28]
        }
      ]
    };

    // @ts-ignore
    global.fetch = async () => ({
      ok: true,
      json: async () => mockResponse
    });

    const results = await service.search("Test");
    expect(results.length).toBe(1);
    expect(results[0].title).toBe("Test Movie");
    expect(results[0].id).toBe(1);
  });

  test("enrichTitle returns the first search result", async () => {
    const service = new TMDBService(config);
    const mockResponse = {
      results: [
        {
          id: 1,
          title: "Test Movie",
          overview: "Test Overview",
          poster_path: "/test.jpg",
          vote_average: 8.5,
          release_date: "2023-01-01",
          genre_ids: [28]
        }
      ]
    };

    // @ts-ignore
    global.fetch = async () => ({
      ok: true,
      json: async () => mockResponse
    });

    const result = await service.enrichTitle("Test");
    expect(result).not.toBeNull();
    expect(result?.title).toBe("Test Movie");
  });
});
