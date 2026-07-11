import { describe, expect, it } from "vitest";
import { shouldShowNoKillNight30Ending } from "./noKillEnding";

function input(overrides: Partial<Parameters<typeof shouldShowNoKillNight30Ending>[0]> = {}) {
  return {
    gameMode: "hardcore" as const,
    nightNumber: 30,
    survivedNight: true,
    hasKilledMonsterThisRun: false,
    ...overrides,
  };
}

describe("shouldShowNoKillNight30Ending", () => {
  it("hardcore, night 30, survived, no kill this run => true", () => {
    expect(shouldShowNoKillNight30Ending(input())).toBe(true);
  });

  it("hardcore, night 30, survived, monster killed this run => false", () => {
    expect(shouldShowNoKillNight30Ending(input({ hasKilledMonsterThisRun: true }))).toBe(false);
  });

  it("hardcore, night 29, survived, no kill => false", () => {
    expect(shouldShowNoKillNight30Ending(input({ nightNumber: 29 }))).toBe(false);
  });

  it("hardcore, night 31, survived, no kill => false", () => {
    expect(shouldShowNoKillNight30Ending(input({ nightNumber: 31 }))).toBe(false);
  });

  it("normal, night 30, survived, no kill => false", () => {
    expect(shouldShowNoKillNight30Ending(input({ gameMode: "normal" }))).toBe(false);
  });

  it("hardcore, night 30, death (not survived), no kill => false", () => {
    expect(shouldShowNoKillNight30Ending(input({ survivedNight: false }))).toBe(false);
  });
});
