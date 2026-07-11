import { describe, expect, it } from "vitest";
import { resolveNight30Ending } from "./night30Ending";

function input(overrides: Partial<Parameters<typeof resolveNight30Ending>[0]> = {}) {
  return {
    gameMode: "hardcore" as const,
    nightNumber: 30,
    survivedNight: true,
    hasKilledMonsterThisRun: false,
    ...overrides,
  };
}

describe("resolveNight30Ending", () => {
  it("1. hardcore, night 30, survived, no kill this run => 'no_kill'", () => {
    expect(resolveNight30Ending(input())).toBe("no_kill");
  });

  it("2. hardcore, night 30, survived, hasKilledMonsterThisRun false => 'no_kill'", () => {
    expect(resolveNight30Ending(input({ hasKilledMonsterThisRun: false }))).toBe("no_kill");
  });

  it("3. hardcore, night 30, survived, killed once this run => 'warrior'", () => {
    expect(resolveNight30Ending(input({ hasKilledMonsterThisRun: true }))).toBe("warrior");
  });

  it("4. hardcore, night 30, survived, killed more than once this run => 'warrior' (boolean flag, same as one kill)", () => {
    expect(resolveNight30Ending(input({ hasKilledMonsterThisRun: true }))).toBe("warrior");
  });

  it("5. hardcore, night 29, survived, no kill => 'none'", () => {
    expect(resolveNight30Ending(input({ nightNumber: 29 }))).toBe("none");
  });

  it("6. hardcore, night 29, survived, killed this run => 'none'", () => {
    expect(resolveNight30Ending(input({ nightNumber: 29, hasKilledMonsterThisRun: true }))).toBe("none");
  });

  it("7. hardcore, night 31, survived, no kill => 'none'", () => {
    expect(resolveNight30Ending(input({ nightNumber: 31 }))).toBe("none");
  });

  it("8. normal, night 30, survived, no kill => 'none'", () => {
    expect(resolveNight30Ending(input({ gameMode: "normal" }))).toBe("none");
  });

  it("9. normal, night 30, survived, killed this run => 'none'", () => {
    expect(resolveNight30Ending(input({ gameMode: "normal", hasKilledMonsterThisRun: true }))).toBe("none");
  });

  it("10. hardcore, night 30, death (not survived), no kill => 'none'", () => {
    expect(resolveNight30Ending(input({ survivedNight: false }))).toBe("none");
  });

  it("11. hardcore, night 30, death (not survived), killed this run => 'none'", () => {
    expect(resolveNight30Ending(input({ survivedNight: false, hasKilledMonsterThisRun: true }))).toBe("none");
  });
});
