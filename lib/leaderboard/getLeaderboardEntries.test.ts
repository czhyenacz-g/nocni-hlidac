import { afterEach, describe, expect, it, vi } from "vitest";
import { getLeaderboardEntries } from "./getLeaderboardEntries";
import { getMockLeaderboardEntries } from "./mockLeaderboard";
import { sortLeaderboardEntries } from "./sortLeaderboardEntries";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("getLeaderboardEntries — fallback to mock data", () => {
  it("returns the (sorted) mock leaderboard when the VPS API is not configured", async () => {
    vi.stubEnv("NOCNI_HLIDAC_API_URL", "");
    vi.stubEnv("NOCNI_HLIDAC_API_TOKEN", "");

    const result = await getLeaderboardEntries();
    const expected = sortLeaderboardEntries(await getMockLeaderboardEntries());
    expect(result).toEqual(expected);
  });

  it("returns the (sorted) mock leaderboard when the VPS API call fails", async () => {
    vi.stubEnv("NOCNI_HLIDAC_API_URL", "https://hub.example.invalid");
    vi.stubEnv("NOCNI_HLIDAC_API_TOKEN", "test-token");
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new Error("network error"))),
    );

    const result = await getLeaderboardEntries();
    const expected = sortLeaderboardEntries(await getMockLeaderboardEntries());
    expect(result).toEqual(expected);
  });
});
