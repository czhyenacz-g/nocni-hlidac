import { describe, expect, it } from "vitest";
import { MONSTER_TRUE_ENDING_REQUIRED_HITS, confirmMonsterHit } from "./monsterEnding";

describe("MONSTER_TRUE_ENDING_REQUIRED_HITS", () => {
  it("is exactly 10", () => {
    expect(MONSTER_TRUE_ENDING_REQUIRED_HITS).toBe(10);
  });
});

describe("confirmMonsterHit", () => {
  it("increments the hit count by exactly the given hitCount (usually 1)", () => {
    expect(confirmMonsterHit(0, 1)).toEqual({ monsterHitsToday: 1, monsterDefeated: false });
    expect(confirmMonsterHit(4, 1)).toEqual({ monsterHitsToday: 5, monsterDefeated: false });
  });

  it("does not defeat the monster at 9 confirmed hits", () => {
    expect(confirmMonsterHit(8, 1)).toEqual({ monsterHitsToday: 9, monsterDefeated: false });
  });

  it("defeats the monster at exactly the 10th confirmed hit", () => {
    expect(confirmMonsterHit(9, 1)).toEqual({ monsterHitsToday: 10, monsterDefeated: true });
  });

  it("stays defeated for any further hit beyond 10 (defensive)", () => {
    expect(confirmMonsterHit(10, 1)).toEqual({ monsterHitsToday: 11, monsterDefeated: true });
  });

  it("a hitCount of 0 leaves monsterHitsToday unchanged (no pending hits confirmed)", () => {
    expect(confirmMonsterHit(3, 0)).toEqual({ monsterHitsToday: 3, monsterDefeated: false });
  });

  // Dvouhlavňovka (viz zadání, GameState.pendingMonsterHits) — hitCount > 1
  // je hlavní nový use case tohohle parametru: kumulativní zásah může
  // přeskočit rovnou přes/na práh v jednom potvrzení.
  describe("hitCount > 1 (double-barrel shotgun, up to 2 confirmed hits in one return)", () => {
    it("confirming 2 hits at once from 7 reaches 9, not yet defeated", () => {
      expect(confirmMonsterHit(7, 2)).toEqual({ monsterHitsToday: 9, monsterDefeated: false });
    });

    it("confirming 2 hits at once from 8 reaches exactly 10 — defeated", () => {
      expect(confirmMonsterHit(8, 2)).toEqual({ monsterHitsToday: 10, monsterDefeated: true });
    });

    it("confirming 2 hits at once from 9 overshoots to 11 — still defeated", () => {
      expect(confirmMonsterHit(9, 2)).toEqual({ monsterHitsToday: 11, monsterDefeated: true });
    });
  });
});
