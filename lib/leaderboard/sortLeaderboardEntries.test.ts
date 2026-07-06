import { describe, expect, it } from "vitest";
import { LEADERBOARD_LIMIT, sortLeaderboardEntries } from "./sortLeaderboardEntries";
import { GuardLeaderboardEntry } from "./types";

function entry(guardName: string, bestRun: number, currentRun: number): GuardLeaderboardEntry {
  return { guardName, bestRun, currentRun };
}

describe("sortLeaderboardEntries", () => {
  it("sorts by bestRun descending", () => {
    const result = sortLeaderboardEntries([entry("a", 3, 0), entry("b", 9, 0), entry("c", 5, 0)]);
    expect(result.map((e) => e.guardName)).toEqual(["b", "c", "a"]);
  });

  it("breaks ties by currentRun descending", () => {
    const result = sortLeaderboardEntries([entry("a", 5, 1), entry("b", 5, 4), entry("c", 5, 2)]);
    expect(result.map((e) => e.guardName)).toEqual(["b", "c", "a"]);
  });

  it("limits the result to LEADERBOARD_LIMIT entries", () => {
    const entries = Array.from({ length: 15 }, (_, i) => entry(`guard-${i}`, 15 - i, 0));
    const result = sortLeaderboardEntries(entries);
    expect(result).toHaveLength(LEADERBOARD_LIMIT);
    expect(result[0].guardName).toBe("guard-0");
    expect(result[LEADERBOARD_LIMIT - 1].guardName).toBe(`guard-${LEADERBOARD_LIMIT - 1}`);
  });

  it("does not mutate the input array", () => {
    const entries = [entry("a", 1, 0), entry("b", 9, 0)];
    const original = [...entries];
    sortLeaderboardEntries(entries);
    expect(entries).toEqual(original);
  });
});
