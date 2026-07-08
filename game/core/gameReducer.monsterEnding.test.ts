import { describe, expect, it } from "vitest";
import { createGameReducer } from "./gameReducer";
import { createInitialGameState } from "./gameState";
import { NIGHT_01 } from "../nights/night01";

// Skrytý true ending (viz zadání, game/core/monsterEnding.ts) — reducer sám
// neví nic o minihře, jen dvěma akcemi (MARK_PENDING_MONSTER_HIT,
// CONFIRM_MONSTER_HIT) zaznamená/potvrdí zásah; smrt venku
// (EMERGENCY_MINIGAME_DIED) nepotvrzený zásah zahodí.

describe("Default GameState", () => {
  it("starts with no hits, no pending hit, monster not defeated", () => {
    const state = createInitialGameState(NIGHT_01);
    expect(state.monsterHitsToday).toBe(0);
    expect(state.pendingMonsterHit).toBe(false);
    expect(state.monsterDefeated).toBe(false);
  });
});

describe("START_SHIFT / RESTART_SHIFT always reset the daily hit counter", () => {
  it("RESTART_SHIFT resets a nonzero monsterHitsToday/pendingMonsterHit back to defaults (same-night retry after a Normal death)", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = { ...createInitialGameState(NIGHT_01), monsterHitsToday: 6, pendingMonsterHit: true };

    const result = reducer(state, { type: "RESTART_SHIFT" });

    expect(result.monsterHitsToday).toBe(0);
    expect(result.pendingMonsterHit).toBe(false);
  });

  it("START_SHIFT also resets to defaults", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = { ...createInitialGameState(NIGHT_01), monsterHitsToday: 9 };

    const result = reducer(state, { type: "START_SHIFT" });

    expect(result.monsterHitsToday).toBe(0);
  });
});

describe("MARK_PENDING_MONSTER_HIT", () => {
  it("sets pendingMonsterHit but does not touch monsterHitsToday", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = { ...createInitialGameState(NIGHT_01), isRunning: true };

    const result = reducer(state, { type: "MARK_PENDING_MONSTER_HIT" });

    expect(result.pendingMonsterHit).toBe(true);
    expect(result.monsterHitsToday).toBe(0);
  });

  it("is a no-op while the game is not running", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = { ...createInitialGameState(NIGHT_01), isRunning: false };

    expect(reducer(state, { type: "MARK_PENDING_MONSTER_HIT" })).toBe(state);
  });
});

describe("EMERGENCY_MINIGAME_DIED discards a pending hit without counting it", () => {
  it("dying outside with a pending hit clears pendingMonsterHit and leaves monsterHitsToday unchanged", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = { ...createInitialGameState(NIGHT_01), isRunning: true, pendingMonsterHit: true, monsterHitsToday: 3 };

    const result = reducer(state, { type: "EMERGENCY_MINIGAME_DIED" });

    expect(result.pendingMonsterHit).toBe(false);
    expect(result.monsterHitsToday).toBe(3);
    expect(result.screen).toBe("death");
  });
});

describe("CONFIRM_MONSTER_HIT", () => {
  it("increments monsterHitsToday by one and clears pendingMonsterHit", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = {
      ...createInitialGameState(NIGHT_01),
      isRunning: true,
      screen: "playing" as const,
      monsterHitsToday: 3,
      pendingMonsterHit: true,
    };

    const result = reducer(state, { type: "CONFIRM_MONSTER_HIT" });

    expect(result.monsterHitsToday).toBe(4);
    expect(result.pendingMonsterHit).toBe(false);
    expect(result.monsterDefeated).toBe(false);
    expect(result.screen).toBe("playing");
  });

  it("does not trigger the ending at 9 confirmed hits", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = { ...createInitialGameState(NIGHT_01), isRunning: true, screen: "playing" as const, monsterHitsToday: 8 };

    const result = reducer(state, { type: "CONFIRM_MONSTER_HIT" });

    expect(result.monsterHitsToday).toBe(9);
    expect(result.monsterDefeated).toBe(false);
    expect(result.screen).toBe("playing");
    expect(result.isRunning).toBe(true);
  });

  it("triggers the true ending on the 10th confirmed hit: monsterDefeated true, screen monsterDefeated, isRunning false", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = { ...createInitialGameState(NIGHT_01), isRunning: true, screen: "playing" as const, monsterHitsToday: 9 };

    const result = reducer(state, { type: "CONFIRM_MONSTER_HIT" });

    expect(result.monsterHitsToday).toBe(10);
    expect(result.monsterDefeated).toBe(true);
    expect(result.screen).toBe("monsterDefeated");
    expect(result.isRunning).toBe(false);
  });

  it("is a no-op while the game is not running", () => {
    const reducer = createGameReducer(NIGHT_01);
    const state = { ...createInitialGameState(NIGHT_01), isRunning: false };

    expect(reducer(state, { type: "CONFIRM_MONSTER_HIT" })).toBe(state);
  });
});
