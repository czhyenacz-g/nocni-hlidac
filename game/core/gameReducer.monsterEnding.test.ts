import { describe, expect, it } from "vitest";
import { createGameReducer } from "./gameReducer";
import { createInitialGameState } from "./gameState";
import { NIGHT_01 } from "../nights/night01";
import { GameState } from "./types";

// Skrytý true ending (viz zadání, game/core/monsterEnding.ts) — reducer sám
// neví nic o minihře, jen dvěma akcemi (MARK_PENDING_MONSTER_HIT,
// CONFIRM_MONSTER_HIT) zaznamená/potvrdí zásah(y); smrt venku
// (EMERGENCY_MINIGAME_DIED) nepotvrzené zásahy zahodí. `pendingMonsterHits`
// je číselné počítadlo (ne boolean) — připravené na dvouhlavňovku (až 2
// zásahy za jednu výpravu, viz shotgunEquipment.ts), MVP v praxi zatím
// pošle nejvýš 1, viz TODO v EmergencyMiniGame.tsx.

describe("Default GameState", () => {
  it("starts with no hits, no pending hits, monster not defeated", () => {
    const state = createInitialGameState(NIGHT_01);
    expect(state.monsterHitsToday).toBe(0);
    expect(state.pendingMonsterHits).toBe(0);
    expect(state.monsterDefeated).toBe(false);
  });
});

describe("START_SHIFT / RESTART_SHIFT always reset the daily hit counter", () => {
  it("RESTART_SHIFT resets a nonzero monsterHitsToday/pendingMonsterHits back to defaults (same-night retry after a Normal death)", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = { ...createInitialGameState(NIGHT_01), monsterHitsToday: 6, pendingMonsterHits: 1 };

    const result = reducer(state, { type: "RESTART_SHIFT" });

    expect(result.monsterHitsToday).toBe(0);
    expect(result.pendingMonsterHits).toBe(0);
  });

  it("START_SHIFT also resets to defaults", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = { ...createInitialGameState(NIGHT_01), monsterHitsToday: 9 };

    const result = reducer(state, { type: "START_SHIFT" });

    expect(result.monsterHitsToday).toBe(0);
  });
});

describe("MARK_PENDING_MONSTER_HIT", () => {
  it("increments pendingMonsterHits but does not touch monsterHitsToday", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = { ...createInitialGameState(NIGHT_01), isRunning: true };

    const result = reducer(state, { type: "MARK_PENDING_MONSTER_HIT" });

    expect(result.pendingMonsterHits).toBe(1);
    expect(result.monsterHitsToday).toBe(0);
  });

  it("a second mark within the same run increments again (double-barrel: up to 2 shots)", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = { ...createInitialGameState(NIGHT_01), isRunning: true, pendingMonsterHits: 1 };

    const result = reducer(state, { type: "MARK_PENDING_MONSTER_HIT" });

    expect(result.pendingMonsterHits).toBe(2);
  });

  it("is a no-op while the game is not running", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = { ...createInitialGameState(NIGHT_01), isRunning: false };

    expect(reducer(state, { type: "MARK_PENDING_MONSTER_HIT" })).toBe(state);
  });
});

describe("EMERGENCY_MINIGAME_DIED discards pending hits without counting them", () => {
  it("dying outside with a pending hit clears pendingMonsterHits and leaves monsterHitsToday unchanged", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = { ...createInitialGameState(NIGHT_01), isRunning: true, pendingMonsterHits: 1, monsterHitsToday: 3 };

    const result = reducer(state, { type: "EMERGENCY_MINIGAME_DIED" });

    expect(result.pendingMonsterHits).toBe(0);
    expect(result.monsterHitsToday).toBe(3);
    expect(result.screen).toBe("death");
  });

  it("dying outside with 2 pending hits (double-barrel) discards both", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = { ...createInitialGameState(NIGHT_01), isRunning: true, pendingMonsterHits: 2, monsterHitsToday: 3 };

    const result = reducer(state, { type: "EMERGENCY_MINIGAME_DIED" });

    expect(result.pendingMonsterHits).toBe(0);
    expect(result.monsterHitsToday).toBe(3);
  });
});

