import { describe, expect, it } from "vitest";
import { DEFAULT_GAME_MODE, GAME_MODE_CONFIG, resolveGameMode, resolveLivesRemainingAfterDeath } from "./gameMode";

describe("DEFAULT_GAME_MODE", () => {
  it("defaults to normal", () => {
    expect(DEFAULT_GAME_MODE).toBe("normal");
  });
});

describe("GAME_MODE_CONFIG", () => {
  it("gives normal 3 starting lives and no leaderboard eligibility", () => {
    expect(GAME_MODE_CONFIG.normal.startingLives).toBe(3);
    expect(GAME_MODE_CONFIG.normal.leaderboardEligible).toBe(false);
  });

  it("gives hardcore 1 starting life and leaderboard eligibility", () => {
    expect(GAME_MODE_CONFIG.hardcore.startingLives).toBe(1);
    expect(GAME_MODE_CONFIG.hardcore.leaderboardEligible).toBe(true);
  });
});

describe("resolveGameMode", () => {
  it("passes through hardcore", () => {
    expect(resolveGameMode("hardcore")).toBe("hardcore");
  });

  it("passes through normal", () => {
    expect(resolveGameMode("normal")).toBe("normal");
  });

  it("falls back to normal for anything unknown", () => {
    expect(resolveGameMode("elite")).toBe("normal");
    expect(resolveGameMode(undefined)).toBe("normal");
    expect(resolveGameMode(null)).toBe("normal");
  });
});

describe("resolveLivesRemainingAfterDeath", () => {
  it("decrements normal lives by one", () => {
    expect(resolveLivesRemainingAfterDeath("normal", 3)).toBe(2);
  });

  it("never drops normal lives below zero", () => {
    expect(resolveLivesRemainingAfterDeath("normal", 0)).toBe(0);
  });

  it("always drops hardcore to zero, regardless of starting value", () => {
    expect(resolveLivesRemainingAfterDeath("hardcore", 1)).toBe(0);
  });
});
