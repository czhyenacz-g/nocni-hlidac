import { describe, expect, it } from "vitest";
import { MONSTER_TRUE_ENDING_REQUIRED_HITS, confirmMonsterHit } from "./monsterEnding";

describe("MONSTER_TRUE_ENDING_REQUIRED_HITS", () => {
  it("is exactly 10", () => {
    expect(MONSTER_TRUE_ENDING_REQUIRED_HITS).toBe(10);
  });
});

describe("confirmMonsterHit", () => {
  it("increments the hit count by exactly one", () => {
    expect(confirmMonsterHit(0)).toEqual({ monsterHitsToday: 1, monsterDefeated: false });
    expect(confirmMonsterHit(4)).toEqual({ monsterHitsToday: 5, monsterDefeated: false });
  });

  it("does not defeat the monster at 9 confirmed hits", () => {
    expect(confirmMonsterHit(8)).toEqual({ monsterHitsToday: 9, monsterDefeated: false });
  });

  it("defeats the monster at exactly the 10th confirmed hit", () => {
    expect(confirmMonsterHit(9)).toEqual({ monsterHitsToday: 10, monsterDefeated: true });
  });

  it("stays defeated for any further hit beyond 10 (defensive)", () => {
    expect(confirmMonsterHit(10)).toEqual({ monsterHitsToday: 11, monsterDefeated: true });
  });
});