describe("CONFIRM_MONSTER_HIT", () => {
  it("adds pendingMonsterHits onto monsterHitsToday and clears pendingMonsterHits", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = {
      ...createInitialGameState(NIGHT_01),
      isRunning: true,
      screen: "playing" as const,
      monsterHitsToday: 3,
      pendingMonsterHits: 1,
    };

    const result = reducer(state, { type: "CONFIRM_MONSTER_HIT" });

    expect(result.monsterHitsToday).toBe(4);
    expect(result.pendingMonsterHits).toBe(0);
    expect(result.monsterDefeated).toBe(false);
    expect(result.screen).toBe("playing");
  });

  it("confirming 0 pending hits (nothing marked) is a harmless no-increment", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = {
      ...createInitialGameState(NIGHT_01),
      isRunning: true,
      screen: "playing" as const,
      monsterHitsToday: 3,
      pendingMonsterHits: 0,
    };

    const result = reducer(state, { type: "CONFIRM_MONSTER_HIT" });

    expect(result.monsterHitsToday).toBe(3);
    expect(result.monsterDefeated).toBe(false);
  });

  it("does not trigger the ending at 9 confirmed hits", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = {
      ...createInitialGameState(NIGHT_01),
      isRunning: true,
      screen: "playing" as const,
      monsterHitsToday: 8,
      pendingMonsterHits: 1,
    };

    const result = reducer(state, { type: "CONFIRM_MONSTER_HIT" });

    expect(result.monsterHitsToday).toBe(9);
    expect(result.monsterDefeated).toBe(false);
    expect(result.screen).toBe("playing");
    expect(result.isRunning).toBe(true);
  });

  it("triggers the true ending on the 10th confirmed hit: monsterDefeated true, screen monsterDefeated, isRunning false", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = {
      ...createInitialGameState(NIGHT_01),
      isRunning: true,
      screen: "playing" as const,
      monsterHitsToday: 9,
      pendingMonsterHits: 1,
    };

    const result = reducer(state, { type: "CONFIRM_MONSTER_HIT" });

    expect(result.monsterHitsToday).toBe(10);
    expect(result.monsterDefeated).toBe(true);
    expect(result.screen).toBe("monsterDefeated");
    expect(result.isRunning).toBe(false);
  });

  // Dvouhlavňovka (viz zadání, part F "pozor na finální zásah") — 2 pending
  // hits confirmed at once can cross the threshold in a single return.
  it("2 pending hits (double-barrel) confirmed at once can cross the threshold from 8 to 10", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = {
      ...createInitialGameState(NIGHT_01),
      isRunning: true,
      screen: "playing" as const,
      monsterHitsToday: 8,
      pendingMonsterHits: 2,
    };

    const result = reducer(state, { type: "CONFIRM_MONSTER_HIT" });

    expect(result.monsterHitsToday).toBe(10);
    expect(result.monsterDefeated).toBe(true);
    expect(result.screen).toBe("monsterDefeated");
  });

  it("2 pending hits confirmed at once below the threshold just add up normally (7 -> 9)", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = {
      ...createInitialGameState(NIGHT_01),
      isRunning: true,
      screen: "playing" as const,
      monsterHitsToday: 7,
      pendingMonsterHits: 2,
    };

    const result = reducer(state, { type: "CONFIRM_MONSTER_HIT" });

    expect(result.monsterHitsToday).toBe(9);
    expect(result.monsterDefeated).toBe(false);
    expect(result.screen).toBe("playing");
  });

  it("is a no-op while the game is not running", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = { ...createInitialGameState(NIGHT_01), isRunning: false };

    expect(reducer(state, { type: "CONFIRM_MONSTER_HIT" })).toBe(state);
  });

  // Admin zkrácený práh (viz zadání "for admin reduce necessary monster
  // death count to 2") — reducer čte state.nightFeatures.monsterTrueEndingRequiredHits,
  // ne natvrdo MONSTER_TRUE_ENDING_REQUIRED_HITS (viz gameReducer.ts CONFIRM_MONSTER_HIT).
  it("honors a lowered state.nightFeatures.monsterTrueEndingRequiredHits (admin override)", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = {
      ...createInitialGameState(NIGHT_01),
      isRunning: true,
      screen: "playing" as const,
      monsterHitsToday: 1,
      pendingMonsterHits: 1,
      nightFeatures: { ...createInitialGameState(NIGHT_01).nightFeatures, monsterTrueEndingRequiredHits: 2 },
    };

    const result = reducer(state, { type: "CONFIRM_MONSTER_HIT" });

    expect(result.monsterHitsToday).toBe(2);
    expect(result.monsterDefeated).toBe(true);
    expect(result.screen).toBe("monsterDefeated");
  });
});

