import { describe, expect, it } from "vitest";
import { computeRoundProgress, getMonsterBoostConfig } from "./monsterBoostConfig";

describe("getMonsterBoostConfig", () => {
  it("is weak and rare at the very start of the round", () => {
    const config = getMonsterBoostConfig(0);
    expect(config.speedMultiplier).toBeCloseTo(1.15);
    expect(config.durationMs).toBe(1_000);
    expect(config.cooldownMs).toBe(22_000);
  });

  it("is strong and frequent at the very end of the round", () => {
    const config = getMonsterBoostConfig(1);
    expect(config.speedMultiplier).toBeCloseTo(1.6);
    expect(config.durationMs).toBe(2_500);
    expect(config.cooldownMs).toBe(6_000);
  });

  it("interpolates monotonically — later progress is never weaker than earlier progress", () => {
    const early = getMonsterBoostConfig(0.2);
    const mid = getMonsterBoostConfig(0.5);
    const late = getMonsterBoostConfig(0.8);

    expect(mid.speedMultiplier).toBeGreaterThan(early.speedMultiplier);
    expect(late.speedMultiplier).toBeGreaterThan(mid.speedMultiplier);
    expect(mid.durationMs).toBeGreaterThan(early.durationMs);
    expect(late.durationMs).toBeGreaterThan(mid.durationMs);
    // Cooldown gets SHORTER (more frequent) as the round progresses.
    expect(mid.cooldownMs).toBeLessThan(early.cooldownMs);
    expect(late.cooldownMs).toBeLessThan(mid.cooldownMs);
  });

  it("clamps out-of-range progress instead of extrapolating", () => {
    expect(getMonsterBoostConfig(-5)).toEqual(getMonsterBoostConfig(0));
    expect(getMonsterBoostConfig(5)).toEqual(getMonsterBoostConfig(1));
  });
});

describe("computeRoundProgress", () => {
  it("is 0 at the start of a full-length round", () => {
    expect(computeRoundProgress(300_000, 300_000)).toBe(0);
  });

  it("is 1 once remainingMs hits 0", () => {
    expect(computeRoundProgress(0, 300_000)).toBe(1);
  });

  it("is 0.5 halfway through", () => {
    expect(computeRoundProgress(150_000, 300_000)).toBe(0.5);
  });

  it("clamps negative remainingMs (post-timeout) to progress 1", () => {
    expect(computeRoundProgress(-10, 300_000)).toBe(1);
  });
});
