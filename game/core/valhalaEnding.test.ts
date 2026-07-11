import { describe, expect, it } from "vitest";
import { shouldShowValhalaEndingCinematic } from "./valhalaEnding";

function input(overrides: Partial<Parameters<typeof shouldShowValhalaEndingCinematic>[0]> = {}) {
  return {
    gameMode: "hardcore" as const,
    nightNumber: 25,
    isFirstNightNearMiss: false,
    isRealDeath: true,
    ...overrides,
  };
}

describe("shouldShowValhalaEndingCinematic", () => {
  it("hardcore death on night 20 returns true", () => {
    expect(shouldShowValhalaEndingCinematic(input({ nightNumber: 20 }))).toBe(true);
  });

  it("hardcore death on night 25 returns true", () => {
    expect(shouldShowValhalaEndingCinematic(input({ nightNumber: 25 }))).toBe(true);
  });

  it("hardcore death on night 30 returns true", () => {
    expect(shouldShowValhalaEndingCinematic(input({ nightNumber: 30 }))).toBe(true);
  });

  it("hardcore death on night 19 returns false", () => {
    expect(shouldShowValhalaEndingCinematic(input({ nightNumber: 19 }))).toBe(false);
  });

  it("hardcore death on night 31 returns false", () => {
    expect(shouldShowValhalaEndingCinematic(input({ nightNumber: 31 }))).toBe(false);
  });

  it("normal death on night 25 returns false", () => {
    expect(shouldShowValhalaEndingCinematic(input({ gameMode: "normal", nightNumber: 25 }))).toBe(false);
  });

  it("first-night near-miss returns false", () => {
    expect(
      shouldShowValhalaEndingCinematic(input({ nightNumber: 1, isFirstNightNearMiss: true })),
    ).toBe(false);
  });

  it("non-death event (isRealDeath false) returns false even inside the night range", () => {
    expect(shouldShowValhalaEndingCinematic(input({ nightNumber: 25, isRealDeath: false }))).toBe(false);
  });
});