// Zadání: potvrzený zásah nesmí nechat hráče po bezpečném návratu čelit
// stejnému monstru, které právě trefil — CONFIRM_MONSTER_HIT proto (mimo 10.
// zásah) stáhne enemyStage zpátky na night.enemy.monsterRetreatStage a
// vyčistí bezprostřední door/repel/standoff stav, viz gameReducer.ts.
describe("CONFIRM_MONSTER_HIT — resets the office monster to a safe stage (hits below the true-ending threshold)", () => {
  it("moves enemyStage to night.enemy.monsterRetreatStage when the hit isn't the 10th", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = {
      ...createInitialGameState(NIGHT_01),
      isRunning: true,
      screen: "playing" as const,
      monsterHitsToday: 3,
      pendingMonsterHits: 1,
      enemyStage: "at_door" as const,
    };

    const result = reducer(state, { type: "CONFIRM_MONSTER_HIT" });

    expect(result.enemyStage).toBe(NIGHT_01.enemy.monsterRetreatStage);
    expect(result.lastEnemyDecision).toBe("monster_hit_confirmed");
  });

  it("clears immediate door/repel/standoff progress so nothing carries over into the reset monster", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = {
      ...createInitialGameState(NIGHT_01),
      isRunning: true,
      screen: "playing" as const,
      monsterHitsToday: 0,
      pendingMonsterHits: 1,
      enemyStage: "at_door" as const,
      enemyAtDoorSinceMs: 1000,
      enemyDoorHoldTargetMs: 7000,
      enemyDoorHoldProgressMs: 2000,
      doorLightRepelMs: 900,
      doorHallwayUvRepelMs: 4000,
      enemyDoorAttackGraceUntilMs: 5000,
      monsterRetreatedTo: "left_hallway" as const,
      monsterRetreatVerified: false,
    };

    const result = reducer(state, { type: "CONFIRM_MONSTER_HIT" });

    expect(result.enemyAtDoorSinceMs).toBeNull();
    expect(result.enemyDoorHoldTargetMs).toBeNull();
    expect(result.enemyDoorHoldProgressMs).toBe(0);
    expect(result.doorLightRepelMs).toBe(0);
    expect(result.doorHallwayUvRepelMs).toBe(0);
    expect(result.enemyDoorAttackGraceUntilMs).toBeNull();
    expect(result.monsterRetreatedTo).toBeNull();
    expect(result.monsterRetreatVerified).toBe(false);
  });

  it("the 9th confirmed hit still resets the monster and keeps the game going (not the true ending)", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = {
      ...createInitialGameState(NIGHT_01),
      isRunning: true,
      screen: "playing" as const,
      monsterHitsToday: 8,
      pendingMonsterHits: 1,
      enemyStage: "at_door" as const,
    };

    const result = reducer(state, { type: "CONFIRM_MONSTER_HIT" });

    expect(result.monsterHitsToday).toBe(9);
    expect(result.monsterDefeated).toBe(false);
    expect(result.screen).toBe("playing");
    expect(result.enemyStage).toBe(NIGHT_01.enemy.monsterRetreatStage);
  });

  it("the 10th confirmed hit does NOT reset the monster stage — the run ends via monsterDefeated instead", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = {
      ...createInitialGameState(NIGHT_01),
      isRunning: true,
      screen: "playing" as const,
      monsterHitsToday: 9,
      pendingMonsterHits: 1,
      enemyStage: "at_door" as const,
      enemyDoorHoldProgressMs: 2000,
    };

    const result = reducer(state, { type: "CONFIRM_MONSTER_HIT" });

    expect(result.monsterDefeated).toBe(true);
    expect(result.screen).toBe("monsterDefeated");
    // No monster-reset side effects needed once the run has already ended.
    expect(result.enemyStage).toBe("at_door");
    expect(result.enemyDoorHoldProgressMs).toBe(2000);
  });

  it("leaves unrelated loot/equipment/mode fields untouched — hit confirmation and loot are independent dispatches, both must land", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = {
      ...createInitialGameState(NIGHT_01),
      isRunning: true,
      screen: "playing" as const,
      monsterHitsToday: 0,
      pendingMonsterHits: 1,
      hasShotgun: true,
      shotgunAmmo: 2,
      bulbsRemaining: 5,
      gameMode: "hardcore" as const,
      livesRemaining: 1,
    };

    const result = reducer(state, { type: "CONFIRM_MONSTER_HIT" });

    expect(result.hasShotgun).toBe(true);
    expect(result.shotgunAmmo).toBe(2);
    expect(result.bulbsRemaining).toBe(5);
    expect(result.gameMode).toBe("hardcore");
    expect(result.livesRemaining).toBe(1);
  });
});

describe("EMERGENCY_MINIGAME_DIED — discarding pending hits never resets the office monster", () => {
  it("dying outside with a pending hit leaves enemyStage/door state completely untouched", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = {
      ...createInitialGameState(NIGHT_01),
      isRunning: true,
      pendingMonsterHits: 1,
      monsterHitsToday: 3,
      enemyStage: "right_hallway" as const,
      doorLightRepelMs: 500,
    };

    const result = reducer(state, { type: "EMERGENCY_MINIGAME_DIED" });

    expect(result.pendingMonsterHits).toBe(0);
    expect(result.monsterHitsToday).toBe(3);
    expect(result.enemyStage).toBe("right_hallway");
    expect(result.doorLightRepelMs).toBe(500);
  });
});

// Zadání: po 10. (finálním) zásahu se běžný kancelářský monster loop
// (TICK/ENEMY_ADVANCE) nesmí dál vyhodnocovat jako smrtelný — CONFIRM_MONSTER_HIT
// na 10. zásahu nastaví isRunning: false (viz test výše "triggers the true
// ending..."), a TICK i ENEMY_ADVANCE mají svoje vlastní `if (!state.isRunning)
// return state;` guardy na úplném začátku, nezávisle na tomhle zásahu — tenhle
// blok jen dokládá, že žádná monster-loop akce po monsterDefeated skutečně
// nic nezmění, ani kdyby byl hráč v tu chvíli (podle uloženého enemyStage)
// prakticky u dveří s otevřenými dveřmi.
describe("After the true ending (monsterDefeated, isRunning false), the office monster loop can never kill the player", () => {
  function monsterDefeatedState(): GameState {
    return {
      ...createInitialGameState(NIGHT_01),
      isRunning: false,
      screen: "monsterDefeated" as const,
      monsterDefeated: true,
      monsterHitsToday: 10,
      enemyStage: "at_door" as const,
      enemyRoute: ["at_door", "attack"],
      doorClosed: false,
    };
  }

  it("TICK is a complete no-op", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = monsterDefeatedState();

    const result = reducer(state, { type: "TICK", deltaMs: 100 });

    expect(result).toBe(state);
  });

  it("ENEMY_ADVANCE is a complete no-op, even with the monster at an open door", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = monsterDefeatedState();

    const result = reducer(state, { type: "ENEMY_ADVANCE" });

    expect(result).toBe(state);
    expect(result.screen).toBe("monsterDefeated");
    expect(result.deathReason).toBeNull();
  });
});
